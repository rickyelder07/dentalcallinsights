/**
 * Batch Embeddings Generation API Route
 * POST /api/search/batch-embeddings
 * 
 * Generates vector embeddings for multiple calls
 * Security: Server-side only, validates user access
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import {
  generateEmbeddingWithRetry,
  generateContentHash,
  prepareTranscriptForEmbedding,
  calculateEmbeddingCost,
} from '@/lib/embeddings'
import type { BatchEmbeddingRequest } from '@/types/embeddings'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Parse request
    const body: BatchEmbeddingRequest = await req.json()
    const { callIds, contentType = 'transcript', forceRegenerate = false } = body
    
    // Validate input
    if (!callIds || callIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: callIds' },
        { status: 400 }
      )
    }
    
    if (callIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 calls per batch' },
        { status: 400 }
      )
    }
    
    // Get user from session
    const supabase = createAdminClient()
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing authentication token' },
        { status: 401 }
      )
    }
    
    // Verify token and get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      )
    }
    
    // Process each call
    const results: {
      callId: string
      success: boolean
      embeddingId?: string
      cached?: boolean
      error?: string
    }[] = []
    
    let totalTokens = 0
    let totalCost = 0
    
    for (const callId of callIds) {
      try {
        // Get call and verify ownership/access via RLS
        // RLS policies will automatically filter to show team members' calls
        const { data: call, error: callError } = await supabase
          .from('calls')
          .select('*')
          .eq('id', callId)
          .single()
        
        if (callError || !call) {
          results.push({
            callId,
            success: false,
            error: 'Call not found or access denied',
          })
          continue
        }
        
        // Get transcript
        const { data: transcript, error: transcriptError } = await supabase
          .from('transcripts')
          .select('*')
          .eq('call_id', callId)
          .single()
        
        if (transcriptError || !transcript) {
          results.push({
            callId,
            success: false,
            error: 'Transcript not found',
          })
          continue
        }
        
        // Check if transcript is completed
        if (transcript.transcription_status !== 'completed') {
          results.push({
            callId,
            success: false,
            error: `Transcript not ready: ${transcript.transcription_status}`,
          })
          continue
        }
        
        // Get transcript text
        const transcriptText =
          transcript.edited_transcript || transcript.raw_transcript || transcript.transcript
        
        if (!transcriptText || transcriptText === 'Call too short to transcribe.') {
          results.push({
            callId,
            success: false,
            error: 'Transcript text is empty or call too short',
          })
          continue
        }
        
        // Prepare content
        const preparedContent = prepareTranscriptForEmbedding(transcriptText)
        const contentHash = generateContentHash(preparedContent)
        
        // Check for existing embedding
        if (!forceRegenerate) {
          const { data: existingEmbedding } = await supabase
            .from('embeddings')
            .select('*')
            .eq('call_id', callId)
            .eq('content_type', contentType)
            .single()
          
          if (existingEmbedding && existingEmbedding.content_hash === contentHash) {
            results.push({
              callId,
              success: true,
              embeddingId: existingEmbedding.id,
              cached: true,
            })
            continue
          }
        }
        
        // Generate embedding
        const embeddingResult = await generateEmbeddingWithRetry(preparedContent)
        
        if (!embeddingResult.success || !embeddingResult.embedding) {
          results.push({
            callId,
            success: false,
            error: embeddingResult.error || 'Failed to generate embedding',
          })
          continue
        }
        
        // Calculate cost
        const cost = calculateEmbeddingCost(embeddingResult.tokenCount || 0)
        totalTokens += embeddingResult.tokenCount || 0
        totalCost += cost
        
        // Save embedding
        const { data: savedEmbedding, error: upsertError } = await supabase
          .from('embeddings')
          .upsert(
            {
              call_id: callId,
              user_id: user.id,
              embedding: JSON.stringify(embeddingResult.embedding),
              embedding_model: 'text-embedding-3-small',
              embedding_version: 1,
              content_type: contentType,
              content_hash: contentHash,
              token_count: embeddingResult.tokenCount || 0,
              generated_at: new Date().toISOString(),
            },
            { onConflict: 'call_id,content_type' }
          )
          .select()
          .single()
        
        if (upsertError) {
          results.push({
            callId,
            success: false,
            error: 'Failed to save embedding',
          })
          continue
        }
        
        // Log cost
        try {
          await supabase.from('embedding_costs').insert({
            user_id: user.id,
            call_id: callId,
            token_count: embeddingResult.tokenCount || 0,
            model: 'text-embedding-3-small',
            cost_usd: cost,
            operation_type: 'batch',
          })
        } catch (costError) {
          console.error('Failed to log embedding cost:', costError)
        }
        
        results.push({
          callId,
          success: true,
          embeddingId: savedEmbedding.id,
          cached: false,
        })
        
        // Rate limiting: wait between calls
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`Error processing call ${callId}:`, error)
        results.push({
          callId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
    
    // Return results
    const successCount = results.filter(r => r.success).length
    const cachedCount = results.filter(r => r.cached).length
    
    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: callIds.length,
        success: successCount,
        cached: cachedCount,
        failed: callIds.length - successCount,
      },
      totalTokens,
      totalCost,
    })
  } catch (error) {
    console.error('Batch embedding generation API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

