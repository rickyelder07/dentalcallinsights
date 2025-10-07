-- ============================================
-- MILESTONE 8: QA & Call Scoring Schema
-- ============================================
-- Creates tables for call quality assurance, scoring, and QA workflows
-- Based on scoring criteria from Scoring Guide.csv
-- Total possible score: 100 points across 4 categories

-- ============================================
-- CALL SCORES TABLE
-- ============================================
-- Stores overall QA scores for calls
CREATE TABLE IF NOT EXISTS call_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Scoring information
  total_score INTEGER NOT NULL CHECK (total_score >= 0 AND total_score <= 100),
  scored_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Category scores (for quick filtering and reporting)
  starting_call_score INTEGER CHECK (starting_call_score >= 0 AND starting_call_score <= 30),
  upselling_score INTEGER CHECK (upselling_score >= 0 AND upselling_score <= 25),
  rebuttals_score INTEGER CHECK (rebuttals_score >= 0 AND rebuttals_score <= 10),
  qualitative_score INTEGER CHECK (qualitative_score >= 0 AND qualitative_score <= 35),
  
  -- Metadata
  scorer_notes TEXT,
  review_status VARCHAR(20) DEFAULT 'completed' CHECK (review_status IN ('draft', 'completed', 'reviewed', 'approved')),
  
  -- Agent information (from call metadata)
  agent_name VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_scores_call_id ON call_scores(call_id);
CREATE INDEX IF NOT EXISTS idx_call_scores_user_id ON call_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_call_scores_total_score ON call_scores(total_score);
CREATE INDEX IF NOT EXISTS idx_call_scores_scored_at ON call_scores(scored_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_scores_agent_name ON call_scores(agent_name);
CREATE INDEX IF NOT EXISTS idx_call_scores_review_status ON call_scores(review_status);

-- Only one score per call per user (users can update their scores)
CREATE UNIQUE INDEX IF NOT EXISTS idx_call_scores_unique ON call_scores(call_id, user_id);

-- ============================================
-- SCORE CRITERIA TABLE
-- ============================================
-- Stores individual criterion scores (15 criteria from Scoring Guide.csv)
CREATE TABLE IF NOT EXISTS score_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_id UUID NOT NULL REFERENCES call_scores(id) ON DELETE CASCADE,
  
  -- Criterion identification
  criterion_name VARCHAR(100) NOT NULL,
  criterion_category VARCHAR(50) NOT NULL CHECK (criterion_category IN ('starting_call', 'upselling', 'rebuttals', 'qualitative')),
  criterion_weight INTEGER NOT NULL,
  
  -- Scoring
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= criterion_weight),
  applicable BOOLEAN NOT NULL DEFAULT true,
  
  -- Notes and evidence
  notes TEXT,
  transcript_excerpt TEXT, -- Optional: reference to specific transcript section
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_score_criteria_score_id ON score_criteria(score_id);
CREATE INDEX IF NOT EXISTS idx_score_criteria_category ON score_criteria(criterion_category);
CREATE INDEX IF NOT EXISTS idx_score_criteria_applicable ON score_criteria(applicable);

-- ============================================
-- QA ASSIGNMENTS TABLE
-- ============================================
-- Manages QA review assignments and workflow
CREATE TABLE IF NOT EXISTS qa_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  
  -- Assignment details
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Priority and scheduling
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_date TIMESTAMP WITH TIME ZONE,
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Notes
  assignment_notes TEXT,
  completion_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qa_assignments_call_id ON qa_assignments(call_id);
CREATE INDEX IF NOT EXISTS idx_qa_assignments_assigned_to ON qa_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_qa_assignments_assigned_by ON qa_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_qa_assignments_status ON qa_assignments(status);
CREATE INDEX IF NOT EXISTS idx_qa_assignments_priority ON qa_assignments(priority);
CREATE INDEX IF NOT EXISTS idx_qa_assignments_due_date ON qa_assignments(due_date);

-- Prevent duplicate assignments
CREATE UNIQUE INDEX IF NOT EXISTS idx_qa_assignments_unique ON qa_assignments(call_id, assigned_to) WHERE status != 'skipped';

