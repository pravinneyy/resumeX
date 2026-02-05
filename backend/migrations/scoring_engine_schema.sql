-- ========================================
-- RESUMEX SCORING ENGINE DATABASE SCHEMA
-- ========================================
-- This migration creates all required tables for the scoring engine
-- Run this in Supabase SQL Editor

-- ========================================
-- 1. ASSESSMENT SUBMISSIONS (Individual component scores)
-- ========================================

-- 1A. Coding Assessment Submissions (stored in evaluation_sessions)
-- Already exists - evaluation_sessions contains:
-- - passed_hidden_tests, total_hidden_tests
-- - performance_points, quality_points, penalty_points
-- - final_score, verdict

-- 1B. Psychometric Submissions
CREATE TABLE IF NOT EXISTS psychometric_submissions (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id),
    candidate_id VARCHAR NOT NULL REFERENCES candidates(id),
    answers JSONB NOT NULL DEFAULT '{}',
    score INTEGER DEFAULT 0,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_psychometric_submissions_lookup 
ON psychometric_submissions(job_id, candidate_id, submitted_at DESC);

-- 1C. Technical Text Submissions (graded answers)
CREATE TABLE IF NOT EXISTS technical_text_submissions (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id),
    candidate_id VARCHAR NOT NULL REFERENCES candidates(id),
    
    -- Per-question breakdown: {question_id: {answer, score, keywords_matched, total_keywords}}
    answers JSONB NOT NULL DEFAULT '{}',
    
    -- Aggregated score (average of all question scores, 0-10 scale)
    total_score FLOAT DEFAULT 0.0,
    question_count INTEGER DEFAULT 0,
    
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_technical_text_submissions_lookup 
ON technical_text_submissions(job_id, candidate_id, submitted_at DESC);

-- 1D. Behavioral Slider Submissions (stored as part of psychometric_submissions)
-- Values are extracted from psychometric_submissions.answers where keys start with 'db_' and are slider type

-- ========================================
-- 2. CANDIDATE FINAL SCORES (SINGLE SOURCE OF TRUTH)
-- ========================================
-- This is the unified scoring result table
-- Contains full breakdown for auditability and explainability

CREATE TABLE IF NOT EXISTS candidate_final_scores (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id),
    candidate_id VARCHAR NOT NULL REFERENCES candidates(id),
    
    -- Component scores (raw, before weighting)
    coding_score FLOAT,          -- 0-40, null if not evaluated
    technical_score FLOAT,       -- 0-25, null if not evaluated
    psychometric_score FLOAT,    -- 0-25, null if not evaluated
    behavioral_score FLOAT,      -- 0-10, null if not evaluated
    
    -- Weights used after normalization (sum to 1.0)
    coding_weight_used FLOAT,
    technical_weight_used FLOAT,
    psychometric_weight_used FLOAT,
    behavioral_weight_used FLOAT,
    
    -- Final result
    final_score FLOAT DEFAULT 0.0,             -- 0-100
    decision VARCHAR DEFAULT 'PENDING',         -- STRONG_HIRE, HIRE, BORDERLINE_REVIEW, NO_HIRE
    
    -- Flags for risk assessment
    flags JSONB DEFAULT '{}',  -- {weak_fundamentals, behavioral_reliability, hard_gate_failed, etc.}
    
    -- Full audit trail
    component_breakdown JSONB DEFAULT '{}',    -- Complete breakdown for transparency
    hard_gate_result JSONB,                     -- If hard gate failed, details here
    
    -- Timestamps
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique per job/candidate
    UNIQUE(job_id, candidate_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_candidate_final_scores_lookup 
ON candidate_final_scores(job_id, candidate_id);

-- Index for ranking candidates by score within a job
CREATE INDEX IF NOT EXISTS idx_candidate_final_scores_ranking 
ON candidate_final_scores(job_id, final_score DESC);

-- ========================================
-- 3. JOB ASSESSMENTS (Recruiter Configuration)
-- ========================================
-- Ensure weight columns exist

ALTER TABLE job_assessments 
ADD COLUMN IF NOT EXISTS coding_weight FLOAT DEFAULT 0.40;

ALTER TABLE job_assessments 
ADD COLUMN IF NOT EXISTS technical_weight FLOAT DEFAULT 0.25;

ALTER TABLE job_assessments 
ADD COLUMN IF NOT EXISTS psychometric_weight FLOAT DEFAULT 0.25;

ALTER TABLE job_assessments 
ADD COLUMN IF NOT EXISTS behavioral_weight FLOAT DEFAULT 0.10;

-- ========================================
-- 4. APPLICATIONS (Quick reference to final scores)
-- ========================================
-- Ensure final_grade and verdict columns exist on applications table

ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS final_grade FLOAT DEFAULT 0.0;

ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS verdict VARCHAR;

-- ========================================
-- 5. PROCTORING LOGS (Anti-cheat tracking)
-- ========================================

CREATE TABLE IF NOT EXISTS proctoring_logs (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL,
    candidate_id VARCHAR NOT NULL,
    
    -- Violation details
    violation_type VARCHAR NOT NULL,  -- CAMERA_VIOLATION, TAB_SWITCH, WINDOW_BLUR, etc.
    reason VARCHAR,                    -- NO_FACE, TAB_HIDDEN, etc.
    duration INTEGER,                  -- Duration in seconds
    context VARCHAR,                   -- EDITOR, UNKNOWN, etc.
    
    -- Timestamp
    violation_timestamp BIGINT,        -- Unix timestamp in milliseconds
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_proctoring_logs_lookup 
ON proctoring_logs(job_id, candidate_id);

-- ========================================
-- 6. TECHNICAL QUESTIONS (For grading)
-- ========================================

-- Ensure keywords column exists for keyword-based grading
ALTER TABLE technical_questions 
ADD COLUMN IF NOT EXISTS keywords JSONB DEFAULT '[]';

-- ========================================
-- 7. HELPER VIEWS
-- ========================================

-- View: Candidate Rankings per Job
CREATE OR REPLACE VIEW v_candidate_rankings AS
SELECT 
    cfs.job_id,
    cfs.candidate_id,
    c.name as candidate_name,
    c.email as candidate_email,
    cfs.final_score,
    cfs.decision,
    cfs.coding_score,
    cfs.technical_score,
    cfs.psychometric_score,
    cfs.behavioral_score,
    cfs.flags,
    cfs.calculated_at,
    RANK() OVER (PARTITION BY cfs.job_id ORDER BY cfs.final_score DESC) as rank
FROM candidate_final_scores cfs
JOIN candidates c ON c.id = cfs.candidate_id
ORDER BY cfs.job_id, cfs.final_score DESC;

-- ========================================
-- 8. CLEANUP TEMPORARY PROGRESS TABLES
-- ========================================
-- These are used during assessment and deleted after submission

CREATE TABLE IF NOT EXISTS psychometric_progress (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL,
    candidate_id VARCHAR NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, candidate_id)
);

CREATE TABLE IF NOT EXISTS technical_text_progress (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL,
    candidate_id VARCHAR NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, candidate_id)
);

-- ========================================
-- DONE!
-- ========================================
-- After running this, verify tables with:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
