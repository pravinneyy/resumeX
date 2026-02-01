# backend/utils/security.py

import os
import jwt
import requests
from jwt.algorithms import RSAAlgorithm
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# CONFIGURATION
# ensure NEXT_PUBLIC_CLERK_FRONTEND_API is set in your environment variables
# e.g., https://clerk.your-app.com or https://pleasing-poodle-12.clerk.accounts.dev
CLERK_FRONTEND_API = os.getenv("NEXT_PUBLIC_CLERK_FRONTEND_API")
JWKS_URL = f"{CLERK_FRONTEND_API}/.well-known/jwks.json"

security = HTTPBearer()

class AuthError(Exception):
    def __init__(self, error, status_code=401):
        self.error = error
        self.status_code = status_code

def get_clerk_public_keys():
    try:
        response = requests.get(JWKS_URL)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"❌ Failed to fetch Clerk JWKS: {e}")
        raise AuthError("Authentication system unavailable", 503)

def verify_token(token: str):
    try:
        # Decode header to find the Key ID (kid)
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        
        # Fetch public keys
        jwks = get_clerk_public_keys()
        
        # Find the matching public key
        public_key = None
        for key in jwks["keys"]:
            if key["kid"] == kid:
                public_key = RSAAlgorithm.from_jwk(key)
                break
        
        if not public_key:
            raise AuthError("Invalid token signature")

        # Verify token
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_aud": False} 
        )
        return payload

    except jwt.ExpiredSignatureError:
        raise AuthError("Token has expired")
    except Exception as e:
        raise AuthError(f"Authentication failed: {str(e)}")

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Dependency to validate the Token and return the User ID (sub).
    """
    token = credentials.credentials
    try:
        payload = verify_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise AuthError("Token missing user ID")
        return user_id
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.error)