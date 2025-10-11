# Inngest Setup Guide for Long-Running Transcriptions

This guide explains how to set up Inngest to handle long-running transcription jobs that exceed Vercel's 5-minute timeout limit.

## Overview

The Inngest integration provides:
- **No timeout limits** for transcription jobs
- **Real-time progress tracking** with detailed stages
- **Automatic retries** on failure
- **Cost-effective** solution (free tier available)
- **Reliable processing** for calls longer than 5 minutes

## Setup Steps

### 1. Create Inngest Account

1. Go to [https://app.inngest.com](https://app.inngest.com)
2. Sign up for a free account
3. Create a new app called "Dental Call Insights"

### 2. Get Your Event Key

1. In the Inngest dashboard, go to **Settings** → **Keys**
2. Copy your **Event Key**
3. Add it to your `.env.local` file:

```bash
INNGEST_EVENT_KEY=your-inngest-event-key-here
```

### 3. Deploy to Vercel

1. Push your changes to GitHub
2. Deploy to Vercel (the Inngest functions will be automatically available)
3. In Vercel, add the `INNGEST_EVENT_KEY` environment variable

### 4. Configure Inngest Dashboard

1. In the Inngest dashboard, go to **Functions**
2. You should see your transcription functions:
   - `transcribe-call` - Main transcription function
   - `handle-transcription-error` - Error handling
   - `track-transcription-progress` - Progress tracking

## How It Works

### Transcription Flow

1. **User triggers transcription** → API creates job in database
2. **API sends event to Inngest** → `transcription/start` event
3. **Inngest processes job** → Downloads, transcribes, saves results
4. **Progress updates** → Real-time updates via `transcription/progress` events
5. **Completion** → Database updated with results

### Progress Tracking

The system provides detailed progress updates:
- **25%** - Downloading audio file
- **50%** - Transcribing with OpenAI
- **75%** - Processing transcription
- **100%** - Saving results

### Error Handling

- **Automatic retries** (up to 3 attempts)
- **Detailed error messages** with stage information
- **Fallback to direct processing** for short calls (<60 seconds)
- **Database status updates** for failed jobs

## Testing

### Test with Short Calls
1. Upload a call shorter than 60 seconds
2. Should process normally (may use fallback if Inngest is unavailable)

### Test with Long Calls
1. Upload a call longer than 5 minutes
2. Should use Inngest for processing
3. Monitor progress in the Inngest dashboard
4. Check real-time updates in the frontend

## Monitoring

### Inngest Dashboard
- View function executions
- Monitor success/failure rates
- Check execution times
- Debug failed jobs

### Application Logs
- Check Vercel logs for API calls
- Monitor database updates
- Track progress events

## Troubleshooting

### Common Issues

1. **"Inngest service unavailable"**
   - Check `INNGEST_EVENT_KEY` is set correctly
   - Verify Inngest account is active
   - Check network connectivity

2. **Jobs stuck in "processing"**
   - Check Inngest dashboard for failed executions
   - Verify OpenAI API key is valid
   - Check Supabase connection

3. **Progress not updating**
   - Ensure `transcription_jobs` table has `metadata` column
   - Check Inngest function is running
   - Verify database permissions

### Debug Steps

1. **Check Inngest Dashboard**
   - Go to Functions → View executions
   - Look for failed or stuck jobs
   - Check error messages

2. **Verify Environment Variables**
   ```bash
   # Check these are set:
   INNGEST_EVENT_KEY=your-key
   OPENAI_API_KEY=your-key
   SUPABASE_SERVICE_ROLE_KEY=your-key
   ```

3. **Test API Endpoints**
   - `/api/transcribe` - Should return job ID
   - `/api/inngest` - Should be accessible
   - `/api/transcribe/status` - Should show job status

## Cost Analysis

### Inngest Pricing
- **Free tier**: 10,000 function executions/month
- **Pro tier**: $25/month for 100,000 executions
- **Your usage**: ~100-500 transcriptions/month = **FREE**

### Comparison
- **Vercel Pro**: $20/month + timeout limits
- **Supabase Edge Functions**: $25/month + complexity
- **Inngest**: **FREE** for your usage + no limits

## Migration from Direct Processing

The system automatically:
- **Uses Inngest** for calls longer than 60 seconds
- **Falls back** to direct processing for short calls
- **Maintains compatibility** with existing frontend
- **Preserves** all existing functionality

## Next Steps

1. **Set up Inngest account** and get event key
2. **Add environment variable** to `.env.local`
3. **Deploy to Vercel** with the new environment variable
4. **Test with long calls** to verify functionality
5. **Monitor** Inngest dashboard for any issues

## Support

- **Inngest Documentation**: [https://www.inngest.com/docs](https://www.inngest.com/docs)
- **Inngest Discord**: [https://discord.gg/inngest](https://discord.gg/inngest)
- **Project Issues**: Check GitHub issues or contact support

---

**Note**: This integration maintains full backward compatibility while adding the ability to handle long-running transcriptions without timeout limits.
