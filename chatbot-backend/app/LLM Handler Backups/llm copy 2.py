import os
os.environ['KMP_DUPLICATE_LIB_OK']='TRUE'  # Fix OpenMP error

import requests
import json
import base64
from pathlib import Path
from typing import Dict, List, Optional
import numpy as np
import faiss
from datetime import datetime
from app.chat_store import load_chat_messages
import torch
from concurrent.futures import ThreadPoolExecutor
import concurrent.futures
import time

MAX_CONTEXT_MESSAGES = 6
SYSTEM_PROMPT = """You are a helpful AI assistant.
For all questions, respond with a clear, natural text answer.
You have access to previous images and PDFs from the conversation - use them when referenced.
When discussing previous images or PDFs, include relevant details from your memory.
Keep responses focused and relevant to the current query."""

UPLOADS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
VECTOR_STORE_DIR = Path("d:/Repositories/Local-Chatbot/chatbot-backend/app/vector_store")

# Add GPU support if available
USE_GPU = torch.cuda.is_available()
if USE_GPU:
    import faiss.contrib.torch_utils

class VectorStorage:
    def __init__(self, dimension: int, store_path: str):
        self.dimension = dimension
        self.store_path = Path(store_path)
        self.store_path.mkdir(parents=True, exist_ok=True)
        
        # Use GPU if available
        self.index = faiss.IndexFlatL2(dimension)
        if USE_GPU:
            res = faiss.StandardGpuResources()
            self.index = faiss.index_cpu_to_gpu(res, 0, self.index)
            print("[INFO] Using GPU for vector storage")

        self.metadata: List[Dict] = []
        
        # Load existing index if available
        index_path = self.store_path / "vectors.index"
        meta_path = self.store_path / "metadata.json"
        if index_path.exists() and meta_path.exists():
            self.index = faiss.read_index(str(index_path))
            with open(meta_path, 'r') as f:
                self.metadata = json.load(f)

    def add_vector(self, vector: np.ndarray, metadata: Dict):
        self.index.add(vector.reshape(1, -1))
        self.metadata.append(metadata)
        self._save_state()

    def add_vectors_batch(self, vectors: np.ndarray, metadata_list: List[Dict]):
        """Add multiple vectors and their metadata in one batch"""
        if len(vectors) != len(metadata_list):
            raise ValueError("Number of vectors and metadata entries must match")
        
        self.index.add(vectors)
        self.metadata.extend(metadata_list)
        self._save_state()

    def search(self, query_vector: np.ndarray, k: int = 3) -> List[Dict]:
        D, I = self.index.search(query_vector.reshape(1, -1), k)
        return [self.metadata[i] for i in I[0] if i != -1]

    def _save_state(self):
        faiss.write_index(self.index, str(self.store_path / "vectors.index"))
        with open(self.store_path / "metadata.json", 'w') as f:
            json.dump(self.metadata, f)

