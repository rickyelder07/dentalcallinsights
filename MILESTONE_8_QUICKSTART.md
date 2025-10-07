# Milestone 8: QA & Call Scoring - Quick Start Guide

## 🎯 What You Get

A complete Quality Assurance (QA) system for scoring and analyzing call quality based on 15 standardized criteria totaling 100 points.

## 🚀 Setup (5 minutes)

### Step 1: Run Database Migration

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `/migrations/013_qa_scoring_schema.sql`
3. Paste and run the migration
4. Verify: You should see 4 new tables created

### Step 2: Verify Tables

Run this query to confirm:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('call_scores', 'score_criteria', 'qa_assignments', 'qa_templates');
```

Expected result: All 4 tables listed.

### Step 3: Test the System

1. Navigate to your app → Library (Enhanced)
2. Find a call with a completed transcript
3. Click "Score Call" button
4. The scoring panel should open ✅

## 📊 Quick Tour

### 1. Scoring a Call

**Where**: Library (Enhanced) → Click "Score Call" on any transcribed call

**The Interface**:
- **Left Side**: Transcript viewer for evidence
- **Right Side**: Scoring form with 4 categories
- **Top**: Real-time total score (updates as you score)
- **Bottom**: Save buttons (Draft or Completed)

**How to Score**:
1. Use tabs to navigate categories:
   - Starting The Call Right (30 pts)
   - Upselling & Closing (25 pts)
   - Handling Rebuttals (10 pts)
   - Qualitative Assessments (35 pts)

2. For each criterion:
   - Check/uncheck "Applicable to this call"
   - Use slider or number buttons to score
   - Add notes if needed (optional)
   - Click to expand for examples

3. Add overall details:
   - Agent name (optional but recommended)
   - Overall notes
   - Review status (Draft or Completed)

4. Save your score!

### 2. QA Dashboard

**Where**: Click "QA Dashboard" button from Library

**4 View Modes**:

**Overview** (Default):
- Total scores, average score, unique agents
- Performance by category with bar charts
- Score distribution histogram
- Recent scores with full breakdowns

**Agents**:
- Table showing all scored agents
- Average scores, min/max ranges
- Total evaluations per agent
- Last scored date

**Criteria**:
- Most commonly failed criteria
- Failure counts and average scores
- Zero score counts
- Not applicable counts

**Trends**:
- Score trends over time
- Daily average scores
- Number of scores per day
- Visual timeline

### 3. Understanding Scores

**Grading Scale**:
- 90-100: A - Excellent
- 80-89: B - Good
- 70-79: C - Satisfactory
- 60-69: D - Needs Improvement
- 0-59: F - Poor

**Score Categories**:
- Each category has a maximum score
- Not all criteria apply to all calls (conditional)
- Only applicable criteria count toward total

## 💡 Common Use Cases

### Use Case 1: Evaluate a Single Call

```
1. Library → Find call → "Score Call"
2. Review transcript for evidence
3. Score all applicable criteria
4. Save completed score
5. View breakdown and grade
```

### Use Case 2: Track Agent Performance

```
1. Score multiple calls for an agent
2. QA Dashboard → Agents tab
3. View agent's average score
4. Identify patterns and trends
5. Use for training and coaching
```

### Use Case 3: Identify Training Needs

```
1. QA Dashboard → Criteria tab
2. See most failed criteria
3. Identify common issues
4. Create training materials
5. Track improvement over time
```

### Use Case 4: Monitor Quality Trends

```
1. QA Dashboard → Trends tab
2. View score timeline
3. Identify patterns (good/bad periods)
4. Correlate with events (training, etc.)
5. Set quality improvement goals
```

## 📋 The 15 Scoring Criteria

### Category 1: Starting The Call Right (30 points)
1. **Agent Introduction** (10 pts) - Proper self-introduction with practice name
2. **Patient Verification** (10 pts) - Quick verification of patient/parent identity
3. **Call Purpose Clarification** (10 pts) - Clear identification of caller needs

### Category 2: Upselling & Closing (25 points)
4. **Next 2 Day Appointment** (10 pts) - Suggest today/tomorrow/day after [Conditional]
5. **Specific Appointment Time** (5 pts) - Suggest specific times, not open-ended [Conditional]
6. **Family Member Scheduling** (5 pts) - Offer to schedule family members
7. **Appointment Confirmation** (5 pts) - Clear date and location confirmation [Conditional]

### Category 3: Handling Rebuttals (10 points)
8. **Rebuttal 1** (5 pts) - Address first scheduling objection [Conditional]
9. **Rebuttal 2** (5 pts) - Address second scheduling objection [Conditional]

### Category 4: Qualitative Assessments (35 points)
10. **Agent Empathy** (5 pts) - Demonstrate empathy, ask about discomfort
11. **Agent Positivity** (5 pts) - Friendly, upbeat, confident tone
12. **Caller Confusion** (5 pts) - No confusion due to agent communication
13. **Caller Frustration** (5 pts) - No frustration from poor service
14. **Questions Answered** (5 pts) - All questions properly addressed
15. **Long Pauses** (5 pts) - No excessive pauses (>5s without preface, >15s with)
16. **CSAT Estimation** (5 pts) - Estimated customer satisfaction score

## 🔧 Tips & Best Practices

### Scoring Tips

✅ **DO**:
- Review the full transcript before scoring
- Use the notes field to document evidence
- Mark criteria as "not applicable" when appropriate
- Be consistent across calls
- Save as draft if you're not finished

❌ **DON'T**:
- Score calls without transcripts
- Rush through criteria
- Forget to check applicability
- Leave ambiguous notes

### Dashboard Tips

✅ **DO**:
- Filter by date range for specific periods
- Focus on trends, not individual scores
- Use failed criteria for training priorities
- Track improvement over time

❌ **DON'T**:
- Compare agents with different call types
- Make decisions on single data points
- Ignore context (call complexity, etc.)

## 🐛 Troubleshooting

### "Score Call" button is grayed out
**Issue**: Call doesn't have a completed transcript  
**Solution**: Transcribe the call first (View Details → Transcribe)

### Dashboard shows no data
**Issue**: No scores have been submitted yet  
**Solution**: Score at least one call first

### Total score doesn't equal 100
**Issue**: This is normal! Some criteria may not be applicable  
**Solution**: Only applicable criteria count. Max is 100 if all apply.

### Can't find QA Dashboard
**Issue**: Looking in wrong place  
**Solution**: Click "QA Dashboard" button at top of Library (Enhanced) page

### Score not saving
**Issue**: Validation error or network issue  
**Solution**: Check browser console for errors, verify all scores are within valid ranges

## 🎓 Training Your Team

### For Scorers/Managers:

1. **Start with the Guide**: Read the full criteria definitions in `/lib/qa-criteria.ts`
2. **Practice Scoring**: Score 5-10 calls to get calibrated
3. **Compare Scores**: Have multiple people score the same call, discuss differences
4. **Establish Standards**: Create team guidelines for edge cases
5. **Regular Reviews**: Weekly dashboard reviews to track trends

### For Agents:

1. **Review Criteria**: Share the 15 criteria with all agents
2. **Show Examples**: Use actual scored calls as teaching examples
3. **Feedback Sessions**: One-on-one reviews of their scored calls
4. **Track Progress**: Show agents their improvement over time
5. **Celebrate Wins**: Recognize high scores and improvements

## 📈 Success Metrics

Track these to measure system effectiveness:

1. **QA Coverage**: % of calls scored vs. total calls
   - Target: > 80% of eligible calls

2. **Average Scores**: Overall quality level
   - Target: > 75/100

3. **Agent Improvement**: Score trends by agent
   - Target: Upward trends over time

4. **Failed Criteria**: Most common issues
   - Target: Decreasing failure counts

5. **Scoring Velocity**: Time to score a call
   - Target: < 5 minutes per call

## 🔗 Related Features

This QA system integrates with:

- **Transcription** (Milestone 5): Need transcripts to score calls
- **AI Insights** (Milestone 6): Compare AI insights with QA scores
- **Analytics** (Milestone 7): QA metrics add to overall analytics
- **Search** (Milestone 6): Find calls by score range or agent

## 📚 Learn More

- **Full Documentation**: See `MILESTONE_8_COMPLETE.md`
- **API Reference**: Check individual route files in `/app/api/qa/`
- **Type Definitions**: See `/types/qa.ts` for all data structures
- **Criteria Details**: Review `/lib/qa-criteria.ts` for scoring logic

## ✅ Quick Verification Checklist

After setup, verify:

- [ ] Can access Library (Enhanced) page
- [ ] Can see "Score Call" button on transcribed calls
- [ ] Scoring panel opens when clicked
- [ ] Can score criteria and see total update
- [ ] Can save score successfully
- [ ] Can access QA Dashboard
- [ ] Dashboard shows the saved score
- [ ] All 4 dashboard tabs work (Overview, Agents, Criteria, Trends)
- [ ] "QA Scored" count updates in Library stats
- [ ] Can edit and update existing scores

---

**Ready to go!** Start scoring calls and improving your team's performance. 🚀

For detailed implementation info, see `MILESTONE_8_COMPLETE.md`.

