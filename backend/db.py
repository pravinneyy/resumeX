import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# --- 1. POSTGRES DATABASE SETUP (SQLAlchemy) ---
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    # We allow this to pass during build time (e.g. if env vars aren't available yet) 
    # but it will fail at runtime if not present.
    print("WARNING: DATABASE_URL is missing in .env file")
    SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost:5432/db" # Placeholder to prevent crash

# Sanitize URL: Remove whitespace and quotes
SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.strip().strip("'").strip('"')

# FIX: SQLAlchemy requires 'postgresql://', but some providers give 'postgres://'
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

print(f"DEBUG: Final Sanitized URL starts with: '{SQLALCHEMY_DATABASE_URL[:20]}...'")

# Create Engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    pool_pre_ping=True,   # Checks if connection is alive before using it
    pool_recycle=1800     # Recycles connections every 30 mins
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- 2. SUPABASE CLIENT SETUP --- #
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Sanitize Supabase credentials
if SUPABASE_URL:
    SUPABASE_URL = SUPABASE_URL.strip().strip("'").strip('"')
if SUPABASE_KEY:
    SUPABASE_KEY = SUPABASE_KEY.strip().strip("'").strip('"')

if SUPABASE_URL and SUPABASE_KEY:
    # Basic check to avoid errors if keys are clearly too short/invalid
    if len(SUPABASE_URL) > 10 and len(SUPABASE_KEY) > 10:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    else:
        print("WARNING: Supabase keys appear invalid")
        supabase = None
else:
    print("WARNING: Supabase not configured properly, storage features will not work")
    supabase = None