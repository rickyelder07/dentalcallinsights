# Milestone 5: AI Insights - Simplified Overview

**Target Branch:** `milestone/05-ai-insights`  
**Status:** 📅 Ready to Start  
**Prerequisites:** ✅ Milestone 4 Complete (Transcription Pipeline)

## 🎯 What We're Building (Simplified)

Transform transcripts into **4 core actionable insights** using GPT-4o. This simplified milestone focuses on the most valuable features that dental office managers need most.

**Important:** Only calls longer than 6 seconds will generate AI insights. Shorter calls will display "Too short for insights" to avoid wasting API costs on calls with no meaningful content.

### The 4 Core Features

#### 1. **Call Summary** 📝
- 2-3 sentence executive summary
- 3-5 key discussion points (bullet list)
- Call outcome: Resolved, Pending, Escalated, No Resolution
- **Value:** Understand entire call in 10 seconds

#### 2. **Sentiment Analysis** 💭
- Overall sentiment: Positive, Neutral, Negative, Mixed
- Patient satisfaction: Happy, Satisfied, Neutral, Frustrated, Angry
- Staff performance: Professional, Needs Improvement
- **Value:** Identify patient satisfaction and coaching opportunities

#### 3. **Action Items** ✅
- Specific follow-up actions (3-5 max)
- Priority: Urgent, High, Normal, Low
- Assignee: Staff, Patient, Dentist, Billing, Front Desk
- **Value:** Never miss a follow-up or callback

#### 4. **Red Flags & Concerns** ⚠️
- Compliance issues (HIPAA, unprofessional language)
- Patient dissatisfaction indicators
- Missed opportunities
- Billing/insurance concerns
- Emergency situations
- **Value:** Catch problems before they escalate

## ✨ What We Removed (For Simplicity)

We've intentionally simplified by removing:
- ❌ Topics extraction (can add later if needed)
- ❌ Entity extraction (treatments, staff, insurance)
- ❌ Quality scoring system
- ❌ Compliance scoring (just flag concerns in Red Flags)
- ❌ Cost tracking dashboard (keep it simple)
- ❌ Batch processing (one call at a time)
- ❌ Analytics dashboard (later milestone)
- ❌ User feedback system (later if needed)

**Why?** Focus on the 20% of features that provide 80% of the value. Get it working well, then expand if needed.

## 💰 Cost Overview (Simplified)

**Model:** GPT-4o (Best balance, no configuration needed)

### Average Costs
- **Per Call (≥6 seconds):** ~$0.01 (1 cent)
- **Per Call (<6 seconds):** $0 (no API call)
- **100 calls/month:** ~$1 (assuming 90% are ≥6 seconds)
- **1,000 calls/month:** ~$10 (assuming 90% are ≥6 seconds)
- **10,000 calls/month:** ~$100 (assuming 90% are ≥6 seconds)

**Cost Optimization:** The 6-second minimum saves money by avoiding API calls for very short calls that typically contain no meaningful content.

### Why GPT-4o?
- ✅ Excellent quality for all 4 insights
- ✅ Fast processing (5-10 seconds per call)
- ✅ 128K context window (handles any call length)
- ✅ Cost-effective at scale
- ✅ Latest model features

**Don't worry about costs yet** - focus on getting it working. We'll add cost tracking in a future milestone if needed.

## 📊 ROI Quick Math

For 1,000 calls/month:
- **Cost:** ~$10/month
- **Time Saved:** 5 min → 10 sec per call = 83 hours saved
- **Value:** ~$2,000/month (at $25/hour)
- **ROI:** 20,000% 🚀

Even if you only save 2 minutes per call, the ROI is massive.

## 🎯 Simple Implementation Plan

### Week 1: Core Integration
- [ ] Set up OpenAI GPT-4o API client
- [ ] Design single prompt for all 4 insights
- [ ] Create simple insights database table
- [ ] Build insights generation API endpoint
- [ ] Test with sample transcripts

### Week 2: UI Components
- [ ] Build InsightsSummary component
- [ ] Build SentimentIndicator component
- [ ] Build ActionItemsList component
- [ ] Build RedFlagsList component
- [ ] Create InsightsPanel container
- [ ] Test with mock data

### Week 3: Integration & Polish
- [ ] Add insights tab to call detail page
- [ ] Auto-generate on first view
- [ ] Add regenerate button
- [ ] Add export functionality
- [ ] Test with real data
- [ ] Fix any issues

**Total Time:** 2-3 weeks for a focused implementation

## 🏗️ Technical Architecture (Simplified)

### Database Schema
**One simple table:**
```sql
insights
├── id (UUID)
├── call_id (FK to calls)
├── user_id (UUID)
├── summary_brief (TEXT)
├── summary_key_points (TEXT[])
├── call_outcome (TEXT)
├── overall_sentiment (TEXT)
├── patient_satisfaction (TEXT)
├── staff_performance (TEXT)
├── action_items (JSONB)
├── red_flags (JSONB)
├── model_used (TEXT) - default 'gpt-4o'
├── transcript_hash (TEXT) - for caching
└── generated_at (TIMESTAMPTZ)
```

**That's it!** No complex jobs tables, cost tracking, or feedback systems.

