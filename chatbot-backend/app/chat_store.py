# app/chat_store.py
import json
from pathlib import Path
from datetime import datetime
import os
import uuid

DATA_DIR = Path(__file__).parent.parent / "data"
CHAT_DIR = DATA_DIR / "chats"

def load_user_chats(username: str):
    user_folder = CHAT_DIR / username
    chat_list_file = user_folder / "chat_list.json"
    if not chat_list_file.exists():
        return []
    with open(chat_list_file, "r", encoding="utf-8") as f:
        return json.load(f)

def load_chat_messages(username: str, chat_id: str):
    from pathlib import Path
    import json

    DATA_DIR = Path(__file__).parent.parent / "data"
    CHAT_DIR = DATA_DIR / "chats" / username
    chat_file = CHAT_DIR / f"{chat_id}.json"

    if not chat_file.exists():
        return []

    with open(chat_file, "r", encoding="utf-8") as f:
        messages = json.load(f)

    # Optional: sort messages by timestamp if not already sorted
    messages.sort(key=lambda x: x.get("timestamp", ""))

    return messages

def save_message(username: str, chat_id: str, message: dict):
    DATA_DIR = Path(__file__).parent.parent / "data"
    CHAT_DIR = DATA_DIR / "chats" / username
    chat_file = CHAT_DIR / f"{chat_id}.json"

    if chat_file.exists():
        with open(chat_file, "r", encoding="utf-8") as f:
            messages = json.load(f)
    else:
        messages = []

    messages.append(message)

    with open(chat_file, "w", encoding="utf-8") as f:
        json.dump(messages, f, indent=2)

def create_new_chat(username: str, title: str) -> str:
    user_dir = os.path.join(DATA_DIR, "chats", username)
    os.makedirs(user_dir, exist_ok=True)

    chat_list_path = os.path.join(user_dir, "chat_list.json")
    if os.path.exists(chat_list_path):
        with open(chat_list_path, "r") as f:
            chat_list = json.load(f)
    else:
        chat_list = []

    chat_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat() + "Z"
    chat_list.append({
        "id": chat_id,
        "title": title,
        "created_at": created_at
    })

    with open(chat_list_path, "w") as f:
        json.dump(chat_list, f, indent=2)

    chat_file_path = os.path.join(user_dir, f"{chat_id}.json")
    with open(chat_file_path, "w") as f:
        json.dump([], f)

    return chat_id

def rename_user_chat(username: str, chat_id: str, new_title: str) -> bool:
    chat_list_path = CHAT_DIR / username / "chat_list.json"
    if not chat_list_path.exists():
        return False

    with open(chat_list_path, "r", encoding="utf-8") as f:
        chats = json.load(f)

    found = False
    for chat in chats:
        if chat["id"] == chat_id:
            chat["title"] = new_title
            found = True
            break

    if not found:
        return False

    with open(chat_list_path, "w", encoding="utf-8") as f:
        json.dump(chats, f, indent=2)

    return True

def delete_user_chat(username: str, chat_id: str) -> bool:
    user_dir = CHAT_DIR / username
    chat_list_path = user_dir / "chat_list.json"
    chat_file_path = user_dir / f"{chat_id}.json"

    if not chat_list_path.exists():
        return False

    with open(chat_list_path, "r", encoding="utf-8") as f:
        chats = json.load(f)

    new_chats = [chat for chat in chats if chat["id"] != chat_id]
    if len(new_chats) == len(chats):  # Nothing deleted
        return False

    with open(chat_list_path, "w", encoding="utf-8") as f:
        json.dump(new_chats, f, indent=2)

    if chat_file_path.exists():
        chat_file_path.unlink()

    return True
