-- Migration: Add candidate_id and job_id columns to anti_cheat_logs table
-- Purpose: Allow direct linking of violation logs to candidates and jobs for better tracking
-- Date: 2026-02-05

-- Add candidate_id column
ALTER TABLE anti_cheat_logs 
ADD COLUMN IF NOT EXISTS candidate_id VARCHAR(255);

-- Add job_id column
ALTER TABLE anti_cheat_logs 
ADD COLUMN IF NOT EXISTS job_id INTEGER;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_anti_cheat_logs_candidate 
ON anti_cheat_logs(candidate_id);

CREATE INDEX IF NOT EXISTS idx_anti_cheat_logs_job 
ON anti_cheat_logs(job_id);

-- Create composite index for filtering by both
CREATE INDEX IF NOT EXISTS idx_anti_cheat_logs_candidate_job 
ON anti_cheat_logs(candidate_id, job_id);

-- Verification: Show column info
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'anti_cheat_logs' 
ORDER BY ordinal_position;