-- ============================================
-- QA TEMPLATES TABLE (Optional Enhancement)
-- ============================================
-- Stores QA scoring templates for different call types
CREATE TABLE IF NOT EXISTS qa_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Template details
  template_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Template configuration (JSON)
  criteria_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Usage tracking
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qa_templates_user_id ON qa_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_qa_templates_is_active ON qa_templates(is_active);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all QA tables
ALTER TABLE call_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_templates ENABLE ROW LEVEL SECURITY;

-- Call Scores Policies
-- Users can view their own scores
CREATE POLICY "Users can view their own call scores"
  ON call_scores FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own scores
CREATE POLICY "Users can insert their own call scores"
  ON call_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own scores
CREATE POLICY "Users can update their own call scores"
  ON call_scores FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own scores
CREATE POLICY "Users can delete their own call scores"
  ON call_scores FOR DELETE
  USING (auth.uid() = user_id);

-- Score Criteria Policies
-- Users can view criteria for their scores
CREATE POLICY "Users can view their score criteria"
  ON score_criteria FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM call_scores
      WHERE call_scores.id = score_criteria.score_id
      AND call_scores.user_id = auth.uid()
    )
  );

-- Users can insert criteria for their scores
CREATE POLICY "Users can insert their score criteria"
  ON score_criteria FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM call_scores
      WHERE call_scores.id = score_criteria.score_id
      AND call_scores.user_id = auth.uid()
    )
  );

-- Users can update their score criteria
CREATE POLICY "Users can update their score criteria"
  ON score_criteria FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM call_scores
      WHERE call_scores.id = score_criteria.score_id
      AND call_scores.user_id = auth.uid()
    )
  );

-- Users can delete their score criteria
CREATE POLICY "Users can delete their score criteria"
  ON score_criteria FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM call_scores
      WHERE call_scores.id = score_criteria.score_id
      AND call_scores.user_id = auth.uid()
    )
  );

-- QA Assignments Policies
-- Users can view assignments assigned to them or created by them
CREATE POLICY "Users can view their QA assignments"
  ON qa_assignments FOR SELECT
  USING (auth.uid() = assigned_to OR auth.uid() = assigned_by);

-- Users can create assignments
CREATE POLICY "Users can create QA assignments"
  ON qa_assignments FOR INSERT
  WITH CHECK (auth.uid() = assigned_by);

-- Users can update assignments assigned to them or created by them
CREATE POLICY "Users can update their QA assignments"
  ON qa_assignments FOR UPDATE
  USING (auth.uid() = assigned_to OR auth.uid() = assigned_by);

-- Users can delete assignments they created
CREATE POLICY "Users can delete QA assignments they created"
  ON qa_assignments FOR DELETE
  USING (auth.uid() = assigned_by);

-- QA Templates Policies
-- Users can view their own templates
CREATE POLICY "Users can view their QA templates"
  ON qa_templates FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own templates
CREATE POLICY "Users can insert their QA templates"
  ON qa_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
CREATE POLICY "Users can update their QA templates"
  ON qa_templates FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete their QA templates"
  ON qa_templates FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_qa_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_call_scores_updated_at
  BEFORE UPDATE ON call_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_qa_updated_at();

CREATE TRIGGER update_qa_assignments_updated_at
  BEFORE UPDATE ON qa_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_qa_updated_at();

CREATE TRIGGER update_qa_templates_updated_at
  BEFORE UPDATE ON qa_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_qa_updated_at();

-- Function to calculate total score from criteria
CREATE OR REPLACE FUNCTION calculate_total_score(p_score_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(score), 0)
  INTO v_total
  FROM score_criteria
  WHERE score_id = p_score_id AND applicable = true;
  
  RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Function to get QA completion rate
