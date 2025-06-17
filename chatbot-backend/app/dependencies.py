# app/dependencies.py
from fastapi import Header, HTTPException, status, Depends
from typing import Optional
from app.session_store import get_username
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.status import HTTP_401_UNAUTHORIZED
from app.session_store import get_username as verify_token

security = HTTPBearer()

def get_current_username(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    username = verify_token(token)
    if not username:
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return username

def get_token_from_header(authorization: Optional[str] = Header(None)) -> str:
    if authorization is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError("Invalid auth scheme")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Use: Bearer <token>",
        )
    return token

def get_current_username(token: str = Depends(get_token_from_header)) -> str:
    username = get_username(token)
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return username
