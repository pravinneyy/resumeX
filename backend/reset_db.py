# backend/reset_db.py
from db import engine, Base
import models # Important!

print("Dropping all tables in Supabase...")
Base.metadata.drop_all(bind=engine)

print("Re-creating all tables with new schema...")
Base.metadata.create_all(bind=engine)

print("✅ Database Reset Complete!")