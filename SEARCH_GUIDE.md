# Semantic Search User Guide

## What is Semantic Search?

Semantic search understands the **meaning** of your query, not just exact keyword matches. Instead of searching for specific words, you describe what you're looking for, and the AI finds relevant calls based on context and intent.

### Traditional Keyword Search vs. Semantic Search

**Keyword Search:**
- Query: "billing"
- Finds: Only calls containing the word "billing"
- Misses: Calls about "payment issues", "insurance questions", "invoices"

**Semantic Search:**
- Query: "billing problems"
- Finds: All calls about billing, payment, insurance, invoices, charges, etc.
- Understands: Context and meaning, not just exact words

## Getting Started

### Step 1: Generate Embeddings

Before you can use semantic search, calls need to have embeddings generated.

1. Go to the **Library** page
2. Select calls with completed transcripts (check the checkboxes)
3. Click **🔍 Generate Embeddings** button
4. Review the cost estimate (very low, ~$0.00004 per call)
5. Click **OK** to confirm
6. Wait for completion (progress shown next to each call)

**Note:** This is a one-time process per call. Embeddings are stored permanently.

### Step 2: Search Your Calls

1. Go to the **Library** page
2. Click the **Semantic Search** tab (with 🔍 AI badge)
3. Enter your search query in natural language
4. Review results with similarity scores

## Writing Good Search Queries

### Query Examples

**❌ Bad Queries** (too vague)
- "call"
- "patient"
- "phone"

**✅ Good Queries** (specific and descriptive)
- "billing issues and payment questions"
- "emergency dental situations requiring immediate care"
- "appointment scheduling for next week"
- "patients complaining about wait times"
- "follow-up needed for root canal procedure"

### Query Tips

1. **Be Specific**: Describe what you're looking for in detail
   - Instead of: "problem"
   - Try: "patient complaint about billing error"

2. **Use Natural Language**: Write like you're talking to a colleague
   - Instead of: "billing payment issue"
   - Try: "calls where patients had problems paying their bill"

3. **Include Context**: Add relevant details
   - Instead of: "emergency"
   - Try: "emergency dental calls after hours"

4. **Combine Concepts**: Search for multiple related ideas
   - "scheduling conflicts and cancellations"
   - "insurance verification and coverage questions"

## Using Filters

Combine semantic search with structured filters for more precise results.

### Available Filters

**Sentiment**
- Positive: Happy, satisfied patients
- Neutral: Informational calls
- Negative: Frustrated, upset patients
- Mixed: Calls with varied emotions

**Call Outcome**
- Resolved: Issue was addressed
- Pending: Follow-up needed
- Escalated: Sent to supervisor/dentist
- No Resolution: Issue remains open

**Date Range**
- Filter by when the call occurred
- Useful for tracking recent issues

**Call Duration**
- Minimum/maximum call length in seconds
- Find quick calls vs. long conversations

**Special Flags**
- Has Red Flags: Calls with concerns or issues
- Has Action Items: Calls requiring follow-up

### Filter Examples

**Find recent billing complaints:**
- Query: "billing problems"
- Filters: Sentiment = Negative, Date = Last 30 days

**Find long emergency calls:**
- Query: "dental emergency"
- Filters: Duration ≥ 300 seconds (5 minutes)

**Find unresolved issues with action items:**
- Query: "patient concerns"
- Filters: Outcome = Pending, Has Action Items = Yes

## Understanding Search Results

### Result Cards

Each search result shows:

1. **Similarity Score**: How closely the call matches your query
   - 90-100%: Excellent match
   - 80-89%: Very good match
   - 70-79%: Good match
   - Below 70%: Moderate match (may still be relevant)

2. **Call Information**:
   - Filename
   - Date and time
   - Call duration
   - Language

3. **Transcript Preview**: First 200 characters of the conversation

4. **Metadata Badges**:
   - Sentiment (positive/negative/neutral/mixed)
   - Outcome (resolved/pending/escalated)
   - Red Flags indicator
   - Action Items indicator

### Clicking a Result

Click any result card to view the full call details, including:
- Complete transcript
- Audio player (if available)
- AI insights (summary, sentiment, action items, red flags)
- Edit and export options

## Search Strategies

### Strategy 1: Start Broad, Then Narrow

1. Begin with a general query: "patient complaints"
2. Review initial results
3. Add filters to narrow down: Sentiment = Negative
4. Refine query: "patient complaints about scheduling"

### Strategy 2: Explore Similar Calls

1. Find one relevant call through search
2. Note key terms and phrases in the transcript
3. Create new searches based on those terms
4. Build a collection of related calls

### Strategy 3: Time-Based Analysis

