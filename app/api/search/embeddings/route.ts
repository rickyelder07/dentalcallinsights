/**
 * Embeddings Generation API Route
 * POST /api/search/embeddings
 * 
 * Generates vector embedding for a specific call
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
import type { GenerateEmbeddingRequest } from '@/types/embeddings'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Parse request
    const body: GenerateEmbeddingRequest = await req.json()
    const { callId, contentType = 'transcript', forceRegenerate = false } = body
    
    // Validate input
    if (!callId) {
      return NextResponse.json(
        { error: 'Missing required field: callId' },
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
    
    // Get call and verify ownership
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', callId)
      .eq('user_id', user.id)
      .single()
    
    if (callError || !call) {
      return NextResponse.json(
        { error: 'Call not found or access denied' },
        { status: 404 }
      )
    }
    
    // Get transcript
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('call_id', callId)
      .single()
    
    if (transcriptError || !transcript) {
      return NextResponse.json(
        { error: 'Transcript not found for this call' },
        { status: 404 }
      )
    }
    
    // Check if transcript is completed
    if (transcript.transcription_status !== 'completed') {
      return NextResponse.json(
        { error: `Transcript not ready. Status: ${transcript.transcription_status}` },
        { status: 400 }
      )
    }
    
    // Get transcript text
    const transcriptText =
      transcript.edited_transcript || transcript.raw_transcript || transcript.transcript
    
    if (!transcriptText || transcriptText === 'Call too short to transcribe.') {
      return NextResponse.json(
        { error: 'Transcript text is empty or call too short' },
        { status: 400 }
      )
    }
    
    // Prepare content for embedding
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
        // Return existing embedding (cached)
        return NextResponse.json({
          success: true,
          embeddingId: existingEmbedding.id,
          cached: true,
          tokenCount: existingEmbedding.token_count,
        })
      }
    }
    
    // Generate embedding
    const embeddingResult = await generateEmbeddingWithRetry(preparedContent)
    
    if (!embeddingResult.success || !embeddingResult.embedding) {
      return NextResponse.json(
        { error: embeddingResult.error || 'Failed to generate embedding' },
        { status: 500 }
      )
    }
    
    // Calculate cost
    const cost = calculateEmbeddingCost(embeddingResult.tokenCount || 0)
    
    // Save embedding to database (upsert)
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
      console.error('Failed to save embedding:', upsertError)
      return NextResponse.json(
        { error: 'Failed to save embedding' },
        { status: 500 }
      )
    }
    
    // Log cost
    try {
      await supabase.from('embedding_costs').insert({
        user_id: user.id,
        call_id: callId,
        token_count: embeddingResult.tokenCount || 0,
        model: 'text-embedding-3-small',
        cost_usd: cost,
        operation_type: forceRegenerate ? 'regenerate' : 'generate',
      })
    } catch (costError) {
      // Don't fail if cost logging fails
      console.error('Failed to log embedding cost:', costError)
    }
    
    // Return result
    return NextResponse.json({
      success: true,
      embeddingId: savedEmbedding.id,
      cached: false,
      tokenCount: embeddingResult.tokenCount,
      cost,
    })
  } catch (error) {
    console.error('Embedding generation API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