### API Endpoints
**Two simple endpoints:**
1. `POST /api/insights/generate` - Generate insights for a call
2. `POST /api/insights/regenerate` - Regenerate insights

### UI Components
**5 simple components:**
1. `InsightsSummary.tsx` - Summary card
2. `SentimentIndicator.tsx` - Sentiment display
3. `ActionItemsList.tsx` - Action checklist
4. `RedFlagsList.tsx` - Concerns list
5. `InsightsPanel.tsx` - Container

### Core Logic
**Smart processing based on call length:**
- Check call duration first
- If ≥ 6 seconds: Single API call to GPT-4o
- If < 6 seconds: Return "Too short for insights" (no API call)
- Request JSON response with all 4 insights
- Parse and save to database
- Display in UI

## 🎨 UI Layout

```
┌────────────────────────────────────────┐
│  Transcript  |  Insights*  |  Metadata │
└────────────────────────────────────────┘

🔄 Regenerate    📥 Export

┌────────────────────────────────────────┐
│ 📝 Summary                             │
│ Brief overview in 2-3 sentences...     │
│ • Key point 1                          │
│ • Key point 2                          │
│ • Key point 3                          │
│ Outcome: ✅ Resolved                   │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 💭 Sentiment                           │
│ Overall: 😊 Positive                   │
│ Patient: Happy                         │
│ Staff: Professional                    │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ✅ Action Items                        │
│ ☐ [High] Call patient back - Staff    │
│ ☐ [Normal] Update chart - Dentist     │
│ ☐ [Low] Send email - Front Desk       │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ⚠️ Red Flags & Concerns                │
│ • [High] Potential HIPAA concern       │
│ • [Medium] Patient expressed concern   │
└────────────────────────────────────────┘
```

Clean, simple, scannable. No complexity.

## ✅ Success Criteria (Simplified)

**It works if:**
- ✅ User views a call and insights auto-generate
- ✅ Calls ≥6 seconds: Full AI insights appear within 10 seconds
- ✅ Calls <6 seconds: "Too short for insights" displays immediately
- ✅ All 4 sections show relevant information or "Too short for insights"
- ✅ Regenerate button works
- ✅ Cached insights load instantly
- ✅ Export downloads insights
- ✅ No security issues

**That's it!** No complex metrics, just working software.

## 🚀 After This Milestone

Once Milestone 5 is working well, you can either:

1. **Move to Milestone 6** (Embeddings & Search) - recommended
2. **Enhance Milestone 5** if needed:
   - Add batch processing
   - Add cost tracking
   - Add more insight types
   - Add analytics dashboard

**Recommendation:** Get to Milestone 6 first (semantic search is powerful), then circle back to enhancements if needed.

## 💡 Key Decisions Made

### Why These 4 Features?
- **Summary:** Every call needs a summary
- **Sentiment:** Critical for patient retention
- **Actions:** Prevents dropped balls
- **Red Flags:** Risk mitigation

These 4 cover 80% of manager needs.

### Why One Prompt?
- Faster (one API call vs multiple)
- Cheaper (shared context)
- Simpler (one endpoint)
- Consistent (same context for all insights)

### Why No Cost Tracking?
- Adds complexity
- Costs are predictable (~1¢ per call)
- Can add later if needed
- Start simple, expand if necessary

### Why No Batch Processing?
- Calls are viewed one at a time
- Auto-generation handles most cases
- Can add later if users want it
- YAGNI principle (You Aren't Gonna Need It)

## 📚 Files You'll Create

### Core Logic (3 files)
- `lib/openai-insights.ts` - GPT-4o client
- `lib/prompt-templates.ts` - Prompt for 4 insights
- `lib/insights-cache.ts` - Simple caching

### API (2 endpoints)
- `app/api/insights/generate/route.ts`
- `app/api/insights/regenerate/route.ts`

### UI (5 components)
- `app/components/InsightsSummary.tsx`
- `app/components/SentimentIndicator.tsx`
- `app/components/ActionItemsList.tsx`
- `app/components/RedFlagsList.tsx`
- `app/components/InsightsPanel.tsx`

### Database (1 migration)
- `migrations/006_insights_schema.sql`

### Types (1 file)
- `types/insights.ts`

### Updated (1 file)
- `app/calls/[id]/page.tsx` - Add insights tab

**Total:** 14 new/modified files. Manageable scope.

## 🎓 Learning from Milestone 4

Milestone 4 was complex (language detection, audio player, sync, etc.). We learned:
- Start simple
- Add complexity only when needed
- Focus on core user value
- Test early and often

Milestone 5 applies these lessons with a focused, achievable scope.

## 🚦 Ready to Start?

1. **Review** this overview
2. **Read** the `Milestone 5 Prompt.txt` file
3. **Copy** the prompt into Cursor with Claude 4.5 Sonnet
4. **Implement** following the phases
5. **Test** with real call transcripts
6. **Iterate** based on feedback

**Estimated Time:** 2-3 weeks for a solid implementation

---

**Remember:** Perfect is the enemy of done. Get these 4 insights working well, then expand if needed. You can always add more features later!

🎯 **Goal:** Launch Milestone 5 in 3 weeks, then move to Milestone 6 (Search).
