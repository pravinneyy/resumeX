import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# --- 1. POSTGRES DATABASE SETUP (SQLAlchemy) ---
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("DATABASE_URL is missing in .env file")

print(f"DEBUG: DATABASE_URL type: {type(SQLALCHEMY_DATABASE_URL)}")
print(f"DEBUG: DATABASE_URL length: {len(SQLALCHEMY_DATABASE_URL)}")
print(f"DEBUG: Starts with postgresql://: {SQLALCHEMY_DATABASE_URL.startswith('postgresql://')}")
print(f"DEBUG: Starts with postgres://: {SQLALCHEMY_DATABASE_URL.startswith('postgres://')}")
# Print first 15 chars to check for quotes or spaces
print(f"DEBUG: First 15 chars: '{SQLALCHEMY_DATABASE_URL[:15]}'")

print(f"DEBUG: DATABASE_URL type: {type(SQLALCHEMY_DATABASE_URL)}")
print(f"DEBUG: DATABASE_URL length: {len(SQLALCHEMY_DATABASE_URL)}")
print(f"DEBUG: Starts with postgresql://: {SQLALCHEMY_DATABASE_URL.startswith('postgresql://')}")
print(f"DEBUG: Starts with postgres://: {SQLALCHEMY_DATABASE_URL.startswith('postgres://')}")
# Print first 10 chars to check for quotes or spaces
print(f"DEBUG: First 15 chars: '{SQLALCHEMY_DATABASE_URL[:15]}'")

# Sanitize URL: Remove whitespace and quotes
SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.strip().strip("'").strip('"')

# FIX: SQLAlchemy requires 'postgresql://', but some providers give 'postgres://'
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

print(f"DEBUG: Final Sanitized URL first 20 chars: '{SQLALCHEMY_DATABASE_URL[:20]}...'")

# Create Engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    pool_pre_ping=True,   # <--- ADD THIS LINE (The most important fix)
    pool_recycle=1800     # <--- OPTIONAL: Recycle connections every 30 mins
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

# Ensure these lines exist at the bottom:
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Sanitize Supabase credentials
if SUPABASE_URL:
    SUPABASE_URL = SUPABASE_URL.strip().strip("'").strip('"')
if SUPABASE_KEY:
    SUPABASE_KEY = SUPABASE_KEY.strip().strip("'").strip('"')

print(f"DEBUG: SUPABASE_URL set: {bool(SUPABASE_URL)}")
print(f"DEBUG: SUPABASE_KEY set: {bool(SUPABASE_KEY)}")
if SUPABASE_URL:
    print(f"DEBUG: SUPABASE_URL first 25 chars: '{SUPABASE_URL[:25]}...'")

if SUPABASE_URL and SUPABASE_KEY and len(SUPABASE_URL) > 10:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    print("WARNING: Supabase not configured properly, storage features will not work")
    supabase = None