1. Search for a topic: "insurance questions"
2. Filter by different date ranges
3. Compare volumes over time
4. Identify trends and patterns

### Strategy 4: Outcome Tracking

1. Search for an issue type: "billing errors"
2. Filter by Outcome = Pending
3. Review calls needing follow-up
4. Track resolution over time

## Common Use Cases

### 1. Quality Assurance

**Goal:** Review calls for training purposes

**Queries:**
- "calls where staff handled the situation well"
- "examples of excellent customer service"
- "calls that could have been handled better"

**Filters:** Sentiment = Positive/Negative

### 2. Issue Management

**Goal:** Find and resolve recurring problems

**Queries:**
- "recurring billing problems"
- "frequent complaints about wait times"
- "common questions about procedures"

**Filters:** Has Red Flags = Yes, Outcome = Pending

### 3. Training Materials

**Goal:** Create training examples for new staff

**Queries:**
- "how to handle angry patients"
- "explaining insurance coverage clearly"
- "scheduling conflicts and solutions"

**Filters:** Sentiment = Mixed, Outcome = Resolved

### 4. Emergency Response

**Goal:** Review emergency call handling

**Queries:**
- "dental emergencies requiring immediate attention"
- "after-hours emergency calls"
- "patients in severe pain"

**Filters:** Duration ≥ 180 seconds, Has Action Items = Yes

### 5. Appointment Management

**Goal:** Optimize scheduling processes

**Queries:**
- "appointment scheduling requests"
- "patients wanting to reschedule"
- "cancellations due to conflicts"

**Filters:** Date Range = Recent, Outcome = Resolved

### 6. Insurance and Billing

**Goal:** Improve billing clarity

**Queries:**
- "insurance verification questions"
- "confusion about charges and fees"
- "payment plan requests"

**Filters:** Has Action Items = Yes

## Search Performance

### Typical Search Times
- Most searches: <500ms
- Complex filtered searches: 500ms-1s
- Large result sets (100+): 1-2s

### Result Limits
- Default: 20 results
- Can be adjusted in filters
- Top matches shown first (by similarity score)

### No Results?

If your search returns no results:

1. **Try a broader query**: "billing" instead of "billing statement discrepancies"
2. **Lower similarity threshold**: Adjust in advanced filters (if available)
3. **Check that embeddings are generated**: Go to Library → Browse tab → Generate Embeddings
4. **Remove some filters**: Filters may be too restrictive
5. **Try synonyms**: "payment" instead of "billing", "appointment" instead of "scheduling"

## Cost Information

### One-Time Embedding Generation
- ~$0.00004 per call
- 1,000 calls = ~$0.04
- Only paid once per call

### Semantic Searches
- **FREE!** No cost per search
- Uses stored embeddings
- Unlimited searches

### When to Regenerate Embeddings
- Usually not necessary
- Only if transcript is significantly edited
- System tracks changes automatically

## Tips and Tricks

### 1. Use Questions
Frame queries as questions:
- "Which calls involved appointment cancellations?"
- "What calls needed follow-up from the dentist?"

### 2. Combine Multiple Concepts
Search for related ideas together:
- "billing questions and payment plans"
- "scheduling conflicts and reschedules"

### 3. Use Negation in Filters
Combine positive queries with negative filters:
- Query: "patient feedback"
- Filter: Sentiment ≠ Positive
- Result: Find areas needing improvement

### 4. Save Common Searches
If you search for the same things often:
- Note effective query patterns
- Document useful filter combinations
- Share with your team

### 5. Review Search History
Your search history is tracked:
- See what queries worked well
- Refine based on past results
- Build on successful searches

## Privacy and Security

- ✅ Your searches are private (only you can see them)
- ✅ Search results respect user permissions (RLS)
- ✅ No calls from other users appear in results
- ✅ Search analytics help improve the system
- ✅ Embeddings contain no readable text (just numbers)

## Troubleshooting

### Search not working?
1. Check that you're logged in
2. Verify embeddings are generated (Library → Browse → Generate Embeddings)
3. Try a different query
4. Clear filters and try again

### Results don't seem relevant?
1. Make query more specific
2. Try different wording
3. Add context to your query
4. Use filters to narrow results

### Slow search?
1. Typical for first search after login (caching)
2. Subsequent searches should be faster
3. Contact support if consistently slow

## Need Help?

- Review example queries above
- Check the Browse tab for traditional keyword search
- Review call transcripts to understand content
- Try different search strategies
- Contact support for technical issues

## What's Next?

- **Milestone 7:** Advanced analytics and custom dashboards
- More search features coming soon!
- Feedback welcome to improve search quality

