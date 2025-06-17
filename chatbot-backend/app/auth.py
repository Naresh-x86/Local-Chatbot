# app/auth.py
from fastapi import APIRouter, HTTPException
from fastapi import status
from fastapi import Depends
from app.models import LoginRequest, LoginResponse
from app.session_store import create_session
import csv
from pathlib import Path

auth_router = APIRouter()

DATA_PATH = Path(__file__).parent.parent / "data" / "users.csv"

def check_credentials(username: str, password: str):
    """Check users.csv for a matching username and password. Return profile_pic if valid."""
    with open(DATA_PATH, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if row['username'] == username and row['password'] == password:
                return row['profile_pic']
    return None

@auth_router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest):
    profile_pic = check_credentials(data.username, data.password)
    if not profile_pic:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    token = create_session(data.username)
    return LoginResponse(username=data.username, profile_pic=profile_pic, token=token)
