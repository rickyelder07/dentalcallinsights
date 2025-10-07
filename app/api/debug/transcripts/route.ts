/**
 * Debug API to check transcripts without user_id filter
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    
    // Get user from session
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'No auth token' }, { status: 401 })
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    // Get user's calls first
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('id, filename')
      .eq('user_id', user.id)
    
    if (callsError) {
      return NextResponse.json({ 
        error: 'Calls query failed', 
        details: callsError.message 
      }, { status: 500 })
    }
    
    const callIds = calls?.map(c => c.id) || []
    
    // Get transcripts for those calls
    const { data: transcripts, error: transcriptsError } = await supabase
      .from('transcripts')
      .select('call_id, transcription_status, language')
      .in('call_id', callIds)
    
    if (transcriptsError) {
      return NextResponse.json({ 
        error: 'Transcripts query failed', 
        details: transcriptsError.message 
      }, { status: 500 })
    }
    
    // Get embeddings
    const { data: embeddings, error: embeddingsError } = await supabase
      .from('embeddings')
      .select('call_id, embedding_model')
      .eq('user_id', user.id)
    
    if (embeddingsError) {
      return NextResponse.json({ 
        error: 'Embeddings query failed', 
        details: embeddingsError.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
      calls: {
        count: calls?.length || 0,
        data: calls
      },
      transcripts: {
        count: transcripts?.length || 0,
        data: transcripts
      },
      embeddings: {
        count: embeddings?.length || 0,
        data: embeddings
      }
    })
    
  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
