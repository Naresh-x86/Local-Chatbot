# llm.py
import os
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

import requests
import json
import base64
import time
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Union
import numpy as np
import faiss
import torch
from PyPDF2 import PdfReader
from app.chat_store import load_chat_messages

MAX_CONTEXT_MESSAGES = 6
UPLOADS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
VECTOR_STORE_DIR = Path("vector_store")
SYSTEM_PROMPT = """You are a helpful technical assistant. Use uploaded file context (images or PDFs) where possible. Respond clearly, concisely, and factually."""

USE_GPU = torch.cuda.is_available()
if USE_GPU:
    import faiss.contrib.torch_utils


class VectorStore:
    def __init__(self, dim: int = 768):
        self.path = VECTOR_STORE_DIR
        self.path.mkdir(parents=True, exist_ok=True)
        self.index = faiss.IndexFlatL2(dim)
        if USE_GPU:
            res = faiss.StandardGpuResources()
            self.index = faiss.index_cpu_to_gpu(res, 0, self.index)

        self.meta_path = self.path / "metadata.json"
        self.index_path = self.path / "index.bin"
        self.metadata = []

        if self.index_path.exists() and self.meta_path.exists():
            self.index = faiss.read_index(str(self.index_path))
            with open(self.meta_path, "r") as f:
                self.metadata = json.load(f)

    def add(self, vectors: np.ndarray, metadatas: List[Dict]):
        self.index.add(vectors)
        self.metadata.extend(metadatas)
        self._save()

    def _save(self):
        faiss.write_index(self.index, str(self.index_path))
        with open(self.meta_path, "w") as f:
            json.dump(self.metadata, f)

    def search(self, vector: np.ndarray, k=4, chat_id=None, time_window_minutes=120) -> List[Dict]:
        if self.index.ntotal == 0:
            print("[DEBUG] Vector store is empty")
            return []
            
        print(f"[DEBUG] Searching vector store with {self.index.ntotal} total vectors")
        
        # Simple kNN search
        D, I = self.index.search(vector.reshape(1, -1), self.index.ntotal)
        
        current_time = datetime.now()
        results = []
        
        for idx in I[0]:
            if idx >= len(self.metadata):
                continue
                
            m = self.metadata[idx]
            
            # Only filter by chat_id and time
            if chat_id is not None and m["chat_id"] != chat_id:
                continue
                
            try:
                timestamp = datetime.fromisoformat(m["timestamp"])
                time_diff = (current_time - timestamp).total_seconds() / 60
                if time_diff > time_window_minutes:
                    continue
                    
                if m["type"] == "pdf":
                    content = f"[PDF Page {m['page']+1}]: {m['content']}"
                elif m["type"] == "image":
                    content = f"[Image]: {m['description']}"
                else:
                    continue
                    
                results.append({"content": content})
                
                if len(results) >= k:
                    break
                    
            except Exception as e:
                print(f"[DEBUG] Error processing result: {e}")
                continue
                
        print(f"[DEBUG] Returning {len(results)} results")
        return results


store = VectorStore()


def embed_text(text: str) -> Optional[np.ndarray]:
    try:
        r = requests.post("http://localhost:11434/api/embeddings", json={
            "model": "nomic-embed-text",
            "prompt": text
        })
        return np.array(r.json()["embedding"], dtype=np.float32)
    except:
        return None


