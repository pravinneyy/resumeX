-- Create anti_cheat_logs table with BIGINT timestamp
-- Referenced in backend/models.py

CREATE TABLE IF NOT EXISTS anti_cheat_logs (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR NOT NULL,
    evaluation_id VARCHAR, -- Nullable, can link to evaluation_sessions.evaluation_id
    
    violation_type VARCHAR NOT NULL,
    reason VARCHAR,
    duration INTEGER,
    context VARCHAR,
    
    violation_timestamp BIGINT NOT NULL, -- Changed from INTEGER to BIGINT to hold JS timestamps
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_anti_cheat_logs_session_id ON anti_cheat_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_anti_cheat_logs_evaluation_id ON anti_cheat_logs(evaluation_id);

COMMENT ON TABLE anti_cheat_logs IS 'Stores real-time proctoring violations (tab switch, camera issues, etc.)';
