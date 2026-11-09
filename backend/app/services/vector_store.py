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
                # Use local persistent storage or in-memory mode
                os.makedirs(settings.QDRANT_STORAGE_PATH, exist_ok=True)
                self.client = QdrantClient(path=settings.QDRANT_STORAGE_PATH)
        except Exception as e:
            print(f"[Warning] Failed to initialize Qdrant storage ({e}). Falling back to in-memory Qdrant instance.")
            self.client = QdrantClient(":memory:")

    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate a deterministic 384-dimensional normalized dense embedding vector.
        Uses semantic token hashing and positional weights for fast, zero-dependency RAG.
        """
        vector = [0.0] * VECTOR_DIMENSION
        tokens = text.lower().replace("\n", " ").split()
        if not tokens:
            return vector

        # Combine token hashes and bigrams to capture semantics
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

    def ensure_collection(self, collection_name: str):
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
            print(f"[VectorStore] Collection check/create error: {e}")

    def index_chunks(self, collection_name: str, chunks: List[Dict[str, Any]]):
        if not chunks or not self.client:
            return
        
        self.ensure_collection(collection_name)
        points = []
        for idx, chunk in enumerate(chunks):
            embedding = self.generate_embedding(chunk["content"])
            point_id = int(hashlib.md5(f"{chunk['file_path']}_{chunk['start_line']}_{idx}".encode()).hexdigest()[:8], 16)
            
            points.append(
                rest_models.PointStruct(
                    id=point_id,
                    vector=embedding,
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

        # Upsert in batches of 50
        batch_size = 50
        for i in range(0, len(points), batch_size):
            batch = points[i:i + batch_size]
            self.client.upsert(
                collection_name=collection_name,
                points=batch
            )

    def search_similar_chunks(self, collection_name: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        if not self.client:
            return []
        
        try:
            self.ensure_collection(collection_name)
            query_vector = self.generate_embedding(query)
            
            search_result = self.client.search(
                collection_name=collection_name,
                query_vector=query_vector,
                limit=limit
            )

            results = []
            for hit in search_result:
                payload = hit.payload or {}
                results.append({
                    "file_path": payload.get("file_path", "unknown"),
                    "start_line": payload.get("start_line", 1),
                    "end_line": payload.get("end_line", 1),
                    "language": payload.get("language", "Text"),
                    "snippet": payload.get("snippet", ""),
                    "full_content": payload.get("full_content", ""),
                    "score": round(float(hit.score), 4)
                })
            return results
        except Exception as e:
            print(f"[VectorStore] Search error: {e}")
            return []

vector_store = VectorStoreService()