def encode_image_base64(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()


def process_pdf(path: str, chat_id: str):
    print(f"[DEBUG] Processing PDF: {path}")
    try:
        reader = PdfReader(path)
        print(f"[DEBUG] PDF loaded successfully with {len(reader.pages)} pages")
        chunks, metadatas = [], []
        
        for i, page in enumerate(reader.pages):
            print(f"[DEBUG] Processing page {i+1}")
            text = page.extract_text() or ""
            text = " ".join(text.split())
            if len(text) < 100:
                print(f"[DEBUG] Skipping page {i+1} - insufficient content length")
                continue
                
            for j in range(0, len(text), 1000):
                chunk = text[j:j+1000]
                chunks.append(chunk)
                metadatas.append({
                    "type": "pdf", "chat_id": chat_id, "page": i,
                    "content": chunk, "timestamp": str(datetime.now())
                })
                
        print(f"[DEBUG] Extracted {len(chunks)} chunks from PDF")
        
        if chunks:
            embeddings = []
            for i, c in enumerate(chunks):
                print(f"[DEBUG] Embedding chunk {i+1}/{len(chunks)}")
                vec = embed_text(c)
                if vec is not None:
                    embeddings.append(vec)
                else:
                    print(f"[DEBUG] Failed to embed chunk {i+1}")
                    
            if embeddings:
                print(f"[DEBUG] Adding {len(embeddings)} embeddings to vector store")
                store.add(np.array(embeddings, dtype=np.float32), metadatas)
            else:
                print("[DEBUG] No successful embeddings generated")
        else:
            print("[DEBUG] No chunks extracted from PDF")
            
    except Exception as e:
        print(f"[ERROR] PDF processing failed: {str(e)}")


def process_image(path: str, chat_id: str):
    image_b64 = encode_image_base64(path)
    r = requests.post("http://localhost:11434/api/generate", json={
        "model": "llava",
        "prompt": "Describe this image in detail",
        "images": [image_b64],
        "stream": False
    })
    desc = r.json().get("response", "")
    vec = embed_text(desc)
    if vec is not None:
        store.add(np.array([vec], dtype=np.float32), [{
            "type": "image", "chat_id": chat_id,
            "description": desc,
            "timestamp": str(datetime.now())
        }])


def get_context(query: str, chat_id: str) -> str:
    print(f"[DEBUG] Getting context for query: {query[:100]}...")
    vec = embed_text(query)
    if vec is None:
        print("[DEBUG] Failed to embed query")
        return ""
        
    results = store.search(vec, chat_id=chat_id, k=5)
    print(f"[DEBUG] Found {len(results)} context matches")
    
    if not results:
        return ""
        
    return "\n\n".join(r["content"] for r in results)


def build_prompt(messages, prompt, context=""):
    lines = [f"[INST] <<SYS>>{SYSTEM_PROMPT}<</SYS>>"]
    if context:
        lines.append(f"Context:\n{context}")
    for m in messages:
        if m["sender"] == "user":
            lines.append(f"[INST] {m['text']} [/INST]")
        elif m["sender"] == "bot":
            lines.append(m["text"])
    lines.append(f"[INST] {prompt} [/INST]")
    return "\n".join(lines)


def get_file_path(meta) -> Optional[str]:
    if not meta or "stored_as" not in meta:
        return None
    return os.path.join(UPLOADS_DIR, meta["stored_as"])


def is_image(meta) -> bool:
    return meta and meta.get("content_type", "").startswith("image/")


def generate_llm_response(prompt: str, model_id: str, username: str, chat_id: str, attachment_meta=None) -> dict:
    try:
        file_path = get_file_path(attachment_meta)
        if file_path:
            print(f"[DEBUG] Processing attachment: {file_path}")
            if is_image(attachment_meta):
                print("[DEBUG] Attachment is an image")
                process_image(file_path, chat_id)
            elif file_path.lower().endswith(".pdf"):
                print("[DEBUG] Attachment is a PDF")
                process_pdf(file_path, chat_id)
            else:
                print(f"[DEBUG] Unsupported file type: {attachment_meta.get('content_type', 'unknown')}")

        messages = load_chat_messages(username, chat_id)[-MAX_CONTEXT_MESSAGES:]
        context = get_context(prompt, chat_id)
        is_multimodal = is_image(attachment_meta) and model_id in ("llava", "llama3.2+llava")
        model = "llava" if is_multimodal else "llama3.2"
        payload = {
            "model": model,
            "prompt": prompt if is_multimodal else build_prompt(messages, prompt, context),
            "stream": False
        }

        if is_multimodal:
            payload["images"] = [encode_image_base64(file_path)]

        for _ in range(3):
            try:
                r = requests.post("http://localhost:11434/api/generate", json=payload, timeout=60)
                if r.status_code == 200:
                    return {"text": r.json().get("response", "").strip(), "image": None}
            except:
                time.sleep(1)

        return {"text": "Unable to get response", "image": None}
    except Exception as e:
        print(f"[FATAL] generate_llm_response failed: {e}")
        return {"text": "Unable to get response", "image": None}
        context = get_context(prompt, chat_id)
        is_multimodal = is_image(attachment_meta) and model_id in ("llava", "llama3.2+llava")
        model = "llava" if is_multimodal else "llama3.2"
        payload = {
            "model": model,
            "prompt": prompt if is_multimodal else build_prompt(messages, prompt, context),
            "stream": False
        }

        if is_multimodal:
            payload["images"] = [encode_image_base64(file_path)]

        for _ in range(3):
            try:
                r = requests.post("http://localhost:11434/api/generate", json=payload, timeout=60)
                if r.status_code == 200:
                    return {"text": r.json().get("response", "").strip(), "image": None}
            except:
                time.sleep(1)

        return {"text": "Unable to get response", "image": None}
    except Exception as e:
        print(f"[FATAL] generate_llm_response failed: {e}")
        return {"text": "Unable to get response", "image": None}
