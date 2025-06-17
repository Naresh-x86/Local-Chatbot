import requests
import re
import json
import os
import base64
from app.chat_store import load_chat_messages

MAX_CONTEXT_MESSAGES = 6  # 3 user-bot turns

SYSTEM_PROMPT = (
    "You are a helpful AI assistant. "
    "You can use ONLY one tool: image_search, and ONLY if the user explicitly asks for an image or picture. "
    "For all other questions, respond with a clear, natural text answer. "
    "NEVER use the image_search tool unless the user clearly requests an image or picture. "
    "Do NOT use or suggest any other tools. "
    "NEVER combine tool calls with text replies. "
    "NEVER use HTML formatting unless the user specifically asks for HTML or formatting. "
    "Do NOT use broken or unnecessary HTML tags. "
    "Always answer ONLY the user's most recent prompt, using previous conversation only as reference/context. "
    "Do NOT answer previous prompts directly. "
    "Do NOT reference or repeat previous user questions unless restated. "
    "If the user asks for an image, respond ONLY with a JSON: {\"tool\": \"image_search\", \"query\": \"<what to search>\"} and nothing else."
)

def fetch_image_url(query: str) -> str:
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        params = {"q": query, "form": "QBLH"}
        response = requests.get("https://www.bing.com/images/search", headers=headers, params=params)
        if response.status_code == 200:
            matches = re.findall(r'murl&quot;:&quot;(.*?)&quot;', response.text)
            if matches:
                return matches[0]
            print("[INFO] No image results found in Bing response.")
        else:
            print(f"[ERROR] HTTP {response.status_code} fetching Bing images")
    except Exception as e:
        print(f"[ERROR] Bing image fetch failed: {e}")
    return None


def is_image_file(file_meta):
    if not file_meta:
        return False
    content_type = file_meta.get("content_type", "")
    return content_type.startswith("image/")

def get_image_path(file_meta):
    # Returns the absolute path to the uploaded image file
    if not file_meta:
        return None
    uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
    return os.path.join(uploads_dir, file_meta["stored_as"])

def encode_image_to_base64(image_path):
    with open(image_path, "rb") as img_file:
        return base64.b64encode(img_file.read()).decode("utf-8")

def build_llama_prompt(messages, prompt):
    """
    Build a prompt for Llama/Llava models:
    - Always starts with the system prompt.
    - Strict alternation of user/assistant messages from history.
    - Ends with the current user prompt.
    - No context bleed: model must only answer the current prompt.
    """
    prompt_lines = []
    prompt_lines.append(f"[INST] <<SYS>>{SYSTEM_PROMPT}<</SYS>> [/INST]")

    # Add history as alternating user/assistant turns (reference only)
    for msg in messages:
        if msg.get("sender") == "user":
            prompt_lines.append(f"[INST] {msg.get('text', '').strip()} [/INST]")
        elif msg.get("sender") == "bot":
            prompt_lines.append(msg.get("text", "").strip())

    # Add the current prompt as the last user turn
    prompt_lines.append(f"[INST] {prompt.strip()} [/INST]")

    return "\n".join(prompt_lines)

def generate_llm_response(prompt: str, model_id: str, username: str, chat_id: str, attachment_meta=None) -> dict:
    all_messages = load_chat_messages(username, chat_id)
    messages = all_messages[-MAX_CONTEXT_MESSAGES:] if MAX_CONTEXT_MESSAGES > 0 else []

    # Remove last user message if it is duplicate of current prompt (avoid repetition)
    if messages and messages[-1].get("sender") == "user" and messages[-1].get("text", "").strip() == prompt.strip():
        messages = messages[:-1]

    # Print message history and current prompt (with file info if attached)
    print("=== MESSAGE HISTORY + CURRENT PROMPT ===")
    for msg in messages:
        print(f"{msg.get('sender','?')}: {msg.get('text','')}")
    print(f"user: {prompt.strip()}")
    if attachment_meta:
        print(f"[INFO] Attachment meta: {attachment_meta}")
    print("========================================")

    image_file_meta = attachment_meta
    has_image = is_image_file(image_file_meta)

    api_model = model_id
    images_param = None

    # Always use the new context builder for both llama and llava (when no image)
    if model_id in ("llama3.2", "llava", "llama3.2+llava"):
        if has_image:
            # Only send image and current prompt, no context
            if model_id == "llama3.2+llava":
                api_model = "llava"
            image_path = get_image_path(image_file_meta)
            if not os.path.exists(image_path):
                print(f"[ERROR] Image file does not exist: {image_path}")
            images_param = [encode_image_to_base64(image_path)]
            full_prompt = prompt.strip()
        else:
            if model_id == "llama3.2+llava":
                api_model = "llama3.2"
            full_prompt = build_llama_prompt(messages, prompt)
    else:
        print(f"[ERROR] Unknown model_id: {model_id}")
        return {"text": "Unknown model selected", "image": None}

    try:
        payload = {
            "model": api_model,
            "prompt": full_prompt,
            "stream": False
        }
        if images_param:
            payload["images"] = images_param

        response = requests.post(
            "http://localhost:11434/api/generate",
            json=payload
        )

        if response.status_code != 200:
            print(f"[ERROR] Ollama API returned status {response.status_code}")
            return {"text": "Unable to get response", "image": None}

        raw_reply = response.json().get("response", "").strip()
        print(f"=== LLM RESPONSE ===\n{raw_reply}\n====================")

        image_url = None
        try:
            tool_data = json.loads(raw_reply)
            if isinstance(tool_data, dict) and tool_data.get("tool") == "image_search":
                query = tool_data.get("query")
                if query:
                    image_url = fetch_image_url(query)
                    text_reply = tool_data.get("text") or f"Here is an image for '{query}'."
                    return {"text": text_reply, "image": image_url}
        except json.JSONDecodeError:
            pass

        return {
            "text": raw_reply or "Unable to get response",
            "image": None
        }

    except Exception as e:
        print(f"[EXCEPTION] Exception during generate_llm_response: {e}")
        return {"text": "Unable to get response", "image": None}