class MemoryManager:
    def __init__(self):
        self.store_path = VECTOR_STORE_DIR
        self.store_path.mkdir(parents=True, exist_ok=True)
        
        # Update dimension to match nomic-embed-text (768)
        self.store = VectorStorage(768, self.store_path)

    def _get_ollama_embedding(self, text: str, model="nomic-embed-text") -> Optional[np.ndarray]:
        try:
            response = requests.post(
                "http://localhost:11434/api/embeddings",
                json={"model": model, "prompt": text}
            )
            if response.status_code == 200 and "embedding" in response.json():
                return np.array(response.json()["embedding"], dtype=np.float32)
            print(f"[WARNING] Embedding failed: {response.text}")
            return None
        except Exception as e:
            print(f"[ERROR] Embedding error: {e}")
            return None

    def _get_ollama_embeddings_batch(self, texts: List[str], model="nomic-embed-text", timeout=30) -> Optional[np.ndarray]:
        """Get embeddings for multiple texts with timeout and parallel processing"""
        try:
            embeddings = []
            batch_size = 5  # Smaller batch size for better responsiveness
            
            def get_single_embedding(text):
                try:
                    response = requests.post(
                        "http://localhost:11434/api/embeddings",
                        json={"model": model, "prompt": text},
                        timeout=timeout
                    )
                    if response.status_code == 200 and "embedding" in response.json():
                        return response.json()["embedding"]
                    return None
                except Exception:
                    return None

            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                print(f"[INFO] Processing embedding batch {i//batch_size + 1}/{(len(texts) + batch_size - 1)//batch_size}")
                
                # Process batch in parallel
                with ThreadPoolExecutor(max_workers=5) as executor:
                    futures = [executor.submit(get_single_embedding, text) for text in batch]
                    
                    for future in concurrent.futures.as_completed(futures):
                        result = future.result()
                        if result is not None:
                            embeddings.append(result)
                        else:
                            print("[WARNING] Failed to get embedding for batch item")
                            return None
                
                # Add small delay between batches to prevent overload
                time.sleep(0.1)
            
            if len(embeddings) == len(texts):
                return np.array(embeddings, dtype=np.float32)
            return None
            
        except Exception as e:
            print(f"[ERROR] Batch embedding error: {e}")
            return None

    def process_image(self, image_path: str, chat_id: str):
        try:
            print(f"[INFO] Processing image: {image_path}")
            with open(image_path, 'rb') as img_file:
                image_b64 = base64.b64encode(img_file.read()).decode()
            
            # Get initial description from llava
            desc_response = requests.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "llava",
                    "prompt": "Describe this image in detail",
                    "images": [image_b64]
                }
            )
            
            if desc_response.status_code != 200:
                raise Exception("Failed to get image description")

            description = desc_response.json().get("response", "")
            
            # Get embedding for the description
            embedding = self._get_ollama_embedding(description)
            if embedding is None:
                raise Exception("Failed to get embedding for image description")

            self.store.add_vector(embedding, {
                'type': 'image',
                'chat_id': chat_id,
                'path': str(image_path),
                'description': description,
                'timestamp': str(datetime.now())
            })
            print(f"[INFO] Processed image: {image_path}")
            
        except Exception as e:
            print(f"[ERROR] Image processing failed: {e}")

    def process_pdf(self, pdf_path: str, chat_id: str):
        try:
            print(f"[INFO] Processing PDF: {pdf_path}")
            from PyPDF2 import PdfReader
            reader = PdfReader(pdf_path)
            
            # Process all pages first
            all_chunks = []
            all_metadata = []
            chunk_size = 1500  # Larger chunk size
            
            # Pre-process text to remove unnecessary whitespace
            def clean_text(text):
                return " ".join(text.split())
            
            for page_num, page in enumerate(reader.pages):
                text = clean_text(page.extract_text())
                if not text.strip():
                    continue
                
                chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
                print(f"[INFO] Processing page {page_num + 1}/{len(reader.pages)} - {len(chunks)} chunks")
                
                for chunk_num, chunk in enumerate(chunks):
                    if len(chunk.strip()) < 50:  # Skip very small chunks
                        continue
                    all_chunks.append(chunk)
                    all_metadata.append({
                        'type': 'pdf',
                        'chat_id': chat_id,
                        'path': str(pdf_path),
                        'page': page_num,
                        'chunk': chunk_num,
                        'content': chunk,
                        'timestamp': str(datetime.now())
                    })

            print(f"[INFO] Getting embeddings for {len(all_chunks)} chunks...")
            embeddings = self._get_ollama_embeddings_batch(all_chunks)
            
            if embeddings is not None:
                self.store.add_vectors_batch(embeddings, all_metadata)
                print(f"[INFO] Successfully processed PDF")
                return True
            
            print("[ERROR] Failed to get embeddings for PDF")
            return False
            
        except Exception as e:
            print(f"[ERROR] PDF processing failed: {e}")
            return False

    def get_relevant_context(self, query: str, chat_id: str) -> str:
        try:
            query_embedding = self._get_ollama_embedding(query)
            if query_embedding is None:
                return ""

            items = self.store.search(query_embedding, k=5)
            
            context_parts = []
            for item in items:
                if item['chat_id'] != chat_id:
                    continue
                    
                if item['type'] == 'pdf':
                    context_parts.append(
                        f"[PDF Content (page {item['page']+1})]: {item['content']}"
                    )
                elif item['type'] == 'image':
                    context_parts.append(
                        f"[Image Description]: {item['description']}"
                    )
            
            if context_parts:
                return "Context from your uploaded files:\n" + "\n\n".join(context_parts)
            return ""
            
        except Exception as e:
            print(f"[ERROR] Context retrieval failed: {e}")
            return ""

