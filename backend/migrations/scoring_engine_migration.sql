-- Migration: Add scoring engine tables and columns
-- Run this in Supabase SQL Editor

-- 1. Add weight columns to job_assessments table
ALTER TABLE job_assessments 
ADD COLUMN IF NOT EXISTS coding_weight FLOAT DEFAULT 0.40,
ADD COLUMN IF NOT EXISTS technical_weight FLOAT DEFAULT 0.25,
ADD COLUMN IF NOT EXISTS psychometric_weight FLOAT DEFAULT 0.25,
ADD COLUMN IF NOT EXISTS behavioral_weight FLOAT DEFAULT 0.10;

-- 2. Create technical_text_submissions table
CREATE TABLE IF NOT EXISTS technical_text_submissions (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id),
    candidate_id VARCHAR NOT NULL REFERENCES candidates(id),
    answers JSONB NOT NULL DEFAULT '{}',
    total_score FLOAT DEFAULT 0.0,
    question_count INTEGER DEFAULT 0,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create candidate_final_scores table
CREATE TABLE IF NOT EXISTS candidate_final_scores (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id),
    candidate_id VARCHAR NOT NULL REFERENCES candidates(id),
    
    -- Component scores (raw, before weighting)
    coding_score FLOAT,
    technical_score FLOAT,
    psychometric_score FLOAT,
    behavioral_score FLOAT,
    
    -- Weights used after normalization
    coding_weight_used FLOAT,
    technical_weight_used FLOAT,
    psychometric_weight_used FLOAT,
    behavioral_weight_used FLOAT,
    
    -- Final result
    final_score FLOAT DEFAULT 0.0,
    decision VARCHAR DEFAULT 'PENDING',
    
    -- Flags and breakdown
    flags JSONB DEFAULT '{}',
    component_breakdown JSONB DEFAULT '{}',
    hard_gate_result JSONB,
    
    -- Timestamps
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tech_text_sub_job_candidate ON technical_text_submissions(job_id, candidate_id);
CREATE INDEX IF NOT EXISTS idx_cand_final_scores_job_candidate ON candidate_final_scores(job_id, candidate_id);

-- 5. Enable RLS (Row Level Security) - adjust policies as needed
ALTER TABLE technical_text_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_final_scores ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust based on your security needs)
CREATE POLICY "Allow all for technical_text_submissions" ON technical_text_submissions FOR ALL USING (true);
CREATE POLICY "Allow all for candidate_final_scores" ON candidate_final_scores FOR ALL USING (true);

COMMENT ON TABLE technical_text_submissions IS 'Stores graded technical text question submissions with keyword matching scores';
COMMENT ON TABLE candidate_final_scores IS 'Single source of truth for unified candidate scoring with full breakdown';
