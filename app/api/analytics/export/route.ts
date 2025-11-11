/**
 * Analytics Export API Route
 * POST /api/analytics/export - Export call data in various formats
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAPIClient } from '@/lib/supabase-server'
import { convertToCSV, convertToJSON, generateExportFilename } from '@/lib/export'
import type { ExportRequest, ExportFormat } from '@/types/export'
import { applyFilters } from '@/lib/filters'

export async function POST(request: NextRequest) {
  try {
    // Get access token from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create Supabase client with user context
    const supabase = createAPIClient(token)

    // Verify user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = (await request.json()) as ExportRequest

    // Validate format
    const validFormats: ExportFormat[] = ['csv', 'json', 'pdf', 'excel']
    if (!validFormats.includes(body.format)) {
      return NextResponse.json(
        { success: false, error: 'Invalid export format' },
        { status: 400 }
      )
    }

    // Fetch calls with related data
    // RLS policies will automatically filter to show team members' calls
    let query = supabase
      .from('calls')
      .select(`
        *,
        transcript:transcripts(*),
        insights:insights(*)
      `)

    // Apply call ID filter if provided
    if (body.callIds && body.callIds.length > 0) {
      query = query.in('id', body.callIds)
    }

    const { data: calls, error: callsError } = await query

    if (callsError) throw callsError

    if (!calls || calls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No calls found to export' },
        { status: 404 }
      )
    }

    // Apply filters if provided
    let filteredCalls = calls
    if (body.filters) {
      filteredCalls = applyFilters(calls, body.filters)
    }

    if (filteredCalls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No calls match the filter criteria' },
        { status: 404 }
      )
    }

    // Generate export content
    let content: string
    let mimeType: string
    let filename: string

    switch (body.format) {
      case 'csv':
        content = convertToCSV(filteredCalls, body.fields)
        mimeType = 'text/csv'
        filename = generateExportFilename('csv')
        break

      case 'json':
        content = convertToJSON(filteredCalls, body.fields, true)
        mimeType = 'application/json'
        filename = generateExportFilename('json')
        break

      case 'pdf':
        // PDF generation would require additional library (e.g., pdfmake)
        // For now, return JSON with PDF placeholder
        return NextResponse.json(
          { success: false, error: 'PDF export not yet implemented' },
          { status: 501 }
        )

      case 'excel':
        // Excel generation would require additional library (e.g., exceljs)
        // For now, return CSV as fallback
        content = convertToCSV(filteredCalls, body.fields)
        mimeType = 'text/csv'
        filename = generateExportFilename('csv')
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Unsupported export format' },
          { status: 400 }
        )
    }

    // Create export history record
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // Expire after 24 hours

    const { data: _exportRecord, error: exportError } = await supabase
      .from('export_history')
      .insert({
        user_id: user.id,
        export_type: body.format,
        call_ids: filteredCalls.map((c) => c.id),
        filters: body.filters || null,
        filename,
        file_size: content.length,
        status: 'completed',
        expires_at: expiresAt.toISOString(),
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (exportError) {
      console.error('Failed to create export record:', exportError)
      // Continue anyway - export record is not critical
    }

    // Return export content directly
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': content.length.toString(),
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export data',
      },
      { status: 500 }
    )
  }
}