# Initialize global memory manager
memory_manager = MemoryManager()

# Helper functions
def is_image_file(file_meta):
    if not file_meta:
        return False
    return file_meta.get("content_type", "").startswith("image/")

def get_file_path(file_meta):
    if not file_meta or "stored_as" not in file_meta:
        return None
    return os.path.join(UPLOADS_DIR, file_meta["stored_as"])

def encode_image_to_base64(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def build_llama_prompt(messages, prompt, context=""):
    prompt_lines = []
    prompt_lines.append(f"[INST] <<SYS>>{SYSTEM_PROMPT}<</SYS>>")
    
    if context:
        prompt_lines.append(f"Reference context:\n{context}\n")
        prompt_lines.append("Answer based on the above context and previous conversation:")
    
    for msg in messages:
        if msg.get("sender") == "user":
            prompt_lines.append(f"[INST] {msg.get('text', '').strip()} [/INST]")
        elif msg.get("sender") == "bot":
            prompt_lines.append(msg.get("text", "").strip())

    prompt_lines.append(f"[INST] {prompt.strip()} [/INST]")
    return "\n".join(prompt_lines)

def generate_llm_response(prompt: str, model_id: str, username: str, chat_id: str, attachment_meta=None) -> dict:
    try:
        all_messages = load_chat_messages(username, chat_id)
        messages = all_messages[-MAX_CONTEXT_MESSAGES:] if MAX_CONTEXT_MESSAGES > 0 else []

        # Process new attachments
        if attachment_meta:
            file_path = get_file_path(attachment_meta)
            print(f"[INFO] Processing attachment: {file_path}")
            
            if file_path:
                if is_image_file(attachment_meta):
                    memory_manager.process_image(file_path, chat_id)
                elif file_path.lower().endswith('.pdf'):
                    memory_manager.process_pdf(file_path, chat_id)
                else:
                    print(f"[WARNING] Unsupported file type: {attachment_meta.get('content_type')}")

        # Get relevant context
        context = memory_manager.get_relevant_context(prompt, chat_id)

        # Handle response generation
        image_file_meta = attachment_meta
        has_image = is_image_file(image_file_meta)
        api_model = model_id
        images_param = None

        if model_id in ("llama3.2", "llava", "llama3.2+llava"):
            if has_image:
                if model_id == "llama3.2+llava":
                    api_model = "llava"
                image_path = get_file_path(image_file_meta)
                images_param = [encode_image_to_base64(image_path)]
                full_prompt = prompt.strip()
            else:
                if model_id == "llama3.2+llava":
                    api_model = "llama3.2"
                full_prompt = build_llama_prompt(messages, prompt, context)
        else:
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
                return {"text": "Unable to get response", "image": None}

            return {
                "text": response.json().get("response", "").strip() or "Unable to get response",
                "image": None
            }

        except Exception as e:
            print(f"[EXCEPTION] Exception during generate_llm_response: {e}")
            return {"text": "Unable to get response", "image": None}
    except Exception as e:
        print(f"[ERROR] Response generation failed: {e}")
        return {"text": "Unable to get response", "image": None}
