from db import engine, Base
import models  # <--- Crucial: Loads JobAssessment, AssessmentSubmission, etc.

print("🔄 Syncing models to Supabase...")
# This will create any tables that are missing
Base.metadata.create_all(bind=engine)
print("✅ Done! All tables (including job_assessments) should exist now.")