CREATE OR REPLACE FUNCTION get_qa_completion_rate(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total INTEGER;
  v_completed INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_total
  FROM qa_assignments
  WHERE assigned_to = p_user_id;
  
  IF v_total = 0 THEN
    RETURN 0;
  END IF;
  
  SELECT COUNT(*)
  INTO v_completed
  FROM qa_assignments
  WHERE assigned_to = p_user_id AND status = 'completed';
  
  RETURN ROUND((v_completed::NUMERIC / v_total::NUMERIC) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- View for QA dashboard statistics
CREATE OR REPLACE VIEW qa_dashboard_stats AS
SELECT
  cs.user_id,
  COUNT(DISTINCT cs.id) as total_scores,
  AVG(cs.total_score) as avg_score,
  MIN(cs.total_score) as min_score,
  MAX(cs.total_score) as max_score,
  AVG(cs.starting_call_score) as avg_starting_call,
  AVG(cs.upselling_score) as avg_upselling,
  AVG(cs.rebuttals_score) as avg_rebuttals,
  AVG(cs.qualitative_score) as avg_qualitative,
  COUNT(DISTINCT cs.agent_name) as unique_agents,
  COUNT(DISTINCT DATE(cs.scored_at)) as scoring_days
FROM call_scores cs
GROUP BY cs.user_id;

-- View for agent performance
CREATE OR REPLACE VIEW agent_performance_stats AS
SELECT
  cs.user_id,
  cs.agent_name,
  COUNT(cs.id) as total_evaluations,
  AVG(cs.total_score) as avg_score,
  MIN(cs.total_score) as min_score,
  MAX(cs.total_score) as max_score,
  AVG(cs.starting_call_score) as avg_starting_call,
  AVG(cs.upselling_score) as avg_upselling,
  AVG(cs.rebuttals_score) as avg_rebuttals,
  AVG(cs.qualitative_score) as avg_qualitative,
  MAX(cs.scored_at) as last_scored
FROM call_scores cs
WHERE cs.agent_name IS NOT NULL
GROUP BY cs.user_id, cs.agent_name;

-- View for failed criteria analysis
CREATE OR REPLACE VIEW failed_criteria_analysis AS
SELECT
  cs.user_id,
  sc.criterion_name,
  sc.criterion_category,
  sc.criterion_weight,
  COUNT(*) as failure_count,
  AVG(sc.score) as avg_score,
  COUNT(CASE WHEN sc.score = 0 THEN 1 END) as zero_score_count,
  COUNT(CASE WHEN sc.applicable = false THEN 1 END) as not_applicable_count
FROM score_criteria sc
JOIN call_scores cs ON sc.score_id = cs.id
WHERE sc.score < sc.criterion_weight
GROUP BY cs.user_id, sc.criterion_name, sc.criterion_category, sc.criterion_weight;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON call_scores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON score_criteria TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON qa_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON qa_templates TO authenticated;

-- Grant access to views
GRANT SELECT ON qa_dashboard_stats TO authenticated;
GRANT SELECT ON agent_performance_stats TO authenticated;
GRANT SELECT ON failed_criteria_analysis TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE call_scores IS 'Stores QA scores for calls with category breakdowns';
COMMENT ON TABLE score_criteria IS 'Individual scoring criteria based on Scoring Guide.csv (15 total criteria)';
COMMENT ON TABLE qa_assignments IS 'QA workflow assignments with priority and status tracking';
COMMENT ON TABLE qa_templates IS 'Reusable QA scoring templates for different call types';

COMMENT ON COLUMN call_scores.total_score IS 'Total score out of 100 points';
COMMENT ON COLUMN call_scores.starting_call_score IS 'Score for Starting The Call Right category (max 30)';
COMMENT ON COLUMN call_scores.upselling_score IS 'Score for Upselling & Closing category (max 25)';
COMMENT ON COLUMN call_scores.rebuttals_score IS 'Score for Handling Rebuttals category (max 10)';
COMMENT ON COLUMN call_scores.qualitative_score IS 'Score for Qualitative Assessments category (max 35)';

COMMENT ON COLUMN score_criteria.applicable IS 'Whether this criterion applies to the call (some criteria are conditional)';
COMMENT ON COLUMN score_criteria.transcript_excerpt IS 'Optional excerpt from transcript showing evidence for scoring';

COMMENT ON FUNCTION calculate_total_score IS 'Calculates total score from applicable criteria for a given score_id';
COMMENT ON FUNCTION get_qa_completion_rate IS 'Returns QA completion rate percentage for a user';

COMMENT ON VIEW qa_dashboard_stats IS 'Aggregate statistics for QA dashboard by user';
COMMENT ON VIEW agent_performance_stats IS 'Agent performance metrics for QA reporting';
COMMENT ON VIEW failed_criteria_analysis IS 'Analysis of most commonly failed criteria';

