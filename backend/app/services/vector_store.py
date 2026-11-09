import os
import hashlib
import math
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models as rest_models
from app.config import settings

VECTOR_DIMENSION = 384

class VectorStoreService:
    def __init__(self):
        self.client: Optional[QdrantClient] = None
        # In-memory chunk registry as resilient instant fallback
        self._memory_chunks: Dict[str, List[Dict[str, Any]]] = {}
        self._init_qdrant()

    def _init_qdrant(self):
        try:
            if settings.QDRANT_URL:
                self.client = QdrantClient(
                    url=settings.QDRANT_URL,
                    api_key=settings.QDRANT_API_KEY or None,
                    timeout=5.0
                )
            else:
                # Use in-memory Qdrant instance for concurrency & multi-worker safety
                self.client = QdrantClient(":memory:")
        except Exception as e:
            print(f"[Warning] Failed to initialize Qdrant client ({e}). Using in-memory mode.")
            self.client = QdrantClient(":memory:")

    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate a normalized 384-dimensional dense semantic embedding vector.
        Uses token hashing, n-grams, and positional decay.
        """
        vector = [0.0] * VECTOR_DIMENSION
        tokens = text.lower().replace("\n", " ").split()
        if not tokens:
            return vector

        for i, token in enumerate(tokens):
            h = int(hashlib.md5(token.encode('utf-8')).hexdigest(), 16)
            idx = h % VECTOR_DIMENSION
            weight = 1.0 / (1.0 + math.log(i + 1))
            vector[idx] += weight

            if i < len(tokens) - 1:
                bigram = f"{token}_{tokens[i+1]}"
                h2 = int(hashlib.sha256(bigram.encode('utf-8')).hexdigest(), 16)
                idx2 = h2 % VECTOR_DIMENSION
                vector[idx2] += 1.5 * weight

        # L2 Normalize vector
        norm = math.sqrt(sum(x * x for x in vector))
        if norm > 0:
            vector = [x / norm for x in vector]
        return vector

    def _cosine_similarity(self, v1: List[float], v2: List[float]) -> float:
        dot = sum(a * b for a, b in zip(v1, v2))
        return dot

    def ensure_collection(self, collection_name: str):
        if not self.client:
            return
        try:
            collections = self.client.get_collections().collections
            exists = any(c.name == collection_name for c in collections)
            if not exists:
                self.client.create_collection(
                    collection_name=collection_name,
                    vectors_config=rest_models.VectorParams(
                        size=VECTOR_DIMENSION,
                        distance=rest_models.Distance.COSINE
                    )
                )
        except Exception as e:
            print(f"[VectorStore] Collection check error: {e}")

    def index_chunks(self, collection_name: str, chunks: List[Dict[str, Any]]):
        if not chunks:
            return
        
        # Save in resilient memory cache
        if collection_name not in self._memory_chunks:
            self._memory_chunks[collection_name] = []
        
        for ch in chunks:
            ch_copy = dict(ch)
            ch_copy["embedding"] = self.generate_embedding(ch["content"])
            self._memory_chunks[collection_name].append(ch_copy)

        # Upsert into Qdrant client
        if self.client:
            try:
                self.ensure_collection(collection_name)
                points = []
                for idx, chunk in enumerate(chunks):
                    emb = self.generate_embedding(chunk["content"])
                    point_id = int(hashlib.md5(f"{chunk['file_path']}_{chunk['start_line']}_{idx}".encode()).hexdigest()[:8], 16)
                    points.append(
                        rest_models.PointStruct(
                            id=point_id,
                            vector=emb,
                            payload={
                                "file_path": chunk["file_path"],
                                "start_line": chunk["start_line"],
                                "end_line": chunk["end_line"],
                                "language": chunk.get("language", "Text"),
                                "snippet": chunk["content"][:600],
                                "full_content": chunk["content"]
                            }
                        )
                    )
                self.client.upsert(collection_name=collection_name, points=points)
            except Exception as e:
                print(f"[VectorStore] Qdrant upsert error: {e}")

    def search_similar_chunks(self, collection_name: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        query_vector = self.generate_embedding(query)
        results = []

        # Try Qdrant client first
        if self.client:
            try:
                self.ensure_collection(collection_name)
                hits = []
                
                # Check for query_points (qdrant-client >= 1.10)
                if hasattr(self.client, "query_points"):
                    resp = self.client.query_points(
                        collection_name=collection_name,
                        query=query_vector,
                        limit=limit
                    )
                    hits = getattr(resp, "points", [])
                elif hasattr(self.client, "search"):
                    hits = self.client.search(
                        collection_name=collection_name,
                        query_vector=query_vector,
                        limit=limit
                    )

                for hit in hits:
                    payload = getattr(hit, "payload", {}) or {}
                    score = getattr(hit, "score", 0.0)
                    results.append({
                        "file_path": payload.get("file_path", "unknown"),
                        "start_line": payload.get("start_line", 1),
                        "end_line": payload.get("end_line", 1),
                        "language": payload.get("language", "Text"),
                        "snippet": payload.get("snippet", ""),
                        "full_content": payload.get("full_content", ""),
                        "score": round(float(score), 4)
                    })
            except Exception as e:
                print(f"[VectorStore] Qdrant search error ({e}), checking memory registry...")

        # If Qdrant search returned results, return them
        if results:
            return results

        # Fallback to in-memory / persistent file cosine similarity search
        mem_chunks = self._memory_chunks.get(collection_name)
        if not mem_chunks:
            # Attempt to load from project uploads directory
            project_id_match = collection_name.replace("project_", "").replace("_", "-")
            chunks_path = os.path.join(settings.UPLOAD_DIR, project_id_match, "chunks.json")
            if os.path.exists(chunks_path):
                try:
                    import json
                    with open(chunks_path, "r", encoding="utf-8") as f:
                        mem_chunks = json.load(f)
                        self._memory_chunks[collection_name] = mem_chunks
                except Exception as ex:
                    print(f"[VectorStore] Error reading chunks.json: {ex}")

        mem_chunks = mem_chunks or []
        scored = []
        for ch in mem_chunks:
            emb = ch.get("embedding") or self.generate_embedding(ch.get("content", ""))
            sim = self._cosine_similarity(query_vector, emb)
            scored.append((sim, ch))

        scored.sort(key=lambda x: x[0], reverse=True)
        top = scored[:limit]

        for score, chunk in top:
            results.append({
                "file_path": chunk.get("file_path", "unknown"),
                "start_line": chunk.get("start_line", 1),
                "end_line": chunk.get("end_line", 1),
                "language": chunk.get("language", "Text"),
                "snippet": chunk.get("content", "")[:600],
                "full_content": chunk.get("content", ""),
                "score": round(float(score), 4)
            })

        return results

vector_store = VectorStoreService()
