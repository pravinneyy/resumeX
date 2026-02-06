-- Enhanced ATS System Migration
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. ENHANCE CANDIDATES TABLE
-- ============================================
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS education_level VARCHAR(50),
ADD COLUMN IF NOT EXISTS education_field VARCHAR(100),
ADD COLUMN IF NOT EXISTS education_institution VARCHAR(200),
ADD COLUMN IF NOT EXISTS graduation_year INTEGER,
ADD COLUMN IF NOT EXISTS location_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS location_country VARCHAR(100),
ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS job_titles TEXT,  -- Comma-separated previous titles
ADD COLUMN IF NOT EXISTS soft_skills TEXT;  -- Comma-separated soft skills

-- ============================================
-- 2. ENHANCE JOBS TABLE (Hard Gates)
-- ============================================
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS min_experience INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS required_education VARCHAR(50),  -- bachelor, master, phd, any
ADD COLUMN IF NOT EXISTS must_have_skills TEXT,  -- Comma-separated HARD requirements
ADD COLUMN IF NOT EXISTS nice_to_have_skills TEXT,  -- Comma-separated optional skills
ADD COLUMN IF NOT EXISTS location_requirement VARCHAR(50) DEFAULT 'any',  -- remote, onsite, hybrid, any
ADD COLUMN IF NOT EXISTS allowed_locations TEXT,  -- Comma-separated locations (if onsite/hybrid)
ADD COLUMN IF NOT EXISTS auto_advance_threshold INTEGER DEFAULT 75,  -- Score threshold for auto-assessment
ADD COLUMN IF NOT EXISTS auto_reject_threshold INTEGER DEFAULT 40;  -- Score threshold for auto-reject

-- ============================================
-- 3. BULK UPLOAD TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS bulk_upload_jobs (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    recruiter_id VARCHAR REFERENCES recruiters(id) ON DELETE CASCADE,
    
    -- Progress tracking
    total_resumes INTEGER DEFAULT 0,
    processed INTEGER DEFAULT 0,
    passed INTEGER DEFAULT 0,
    rejected INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    
    -- Status: pending, processing, completed, failed
    status VARCHAR(20) DEFAULT 'pending',
    
    -- Configuration used
    auto_advance_threshold INTEGER DEFAULT 75,
    auto_reject_threshold INTEGER DEFAULT 40,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Error details (if failed)
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_bulk_upload_jobs_job ON bulk_upload_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_bulk_upload_jobs_recruiter ON bulk_upload_jobs(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_bulk_upload_jobs_status ON bulk_upload_jobs(status);

-- ============================================
-- 4. INDIVIDUAL RESUME PROCESSING RESULTS
-- ============================================
CREATE TABLE IF NOT EXISTS bulk_upload_results (
    id SERIAL PRIMARY KEY,
    bulk_job_id INTEGER REFERENCES bulk_upload_jobs(id) ON DELETE CASCADE,
    
    -- File info
    filename VARCHAR(255),
    file_size_bytes INTEGER,
    
    -- Candidate linkage
    candidate_id VARCHAR REFERENCES candidates(id),
    application_id INTEGER REFERENCES applications(id),
    
    -- Processing status: pending, processing, passed, rejected, error
    status VARCHAR(20) DEFAULT 'pending',
    
    -- Scoring breakdown
    match_score INTEGER,
    skill_score FLOAT,
    experience_score FLOAT,
    education_score FLOAT,
    location_score FLOAT,
    
    -- Decision details
    decision VARCHAR(20),  -- ADVANCE, REVIEW, REJECT
    rejection_reasons TEXT,  -- JSON array of reasons
    passed_hard_gates BOOLEAN DEFAULT false,
    
    -- Extracted info preview
    candidate_name VARCHAR(100),
    candidate_email VARCHAR(200),
    detected_skills TEXT,
    experience_years INTEGER,
    
    -- Performance metrics
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bulk_results_bulk_job ON bulk_upload_results(bulk_job_id);
CREATE INDEX IF NOT EXISTS idx_bulk_results_status ON bulk_upload_results(status);
CREATE INDEX IF NOT EXISTS idx_bulk_results_candidate ON bulk_upload_results(candidate_id);

-- ============================================
-- 5. ENHANCE APPLICATIONS TABLE
-- ============================================
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'direct',  -- direct, bulk_upload, referral
ADD COLUMN IF NOT EXISTS bulk_upload_id INTEGER REFERENCES bulk_upload_jobs(id),
ADD COLUMN IF NOT EXISTS screening_score INTEGER,  -- ATS screening score (before assessment)
ADD COLUMN IF NOT EXISTS hard_gate_passed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS rejection_reasons TEXT;  -- JSON array if rejected

-- ============================================
-- 6. ADD RLS POLICIES FOR NEW TABLES
-- ============================================
ALTER TABLE bulk_upload_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_upload_results ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "recruiter_own_bulk_uploads" ON bulk_upload_jobs;
DROP POLICY IF EXISTS "recruiter_own_bulk_results" ON bulk_upload_results;

-- Recruiters can only see their own bulk uploads
CREATE POLICY "recruiter_own_bulk_uploads" ON bulk_upload_jobs
    FOR ALL USING (recruiter_id = auth.uid()::text);

-- Recruiters can see results for their bulk uploads
CREATE POLICY "recruiter_own_bulk_results" ON bulk_upload_results
    FOR ALL USING (
        bulk_job_id IN (
            SELECT id FROM bulk_upload_jobs WHERE recruiter_id = auth.uid()::text
        )
    );

-- ============================================
-- 7. HELPER VIEWS
-- ============================================
CREATE OR REPLACE VIEW bulk_upload_summary AS
SELECT 
    buj.id,
    buj.job_id,
    j.title as job_title,
    buj.recruiter_id,
    buj.total_resumes,
    buj.processed,
    buj.passed,
    buj.rejected,
    buj.errors,
    buj.status,
    buj.created_at,
    buj.completed_at,
    CASE 
        WHEN buj.completed_at IS NOT NULL AND buj.created_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (buj.completed_at - buj.created_at))
        ELSE NULL 
    END as processing_time_seconds
FROM bulk_upload_jobs buj
JOIN jobs j ON j.id = buj.job_id;
