# app/chat_routes.py
from fastapi import APIRouter, Depends, HTTPException, Request, status, Body, UploadFile, File, Form
from fastapi.responses import JSONResponse
from app.dependencies import get_current_username
from app.chat_store import load_user_chats, load_chat_messages, save_message, create_new_chat, rename_user_chat, delete_user_chat
from app.models import NewMessageRequest, RenameChatRequest
from app.llm import generate_llm_response
from datetime import datetime
from pathlib import Path
import uuid
import json
import shutil
import os

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

chat_router = APIRouter()

@chat_router.get("/chats")
def get_chats(username: str = Depends(get_current_username)):
    chats = load_user_chats(username)
    return {"chats": chats}

@chat_router.get("/chat/{chat_id}/messages")
def get_chat_messages(chat_id: str, username: str = Depends(get_current_username)):
    messages = load_chat_messages(username, chat_id)
    if messages is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"messages": messages}

@chat_router.post("/chat/{chat_id}/send")
async def send_message(
    chat_id: str,
    text: str = Form(...),
    model_id: str = Form(...),
    file: UploadFile = File(None),
    username: str = Depends(get_current_username)
):
    if not text.strip():
        raise HTTPException(status_code=400, detail="Message text required")
    if not model_id:
        raise HTTPException(status_code=400, detail="Model ID is required")

    attachment_meta = None

    # Save the uploaded file if present
    if file:
        file_ext = os.path.splitext(file.filename)[1]
        file_id = f"{uuid.uuid4().hex}{file_ext}"
        save_path = os.path.join(UPLOADS_DIR, file_id)

        try:
            file_bytes = await file.read()
            with open(save_path, "wb") as buffer:
                buffer.write(file_bytes)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

        attachment_meta = {
            "filename": file.filename,
            "stored_as": file_id,
            "content_type": file.content_type,
            "size": len(file_bytes),  # Correct size calculation
        }

    user_msg = {
        "id": str(uuid.uuid4()),
        "sender": "user",
        "text": text,
        "file": attachment_meta,  # replaced image with file
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    save_message(username, chat_id, user_msg)

    bot_resp = generate_llm_response(text, model_id, username, chat_id, attachment_meta)

    bot_msg = {
        "id": str(uuid.uuid4()),
        "sender": "bot",
        "text": bot_resp["text"],
        "image": bot_resp["image"], # bot_resp can return an image URL
        "file": bot_resp.get("file", None),  # Future support if bot attaches files
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    save_message(username, chat_id, bot_msg)

    return JSONResponse(content=bot_msg)

@chat_router.post("/chat/new")
def new_chat(
    title: str = Body(None, embed=True),
    username: str = Depends(get_current_username)
):
    if not title:
        title = "New Chat - " + datetime.now().strftime("%Y-%m-%d %H:%M")
    new_chat_id = create_new_chat(username, title)
    return {"chat_id": new_chat_id, "title": title}

@chat_router.post("/chat/{chat_id}/rename")
def rename_chat(chat_id: str, payload: RenameChatRequest, username: str = Depends(get_current_username)):
    success = rename_user_chat(username, chat_id, payload.title)
    if not success:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"chat_id": chat_id, "new_title": payload.title}

@chat_router.delete("/chat/{chat_id}/delete")
def delete_chat(chat_id: str, username: str = Depends(get_current_username)):
    success = delete_user_chat(username, chat_id)
    if not success:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"chat_id": chat_id, "status": "deleted"}

@chat_router.get("/models")
def get_available_models():
    models_file = Path(__file__).parent.parent / "models" / "models.json"
    if not models_file.exists():
        return JSONResponse(status_code=404, content={"error": "models.json not found"})

    with open(models_file, "r", encoding="utf-8") as f:
        models = json.load(f)

    # Convert to list of dicts for frontend ease: [{id, name}]
    model_list = [{"id": key, "name": value} for key, value in models.items()]
    return model_list