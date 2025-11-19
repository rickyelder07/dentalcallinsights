/**
 * Debug Storage API Route
 * Test Supabase Storage access and file downloads
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { extractStorageFilename } from '@/lib/storage'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const callId = url.searchParams.get('callId')
    
    if (!callId) {
      return NextResponse.json({ error: 'callId parameter required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    
    // Get call details
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('id, filename, audio_path, user_id')
      .eq('id', callId)
      .single()

    if (callError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    console.log(`Debug: Testing storage access for call ${callId}`)
    console.log(`Debug: Filename: ${call.filename}`)
    console.log(`Debug: Audio path: ${call.audio_path}`)
    console.log(`Debug: User ID: ${call.user_id}`)

    // Test 1: Create signed URL
    // Extract storage filename from audio_path (actual file name in storage)
    const storageFilename = extractStorageFilename(call.audio_path) || call.filename
    const storagePath = `${call.user_id}/${storageFilename}`
    console.log(`Debug: Storage path: ${storagePath}`)
    console.log(`Debug: Storage filename (from audio_path): ${storageFilename}`)
    
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('audio-files')
      .createSignedUrl(storagePath, 3600)

    if (signedUrlError) {
      return NextResponse.json({
        error: 'Failed to create signed URL',
        details: signedUrlError
      }, { status: 500 })
    }

    console.log(`Debug: Signed URL created: ${signedUrlData.signedUrl}`)

    // Test 2: Try direct download
    try {
      const downloadStart = Date.now()
      const response = await fetch(signedUrlData.signedUrl, {
        method: 'HEAD', // Just check headers, don't download content
        headers: {
          'Accept': 'audio/*',
        },
      })
      const downloadDuration = Date.now() - downloadStart

      console.log(`Debug: HEAD request completed in ${downloadDuration}ms`)
      console.log(`Debug: Response status: ${response.status}`)
      console.log(`Debug: Content-Type: ${response.headers.get('content-type')}`)
      console.log(`Debug: Content-Length: ${response.headers.get('content-length')}`)

      const contentLength = response.headers.get('content-length')
      const sizeMB = contentLength ? Math.round(parseInt(contentLength) / 1024 / 1024 * 100) / 100 : null

      return NextResponse.json({
        success: true,
        call: {
          id: call.id,
          filename: call.filename,
          audio_path: call.audio_path,
          user_id: call.user_id
        },
        storage: {
          path: storagePath,
          signedUrl: signedUrlData.signedUrl,
          accessible: response.ok,
          status: response.status,
          contentType: response.headers.get('content-type'),
          contentLength: contentLength,
          sizeMB: sizeMB,
          downloadDurationMs: downloadDuration
        }
      })

    } catch (downloadError) {
      console.error(`Debug: Download test failed:`, downloadError)
      
      return NextResponse.json({
        success: false,
        error: 'Download test failed',
        details: downloadError instanceof Error ? downloadError.message : 'Unknown error',
        call: {
          id: call.id,
          filename: call.filename,
          audio_path: call.audio_path,
          user_id: call.user_id
        },
        storage: {
          path: storagePath,
          signedUrl: signedUrlData.signedUrl
        }
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Debug storage error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
