# Inngest Setup Guide for Long-Running Transcriptions

This guide explains how to set up Inngest using the **native Vercel Marketplace integration** to handle long-running transcription jobs that exceed Vercel's 5-minute timeout limit.

## Overview

The Inngest integration provides:
- **No timeout limits** for transcription jobs
- **Real-time progress tracking** with detailed stages
- **Automatic retries** on failure
- **Cost-effective** solution (free tier available)
- **Reliable processing** for calls longer than 5 minutes
- **Native Vercel integration** - no manual configuration needed

## Setup Steps

### 1. Install Inngest Integration from Vercel Marketplace

1. Go to [https://vercel.com/marketplace/inngest](https://vercel.com/marketplace/inngest)
2. Click **"Install"** to add the integration to your Vercel account
3. During installation, select your **Dental Call Insights** Vercel project
4. The integration will automatically set up the required environment variables

### 2. Deploy Your Application

1. Push your changes to GitHub:
   ```bash
   git add .
   git commit -m "Add native Inngest/Vercel integration"
   git push origin main
   ```

2. Deploy to Vercel - the Inngest functions will be automatically discovered and deployed

### 3. Verify Integration

1. In your Vercel dashboard, go to **Settings** → **Integrations**
2. You should see **Inngest** listed as an active integration
3. Check that the environment variables are automatically set:
   - `INNGEST_SIGNING_KEY`
   - `INNGEST_EVENT_KEY`

### 4. Connect to Inngest Dashboard

1. Go to [https://app.inngest.com](https://app.inngest.com)
2. You should see your **Dental Call Insights** app automatically connected
3. In **Functions**, you should see:
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
   - Verify Vercel integration is active
   - Check Inngest dashboard connection
   - Ensure environment variables are set by Vercel

2. **Jobs stuck in "processing"**
   - Check Inngest dashboard for failed executions
   - Verify OpenAI API key is valid
   - Check Supabase connection

3. **Progress not updating**
   - Ensure `transcription_jobs` table has `metadata` column
   - Check Inngest function is running
   - Verify database permissions

4. **Functions not appearing in Inngest**
   - Verify Vercel integration is installed
   - Check that `/api/inngest/route.ts` exists
   - Redeploy to Vercel

### Debug Steps

1. **Check Vercel Integration**
   - Go to Vercel → Settings → Integrations
   - Verify Inngest is listed and active
   - Check environment variables are set

2. **Check Inngest Dashboard**
   - Go to Functions → View executions
   - Look for failed or stuck jobs
   - Check error messages

3. **Verify Environment Variables**
   ```bash
   # These should be automatically set by Vercel:
   INNGEST_SIGNING_KEY=auto-set-by-vercel
   INNGEST_EVENT_KEY=auto-set-by-vercel
   
   # These you need to set:
   OPENAI_API_KEY=your-key
   SUPABASE_SERVICE_ROLE_KEY=your-key
   ```

4. **Test API Endpoints**
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

1. **Install Inngest integration** from Vercel Marketplace
2. **Deploy to Vercel** - functions will be automatically discovered
3. **Verify integration** in Vercel dashboard
4. **Test with long calls** to verify functionality
5. **Monitor** Inngest dashboard for any issues

## Support

- **Inngest Documentation**: [https://www.inngest.com/docs](https://www.inngest.com/docs)
- **Inngest Discord**: [https://discord.gg/inngest](https://discord.gg/inngest)
- **Project Issues**: Check GitHub issues or contact support

---

**Note**: This integration maintains full backward compatibility while adding the ability to handle long-running transcriptions without timeout limits.
