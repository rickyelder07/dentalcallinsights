# AI Insights Setup Guide

## Overview
This guide covers the setup and configuration of the AI Insights system (Milestone 5) for the DentalCallInsights project.

## Prerequisites
- Milestone 4 (Transcription Pipeline) must be completed
- OpenAI API key with GPT-4o access
- Supabase project configured with RLS

## Required Environment Variables

Add to your `.env.local`:

```env
# OpenAI API Key (required for AI Insights)
OPENAI_API_KEY=sk-...your-key-here

# Supabase (should already be configured)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Database Migration

Run the migration to create the insights table:

```sql
-- In Supabase SQL Editor, run:
-- /migrations/006_insights_schema.sql
```

This creates:
- `insights` table with all required fields
- RLS policies for user data isolation
- Indexes for performance
- Helper functions for timestamps

## Features

### 1. Call Summary
- 2-3 sentence brief summary
- 3-5 key discussion points
- Call outcome (Resolved, Pending, Escalated, No Resolution)

### 2. Sentiment Analysis
- Overall sentiment (Positive, Neutral, Negative, Mixed)
- Patient satisfaction level
- Staff performance assessment

### 3. Action Items
- Specific follow-up actions (max 5 displayed)
- Priority levels (Urgent, High, Normal, Low)
- Assignee tracking (Staff, Patient, Dentist, Billing, Front Desk)

### 4. Red Flags & Concerns
- Compliance issues (HIPAA, unprofessional language)
- Patient dissatisfaction indicators
- Missed opportunities
- Billing/insurance concerns
- Emergency situations

## Call Length Validation

**Important**: Calls shorter than 6 seconds will not generate AI insights.

- **Minimum duration**: 6 seconds
- **Reason**: Very short calls contain no meaningful content and waste API costs
- **Behavior**: System returns "Too short for insights" for all fields without making an API call
- **Implementation**: Duration check happens before OpenAI API call

## Caching System

The system implements smart caching to reduce API costs:

- **Cache Duration**: 30 days
- **Cache Key**: call_id + transcript_hash
- **Cache Invalidation**: Automatic when transcript changes
- **Manual Regeneration**: Available via "Regenerate" button

## API Endpoints

### Generate Insights
```
POST /api/insights/generate
Body: { callId: string, forceRegenerate?: boolean }
```

### Regenerate Insights
```
POST /api/insights/regenerate
Body: { callId: string }
```

## Usage

### Automatic Generation
1. User views a call detail page
2. Clicks on "AI Insights" tab
3. Insights auto-generate on first view
4. Takes 5-10 seconds for calls ≥6 seconds
5. Displays "Too short for insights" immediately for calls <6 seconds

### Manual Regeneration
1. Click "Regenerate" button in insights panel
2. System bypasses cache and generates fresh insights
3. Useful when transcript has been edited

### Export Insights
1. Click "Export" dropdown
2. Choose format: Text or JSON
3. File downloads automatically

## Security

### API Key Protection
- ✅ OpenAI API key is server-side only
- ✅ Never exposed to client
- ✅ Used only in API routes

### Data Isolation
- ✅ RLS policies enforce user-specific access
- ✅ No cross-user data leakage
- ✅ All queries filtered by user_id

### Input Validation
- ✅ Call ID validation
- ✅ User authentication required
- ✅ Transcript existence check
- ✅ Transcript completion check

## Cost Management

### Token Usage
- **Model**: GPT-4o
- **Max Tokens**: 800 output tokens per call
- **Temperature**: 0.3 (consistent results)
- **Context**: Up to 100K characters per transcript

### Cost Optimization
- ✅ Caching prevents redundant API calls
- ✅ 30-day cache reduces repeat costs
- ✅ Transcript truncation for very long calls
- ✅ Calls <6 seconds skip API call entirely
- ✅ Hash-based cache invalidation

### Estimated Costs
- **GPT-4o Pricing** (as of 2025):
  - Input: $2.50 per 1M tokens
  - Output: $10.00 per 1M tokens
- **Per Call**: ~$0.01-0.03 (first generation)
- **Cached Calls**: $0.00
- **Calls <6s**: $0.00

## Troubleshooting

### "Unable to generate insights"
- Check OpenAI API key is set correctly
- Verify API key has GPT-4o access
- Check OpenAI account has credits

### "Transcript not ready"
- Ensure transcription completed successfully
- Check transcription_status = 'completed'
- Retry transcription if failed

### Insights not appearing
- Check browser console for errors
- Verify user is authenticated
- Check RLS policies are enabled
- Verify insights table exists

### Cache not working
- Check transcript_hash is being generated
- Verify generated_at timestamps
- Check cache validation logic

## Verification Steps

1. **Database Setup**
   ```sql
   -- Verify insights table exists
   SELECT * FROM insights LIMIT 1;
   
   -- Check RLS is enabled
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'insights';
   ```

2. **Environment Variables**
   ```bash
   # Check .env.local has OpenAI key
   echo $OPENAI_API_KEY
   ```

3. **Test Insights Generation**
   - Navigate to a completed transcription
   - Click "AI Insights" tab
   - Verify insights generate within 10 seconds
   - Check all 4 sections display

4. **Test Caching**
   - Generate insights for a call
   - Refresh page
   - Verify "Cached" indicator appears
   - Verify insights load instantly

5. **Test Regeneration**
   - Click "Regenerate" button
   - Verify insights update
   - Verify cache clears

6. **Test Export**
   - Click "Export" > "Export as Text"
   - Verify file downloads
   - Check content is readable

7. **Test Short Calls**
   - View a call <6 seconds
   - Click "AI Insights" tab
   - Verify "Too short for insights" displays
   - Verify no API call is made (check logs)

## File Structure

```
app/
├── api/
│   └── insights/
│       ├── generate/route.ts      # Generate insights
│       └── regenerate/route.ts    # Regenerate insights
├── components/
│   ├── InsightsSummary.tsx        # Summary component
│   ├── SentimentIndicator.tsx     # Sentiment component
│   ├── ActionItemsList.tsx        # Actions component
│   ├── RedFlagsList.tsx           # Red flags component
│   └── InsightsPanel.tsx          # Container component
└── calls/[id]/page.tsx            # Updated with insights tab

lib/
├── openai-insights.ts             # GPT-4o client
├── prompt-templates.ts            # Prompts for insights
└── insights-cache.ts              # Caching utilities

types/
└── insights.ts                    # TypeScript types

migrations/
└── 006_insights_schema.sql        # Database schema
```

## Next Steps

After setup is complete:
1. Test with real call data
2. Monitor OpenAI API usage and costs
3. Fine-tune prompts for better insights
4. Consider adding custom insight types
5. Implement batch processing for multiple calls (future)

## Support

For issues or questions:
1. Check console logs for errors
2. Verify all environment variables
3. Review Supabase RLS policies
4. Check OpenAI API status
5. Review documentation files

## References

- [OpenAI GPT-4o Documentation](https://platform.openai.com/docs/models/gpt-4o)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

