import requests
import re
import json
from app.chat_store import load_chat_messages

MAX_CONTEXT_MESSAGES = 6  # 3 user-bot turns

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


def generate_llm_response(prompt: str, model_id: str, username: str, chat_id: str) -> dict:
    # Load chat history
    all_messages = load_chat_messages(username, chat_id)
    # Use only last MAX_CONTEXT_MESSAGES
    messages = all_messages[-MAX_CONTEXT_MESSAGES:] if MAX_CONTEXT_MESSAGES > 0 else []

    # Remove last user message if it is duplicate of current prompt (avoid repetition)
    if messages and messages[-1].get("sender") == "user" and messages[-1].get("text", "").strip() == prompt.strip():
        messages = messages[:-1]

    # Build conversation history formatted as alternating [INST]user[/INST]\nbot\n blocks
    chat_history = ""
    i = 0
    while i < len(messages):
        if messages[i].get("sender") == "user":
            user_msg = messages[i].get("text", "").strip()
            bot_msg = ""
            if i + 1 < len(messages) and messages[i+1].get("sender") == "bot":
                bot_msg = messages[i+1].get("text", "").strip()
                i += 2
            else:
                i += 1
            chat_history += f"[INST] {user_msg} [/INST]\n{bot_msg}\n"
        else:
            # If somehow bot message appears without user preceding, just skip it
            i += 1

    # Append current prompt as the last user input
    chat_history += f"[INST] {prompt.strip()} [/INST]"

    system_prompt = (
        "You are an AI assistant that sometimes uses tools.\n"
        "You must respond ONLY to the most recent [INST] prompt.\n"
        "Do NOT reuse or reference earlier user questions unless restated.\n"
        "If the user asks for an image, respond with ONLY a JSON and nothing else, like:\n"
        '{"tool": "image_search", "query": "<what to search>"}\n'
        "Otherwise, respond with a natural text reply.\n"
        "If you use a tool, do not include any other text or HTML tags in the response except the JSON tool call.\n"
        "You must never combine tool calls with text replies.\n"
        "Your response should NOT contain any unrelated or outdated prompts. \n"
        "You may use HTML tags for formatting your response in a clean manner when necessary. Use <b>, <i>, <u>, <a>, <code> tags, etc. in your response. Do not use <script> or other potentially harmful tags.\n"
        "If you use a tool, you must never include any other text or HTML tags in the response except the JSON tool call.\n"
    )

    full_prompt = f"[INST] <<SYS>>{system_prompt}<</SYS>>\n{chat_history}"

    print("=== DEBUG: Full prompt sent to Ollama ===")
    print(full_prompt)
    print("========================================")

    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": model_id,
                "prompt": full_prompt,
                "stream": False
            }
        )

        if response.status_code != 200:
            print(f"[ERROR] Ollama API returned status {response.status_code}")
            return {"text": "Unable to get response", "image": None}

        raw_reply = response.json().get("response", "").strip()
        print(f"=== DEBUG: Raw reply from Ollama ===\n{raw_reply}\n====================================")

        # Attempt to parse JSON tool call if any
        image_url = None
        try:
            tool_data = json.loads(raw_reply)
            if isinstance(tool_data, dict) and tool_data.get("tool") == "image_search":
                query = tool_data.get("query")
                if query:
                    print(f"[DEBUG] Detected image_search tool call with query: '{query}'")
                    image_url = fetch_image_url(query)
                    text_reply = tool_data.get("text") or f"Here is an image for '{query}'."
                    return {"text": text_reply, "image": image_url}
        except json.JSONDecodeError:
            # Not a JSON tool call - just normal text reply
            pass

        # In case model tries to embed tool call JSON in text, try to extract natural language text only
        # (Optional improvement: regex or prompt tuning)

        # Return normal text and no image
        return {
            "text": raw_reply or "Unable to get response",
            "image": None
        }

    except Exception as e:
        print(f"[EXCEPTION] Exception during generate_llm_response: {e}")
        return {"text": "Unable to get response", "image": None}
