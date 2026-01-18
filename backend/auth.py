from fastapi import HTTPException, Header

def get_current_user(x_user: str = Header(None)):
    """
    Validates the X-User header.
    In production, you would decode a JWT token here.
    """
    if not x_user:
        raise HTTPException(status_code=401, detail="Unauthorized: Missing X-User header")
    
    # Return user ID or token back to the route
    return x_user