# app/llm.py
from llama_cpp import Llama
import os
import json
import requests, re
from app.chat_store import load_chat_messages

BASE_DIR = os.path.dirname(__file__)
MODELS_DIR = os.path.join(BASE_DIR, "..", "models")
MODELS_JSON = os.path.join(MODELS_DIR, "models.json")

# Create models directory and models.json if not found
if not os.path.exists(MODELS_DIR):
    os.makedirs(MODELS_DIR)
    print(f"[INFO] Created missing models directory: {MODELS_DIR}")

if not os.path.exists(MODELS_JSON):
    with open(MODELS_JSON, "w") as f:
        json.dump({}, f)
    print(f"[INFO] Created missing models.json at: {MODELS_JSON}")

# Cache for loaded models
_loaded_models = {}

# Number of previous messages to include in LLM context
MAX_CONTEXT_MESSAGES = 10  # <-- Change this value to 20 or more when needed

def generate_llm_response(prompt: str, model_id: str, username: str, chat_id: str) -> dict:
    def fetch_image_url(query: str) -> str:
        try:
            headers = {
                "User-Agent": "Mozilla/5.0"
            }
            params = {
                "q": query,
                "form": "QBLH"
            }
            response = requests.get("https://www.bing.com/images/search", headers=headers, params=params)
            if response.status_code == 200:
                matches = re.findall(r'murl&quot;:&quot;(.*?)&quot;', response.text)
                if matches:
                    return matches[0]
                else:
                    print("[INFO] No image results found in Bing response.")
            else:
                print(f"[ERROR] HTTP {response.status_code}")
        except Exception as e:
            print(f"[ERROR] Bing image fetch failed: {e}")
        return None

    model_path = os.path.join(MODELS_DIR, model_id)

    if model_id not in _loaded_models:
        print(f"[INFO] Loading model: {model_id}")
        _loaded_models[model_id] = Llama(
            model_path=model_path,
            n_ctx=8192,
            verbose=False
        )

    llm = _loaded_models[model_id]

    # Load and format recent chat history
    all_messages = load_chat_messages(username, chat_id)
    messages = all_messages[-MAX_CONTEXT_MESSAGES:] if MAX_CONTEXT_MESSAGES > 0 else []

    formatted_history = ""
    for msg in messages:
        role = msg.get("sender")
        text = msg.get("text", "").strip()
        if role == "user":
            formatted_history += f"User: {text}\n"
        elif role == "bot":
            formatted_history += f"Assistant: {text}\n"

    # Append latest user prompt if it's not the last message
    if not messages or messages[-1]["text"].strip() != prompt.strip() or messages[-1]["sender"] != "user":
        formatted_history += f"User: {prompt}\n"

    formatted_history += "Assistant:"

    # Check for image fetch request
    image_url = None
    last_user_message = messages[-1]["text"].strip() if messages else prompt.strip()
    print('last user message:', last_user_message)  
    if last_user_message.lower().startswith("fetch me an image of"):
        search_query = last_user_message[len("fetch me an image of"):].strip()
        if search_query:
            print(search_query)
            image_url = fetch_image_url(search_query)

    # Log the LLM request details (set to True for debugging)
    verbose = False
    if verbose:
        print(f"\n---[LLM Request]---")
        print(f"Model: {model_id}")
        print(f"User: {username} | Chat ID: {chat_id}")
        print(f"Messages in Context: {len(messages)}")
        print(f"Prompt Preview:\n{formatted_history[-500:]}")
        print(f"-------------------\n")

    try:
        output = llm(formatted_history, max_tokens=256, stop=["User:", "Assistant:"])
        reply = output["choices"][0]["text"].strip()
    except Exception as e:
        print(f"[ERROR] LLM processing failed: {e}")
        reply = "Sorry, something went wrong while generating a response."

    print(image_url)

    return {
        "text": reply,
        "image": image_url
    }

