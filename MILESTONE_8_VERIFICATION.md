# Milestone 8: Verification & Testing Checklist

## Pre-Deployment Verification

### Database Migration

- [ ] Migration file exists: `migrations/013_qa_scoring_schema.sql`
- [ ] Copy migration to Supabase SQL Editor
- [ ] Run migration successfully
- [ ] Verify no errors in execution

**Verification Query:**
```sql
-- Should return 4 tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('call_scores', 'score_criteria', 'qa_assignments', 'qa_templates')
ORDER BY table_name;
```

**Expected Result:** 4 rows

- [ ] All 4 tables created
- [ ] call_scores table exists
- [ ] score_criteria table exists
- [ ] qa_assignments table exists
- [ ] qa_templates table exists

**RLS Verification:**
```sql
-- Should return 4 rows with rowsecurity = true
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND (tablename LIKE 'call_%' OR tablename LIKE 'qa_%')
ORDER BY tablename;
```

- [ ] RLS enabled on all QA tables

**Views Verification:**
```sql
-- Should return 3 views
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND (table_name LIKE 'qa_%' OR table_name LIKE '%_stats')
ORDER BY table_name;
```

- [ ] qa_dashboard_stats view exists
- [ ] agent_performance_stats view exists
- [ ] failed_criteria_analysis view exists

### Code Deployment

- [ ] All files committed to git
- [ ] No TypeScript errors
- [ ] No linter errors
- [ ] Build succeeds locally: `npm run build`
- [ ] Deploy to Vercel/hosting

## Post-Deployment Functional Testing

### 1. Navigation

- [ ] Navigate to home page
- [ ] Login as test user
- [ ] See "QA" link in navigation
- [ ] Click QA link → redirects to /qa page
- [ ] QA Dashboard loads without errors

### 2. Library Integration

- [ ] Navigate to Library (Enhanced) page
- [ ] See "QA Dashboard" button in header
- [ ] See "QA Scored" stat card showing count
- [ ] Find a call with completed transcript
- [ ] See "Score Call" button on call card
- [ ] Button is enabled (not grayed out)

### 3. Scoring Interface

#### Opening Panel
- [ ] Click "Score Call" button
- [ ] Scoring panel opens as full-screen modal
- [ ] Panel shows call filename in header
- [ ] Close button (X) is visible
- [ ] Transcript appears on left side
- [ ] Scoring form appears on right side

#### Form Elements
- [ ] Agent name field is present
- [ ] Review status dropdown shows Draft/Completed
- [ ] Current score display shows "0/100"
- [ ] All 4 category tabs are present:
  - [ ] Starting The Call Right
  - [ ] Upselling & Closing
  - [ ] Handling Rebuttals
  - [ ] Qualitative Assessments
- [ ] Category scores show (0/30, 0/25, etc.)

#### Scoring Process
- [ ] Click "Starting The Call Right" tab
- [ ] See 3 criteria listed
- [ ] Each criterion shows:
  - [ ] Name and definition
  - [ ] Point value (10, 10, 10)
  - [ ] "Applicable to this call" checkbox (checked by default)
  - [ ] Score selector (slider or buttons)
  - [ ] Notes textarea
  - [ ] Expand/collapse for details

#### Scoring Criteria - Starting Call (30 points)
- [ ] Agent Introduction (10 pts)
  - [ ] Can change score 0-10
  - [ ] Can toggle applicable
  - [ ] Can add notes
- [ ] Patient Verification (10 pts)
  - [ ] Can change score 0-10
  - [ ] Can toggle applicable
  - [ ] Can add notes
- [ ] Call Purpose Clarification (10 pts)
  - [ ] Can change score 0-10
  - [ ] Can toggle applicable
  - [ ] Can add notes

#### Scoring Criteria - Upselling (25 points)
- [ ] Switch to "Upselling & Closing" tab
- [ ] See 4 criteria listed
- [ ] Next 2 Day Appointment (10 pts) - Conditional badge shown
- [ ] Specific Appointment Time (5 pts) - Conditional badge shown
- [ ] Offer to Schedule Family Members (5 pts)
- [ ] Confirm Appointment (5 pts) - Conditional badge shown
- [ ] All scoring controls work

#### Scoring Criteria - Rebuttals (10 points)
- [ ] Switch to "Handling Rebuttals" tab
- [ ] See 2 criteria listed
- [ ] Rebuttal 1 (5 pts) - Conditional badge shown
- [ ] Rebuttal 2 (5 pts) - Conditional badge shown
- [ ] Can mark as not applicable
- [ ] All scoring controls work

