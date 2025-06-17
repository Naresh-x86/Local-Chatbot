# app/models.py
from pydantic import BaseModel
from typing import List, Optional

# Login request payload
class LoginRequest(BaseModel):
    username: str
    password: str

# Login response payload
class LoginResponse(BaseModel):
    username: str
    profile_pic: str
    token: str  # token to be sent back to client for authentication

# Chat summary for chat list
class ChatSummary(BaseModel):
    chat_id: str
    chat_name: str

# Message object inside a chat
class FileAttachment(BaseModel):
    filename: str
    stored_as: str
    content_type: str
    size: Optional[int] = None

class Message(BaseModel):
    text: str
    image: Optional[str] = None  # Bot-generated image preview (if any)
    file: Optional[FileAttachment] = None  # New: generic file metadata
    sender: str
    timestamp: str

# Chat messages response
class ChatMessagesResponse(BaseModel):
    chat_id: str
    messages: List[Message]

# New chat creation request
class NewChatRequest(BaseModel):
    chat_name: str

# New message send request
class NewMessageRequest(BaseModel):
    text: str
    model_id: str  # model_id is now required

class RenameChatRequest(BaseModel):
    title: str