-- ============================================
-- DentalCallInsights - Core Database Schema
-- Migration 01: Core Schema Setup
-- ============================================
-- This migration sets up the core database structure including:
-- - Required extensions
-- - Core tables (calls, users, transcripts)
-- - Basic relationships and constraints
-- 
-- Run this FIRST in Supabase SQL Editor
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- CALLS TABLE
-- Stores audio file metadata and references
-- ============================================
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    audio_path TEXT NOT NULL DEFAULT '', -- Allow empty for calls without recordings
    metadata JSONB DEFAULT '{}'::jsonb,
    filename TEXT NOT NULL DEFAULT '',
    file_size BIGINT,
    mime_type TEXT DEFAULT 'audio/mpeg',
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- CSV data fields
    call_time TIMESTAMP WITH TIME ZONE,
    source_number TEXT,
    destination_number TEXT,
    call_direction TEXT CHECK (call_direction IN ('inbound', 'outbound')),
    call_duration_seconds INTEGER,
    disposition TEXT,
    notes TEXT,
    
    -- Processing status
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT
);

-- ============================================
-- TRANSCRIPTS TABLE
-- Stores transcription data and status
-- ============================================
CREATE TABLE IF NOT EXISTS transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    content TEXT,
    transcription_status TEXT DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
    confidence_score DECIMAL(3,2),
    language_code TEXT DEFAULT 'en-US',
    processing_time_seconds INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INSIGHTS TABLE
-- Stores AI-generated insights and analysis
-- ============================================
CREATE TABLE IF NOT EXISTS insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Sentiment analysis
    overall_sentiment TEXT CHECK (overall_sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
    sentiment_confidence DECIMAL(3,2),
    
    -- Key insights
    key_points TEXT[],
    action_items TEXT[],
    red_flags TEXT[],
    patient_satisfaction_score INTEGER CHECK (patient_satisfaction_score >= 0 AND patient_satisfaction_score <= 100),
    
    -- Call analysis
    call_outcome TEXT,
    staff_performance TEXT CHECK (staff_performance IN ('professional', 'needs_improvement')),
    appointment_scheduled BOOLEAN DEFAULT FALSE,
    appointment_cancelled BOOLEAN DEFAULT FALSE,
    
    -- Processing metadata
    processing_time_seconds INTEGER,
    model_used TEXT DEFAULT 'gpt-4o-mini',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- EMBEDDINGS TABLE
-- Stores vector embeddings for semantic search
-- ============================================
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- OpenAI ada-002 embedding dimension
    content_type TEXT DEFAULT 'transcript' CHECK (content_type IN ('transcript', 'insights', 'metadata')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Calls table indexes
CREATE INDEX IF NOT EXISTS idx_calls_user_id ON calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_processing_status ON calls(processing_status);
CREATE INDEX IF NOT EXISTS idx_calls_call_time ON calls(call_time);

-- Transcripts table indexes
CREATE INDEX IF NOT EXISTS idx_transcripts_call_id ON transcripts(call_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_user_id ON transcripts(user_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_status ON transcripts(transcription_status);

-- Insights table indexes
CREATE INDEX IF NOT EXISTS idx_insights_call_id ON insights(call_id);
CREATE INDEX IF NOT EXISTS idx_insights_user_id ON insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_sentiment ON insights(overall_sentiment);

-- Embeddings table indexes
CREATE INDEX IF NOT EXISTS idx_embeddings_call_id ON embeddings(call_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_user_id ON embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_content_type ON embeddings(content_type);

-- Vector similarity search index (HNSW for fast approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings USING hnsw (embedding vector_cosine_ops);

-- ============================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transcripts_updated_at BEFORE UPDATE ON transcripts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_insights_updated_at BEFORE UPDATE ON insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transcription_corrections_updated_at BEFORE UPDATE ON transcription_corrections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STORAGE BUCKETS SETUP
-- ============================================

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio-files', 'audio-files', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Core schema migration completed successfully!';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '   1. Run migration 02_auth_security.sql';
    RAISE NOTICE '   2. Configure authentication in Supabase dashboard';
    RAISE NOTICE '   3. Test database connection';
END $$;