#### Scoring Criteria - Qualitative (35 points)
- [ ] Switch to "Qualitative Assessments" tab
- [ ] See 7 criteria listed:
  - [ ] Agent Empathy (5 pts)
  - [ ] Agent Positivity (5 pts)
  - [ ] Caller Confusion (5 pts)
  - [ ] Caller Frustration (5 pts)
  - [ ] Questions Answered (5 pts)
  - [ ] Long Pauses (5 pts)
  - [ ] CSAT Estimation (5 pts)
- [ ] All scoring controls work

#### Real-time Calculation
- [ ] Score a few criteria
- [ ] Total score updates immediately
- [ ] Category scores update in tabs
- [ ] Score summary box updates
- [ ] No page refresh needed

#### Saving Score
- [ ] Enter agent name (optional)
- [ ] Add overall notes (optional)
- [ ] Click "Save as Draft" button
- [ ] See success message
- [ ] Score saves (no errors in console)
- [ ] Can close panel

#### Updating Score
- [ ] Reopen same call's scoring panel
- [ ] Previous scores are loaded
- [ ] Can change scores
- [ ] Click "Save Score" button
- [ ] Success message appears
- [ ] Score updates (not duplicated)

### 4. QA Dashboard

#### Access
- [ ] Navigate to /qa page
- [ ] Dashboard loads without errors
- [ ] See 4 view mode tabs:
  - [ ] Overview
  - [ ] Agents
  - [ ] Criteria
  - [ ] Trends

#### Overview Tab (Default)
- [ ] See 4 stat cards:
  - [ ] Total Scores
  - [ ] Average Score
  - [ ] Unique Agents
  - [ ] Scoring Days
- [ ] All show correct numbers (not 0/0)
- [ ] "Performance by Category" section shows
- [ ] 4 categories with progress bars
- [ ] "Score Distribution" section shows
- [ ] 5 score ranges with bars
- [ ] "Recent Scores" section shows
- [ ] Scored calls appear with breakdowns

#### Agents Tab
- [ ] Click "Agents" tab
- [ ] If scores exist: Agent table appears
- [ ] Table shows:
  - [ ] Agent Name
  - [ ] Evaluations count
  - [ ] Avg Score
  - [ ] Score Range (min-max)
  - [ ] Last Scored date
- [ ] Data is accurate

#### Criteria Tab
- [ ] Click "Criteria" tab
- [ ] "Most Commonly Failed Criteria" section shows
- [ ] Failed criteria listed with:
  - [ ] Criterion name
  - [ ] Category
  - [ ] Failure count
  - [ ] Average score
  - [ ] Zero scores count
  - [ ] Not applicable count
- [ ] Data is accurate

#### Trends Tab
- [ ] Click "Trends" tab
- [ ] "Score Trends Over Time" section shows
- [ ] Timeline with dates and scores
- [ ] Horizontal bars show scores
- [ ] Score counts shown
- [ ] Most recent at top or bottom (consistent)

### 5. Library Enhanced Updates

- [ ] Return to Library (Enhanced) page
- [ ] "QA Scored" stat now shows 1 (or more)
- [ ] Call with score shows orange badge: "⭐ QA Score: X/100"
- [ ] Button text changed to "Update QA Score"
- [ ] Can click to reopen scoring panel

### 6. API Endpoints Testing

#### GET /api/qa/criteria (No Auth)
```bash
curl https://your-app.vercel.app/api/qa/criteria
```
- [ ] Returns 200 OK
- [ ] Returns criteria definitions
- [ ] Contains all 15 criteria
- [ ] No authentication required

#### Authenticated Endpoints (Use browser dev tools for token)

**POST /api/qa/score**
- [ ] Submits new score successfully
- [ ] Returns score_id and total_score
- [ ] Validates score ranges
- [ ] Rejects invalid scores

**GET /api/qa/scores/:callId**
- [ ] Returns score history for call
- [ ] Returns array (even if one score)
- [ ] Latest score first
- [ ] Includes all criteria

**GET /api/qa/dashboard**
- [ ] Returns comprehensive dashboard data
- [ ] Includes overview stats
- [ ] Includes agent performance
- [ ] Includes failed criteria
- [ ] Includes trends data

**POST /api/qa/assign**
- [ ] Creates assignment successfully
- [ ] Prevents duplicate assignments
- [ ] Validates call ownership

**PATCH /api/qa/assign**
- [ ] Updates assignment status
- [ ] Sets completed_at when status = completed
- [ ] Only assignee can update

