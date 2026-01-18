from fastapi import Depends, HTTPException, Request

def get_current_user(request: Request):
    user = request.headers.get("X-User")

    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return user
