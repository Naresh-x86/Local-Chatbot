# app/session_store.py
import uuid
from typing import Dict

# This dict will map token string -> username
_active_sessions: Dict[str, str] = {}

def create_session(username: str) -> str:
    """Create a new session token for a username."""
    token = str(uuid.uuid4())
    _active_sessions[token] = username
    return token

def get_username(token: str) -> str | None:
    """Return the username associated with a token, or None if invalid."""
    return _active_sessions.get(token)

def delete_session(token: str):
    """Remove a session token when user logs out or session expires."""
    _active_sessions.pop(token, None)