### 7. Security Testing

#### Authentication
- [ ] Logout
- [ ] Try to access /qa → Redirects to /login
- [ ] Try API endpoints without token → 401 Unauthorized
- [ ] Login again
- [ ] Can access /qa page
- [ ] Can score calls

#### Authorization
- [ ] Can only score own calls
- [ ] Cannot access other users' scores
- [ ] RLS policies prevent cross-user data access

#### Input Validation
- [ ] Cannot score call without transcript
- [ ] Cannot submit score > criterion weight
- [ ] Cannot submit negative scores
- [ ] All inputs sanitized

### 8. Edge Cases

#### Empty States
- [ ] New user with no scores
- [ ] Dashboard shows "No data" messages
- [ ] No errors or crashes

#### Not Applicable Criteria
- [ ] Mark 5 criteria as "not applicable"
- [ ] Total score < 100
- [ ] Calculation correct (only applicable counted)
- [ ] Dashboard shows accurate percentages

#### Multiple Scores
- [ ] Score same call 3 times
- [ ] GET /api/qa/scores/:callId returns all 3
- [ ] Latest shown first
- [ ] Can view history (if implemented)

#### Long Content
- [ ] Add very long notes (500 chars)
- [ ] Saves successfully
- [ ] Displays correctly
- [ ] No UI breaking

### 9. Performance Testing

#### Page Load
- [ ] Library page loads < 2 seconds
- [ ] QA Dashboard loads < 3 seconds
- [ ] Scoring panel opens < 1 second

#### Calculations
- [ ] Changing scores updates total instantly
- [ ] No lag when scoring
- [ ] Real-time updates smooth

#### Large Datasets
- [ ] Test with 50+ scores
- [ ] Dashboard still loads quickly
- [ ] Pagination/limits work (if implemented)

### 10. Browser Compatibility

Test in at least 2 browsers:

**Chrome**
- [ ] All features work
- [ ] UI displays correctly
- [ ] No console errors

**Safari/Firefox**
- [ ] All features work
- [ ] UI displays correctly
- [ ] No console errors

### 11. Mobile Responsiveness

Test on mobile device or browser dev tools:

- [ ] Library page is responsive
- [ ] QA Dashboard is responsive
- [ ] Scoring panel is usable on mobile
- [ ] All buttons/controls accessible
- [ ] Text is readable (not too small)

## Critical Issues Checklist

If ANY of these fail, do NOT deploy:

- [ ] Database migration runs successfully
- [ ] Can score at least one call
- [ ] Score saves to database
- [ ] Dashboard shows scored call
- [ ] No console errors during scoring
- [ ] RLS policies prevent unauthorized access
- [ ] Build completes without errors

## Non-Critical Issues Checklist

These can be fixed post-deployment:

- [ ] Minor UI alignment issues
- [ ] Optional fields behavior
- [ ] Dashboard sorting order
- [ ] Mobile layout refinements
- [ ] Performance optimizations

## Documentation Verification

- [ ] MILESTONE_8_COMPLETE.md exists and is comprehensive
- [ ] MILESTONE_8_QUICKSTART.md exists for end users
- [ ] MILESTONE_8_SUMMARY.md exists with overview
- [ ] MILESTONE_8_VERIFICATION.md exists (this file)
- [ ] All TypeScript types have comments
- [ ] All database columns have comments
- [ ] All functions have docstrings

## Post-Launch Monitoring

### Week 1
- [ ] Monitor error logs daily
- [ ] Check for failed API calls
- [ ] Verify score accuracy with sample audits
- [ ] Gather user feedback
- [ ] Fix critical bugs immediately

### Week 2-4
- [ ] Analyze usage patterns
- [ ] Identify most used features
- [ ] Track scoring velocity
- [ ] Monitor performance metrics
- [ ] Plan optimizations

## Success Criteria

✅ **Deployment Successful** if:
1. All critical items pass
2. At least one complete score submitted
3. Dashboard displays data correctly
4. No errors in production logs
5. Users can complete full workflow

✅ **Milestone Complete** if:
1. All requirements from prompt met
2. All 15 criteria implemented
3. Dashboard fully functional
4. Documentation complete
5. Team trained on system

---

## Sign-off

**Tested By**: _______________  
**Date**: _______________  
**Status**: ⬜ Pass ⬜ Fail ⬜ Pass with Notes

**Notes**:
_______________________________________________
_______________________________________________
_______________________________________________

**Deployment Approved**: ⬜ Yes ⬜ No

**Approver**: _______________  
**Date**: _______________

