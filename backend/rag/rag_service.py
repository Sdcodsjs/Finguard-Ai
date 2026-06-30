"""
FinGuard AI — RAG Service
LangChain + ChromaDB + Nebius Embedding Model.
All embeddings use the configured NEBIUS_EMBEDDING_MODEL.
"""
import os
import json
import hashlib
import structlog
from typing import Any
from config import get_settings
from services.nebius_client import get_embeddings

log = structlog.get_logger()
settings = get_settings()

# Lazy-loaded ChromaDB client
_chroma_client = None
_collections: dict[str, Any] = {}


def _get_chroma():
    """Singleton ChromaDB client."""
    global _chroma_client
    if _chroma_client is None:
        try:
            import chromadb
            from chromadb.config import Settings as ChromaSettings

            os.makedirs(settings.chroma_persist_dir, exist_ok=True)
            _chroma_client = chromadb.PersistentClient(
                path=settings.chroma_persist_dir,
            )
            log.info("chromadb_initialized", path=settings.chroma_persist_dir)
        except ImportError:
            log.error("chromadb_not_installed")
            raise
    return _chroma_client


def _collection_name(report_id: str) -> str:
    """Each report gets its own ChromaDB collection."""
    return f"report_{report_id.replace('-', '_')}"


try:
    from chromadb import EmbeddingFunction, Documents, Embeddings
    _chroma_ef_base = EmbeddingFunction
except ImportError:
    _chroma_ef_base = object  # type: ignore


class NebiusEmbeddingFunction(_chroma_ef_base):
    """
    ChromaDB-compatible embedding function using Nebius Token Factory.
    Uses NEBIUS_EMBEDDING_MODEL — fully configurable, never hardcoded.
    Subclasses chromadb.EmbeddingFunction for API compatibility.
    """
    def __call__(self, input: list[str]) -> list[list[float]]:  # type: ignore[override]
        return get_embeddings(input)


def embed_and_store(
    report_id: str,
    chunks: list[dict],
    company_name: str = "",
) -> int:
    """
    Embed text chunks and store in ChromaDB.
    Returns number of chunks stored.

    Each chunk: {"text": str, "page": int, "chunk_index": int}
    """
    if not chunks:
        return 0

    client = _get_chroma()
    col_name = _collection_name(report_id)

    # Delete existing collection if re-embedding
    try:
        client.delete_collection(col_name)
    except Exception:
        pass

    collection = client.create_collection(
        name=col_name,
        embedding_function=NebiusEmbeddingFunction(),
        metadata={"report_id": report_id, "company": company_name},
    )
    _collections[col_name] = collection

    # Batch embed (ChromaDB accepts batches of up to 5000)
    batch_size = 50
    total_stored = 0

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        ids = [f"{report_id}_chunk_{c['chunk_index']}" for c in batch]
        texts = [c["text"] for c in batch]
        metadatas = [
            {"page": c.get("page", 0), "chunk_index": c.get("chunk_index", 0)}
            for c in batch
        ]

        collection.add(
            ids=ids,
            documents=texts,
            metadatas=metadatas,
        )
        total_stored += len(batch)
        log.info("rag_batch_stored", report_id=report_id, batch=i // batch_size, count=len(batch))

    log.info("rag_embed_complete", report_id=report_id, total_chunks=total_stored)
    return total_stored


def semantic_search(
    report_id: str,
    query: str,
    top_k: int = 5,
) -> list[dict]:
    """
    Semantic search over a report's embedded chunks.
    Returns list of {text, page, chunk_index, distance}.
    """
    client = _get_chroma()
    col_name = _collection_name(report_id)

    try:
        collection = client.get_collection(
            name=col_name,
            embedding_function=NebiusEmbeddingFunction(),
        )
    except Exception:
        log.warning("rag_collection_not_found", report_id=report_id)
        return []

    results = collection.query(
        query_texts=[query],
        n_results=min(top_k, collection.count()),
    )

    chunks = []
    if results and results["documents"]:
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            chunks.append({
                "text": doc,
                "page": meta.get("page", 0),
                "chunk_index": meta.get("chunk_index", 0),
                "distance": round(dist, 4),
            })

    log.info("rag_search", report_id=report_id, query=query[:50], results=len(chunks))
    return chunks


def retrieve_context(
    report_id: str,
    queries: list[str],
    top_k_per_query: int = 3,
) -> str:
    """
    Retrieve context for multiple queries, deduplicated.
    Used to build the RAG context for the multi-agent system.
    """
    seen_chunks = set()
    context_parts = []

    for query in queries:
        chunks = semantic_search(report_id, query, top_k=top_k_per_query)
        for chunk in chunks:
            chunk_id = chunk.get("chunk_index", 0)
            if chunk_id not in seen_chunks:
                seen_chunks.add(chunk_id)
                context_parts.append(
                    f"[Page {chunk['page']}] {chunk['text']}"
                )

    return "\n\n---\n\n".join(context_parts)


def delete_report_collection(report_id: str):
    """Remove a report's vector collection (cleanup on report deletion)."""
    try:
        client = _get_chroma()
        client.delete_collection(_collection_name(report_id))
        log.info("rag_collection_deleted", report_id=report_id)
    except Exception as e:
        log.warning("rag_delete_error", error=str(e), report_id=report_id)


# Standard RAG queries for financial analysis
FINANCIAL_RAG_QUERIES = [
    "revenue profit net income earnings",
    "cash flow operating activities",
    "total debt borrowings liabilities",
    "related party transactions",
    "auditor report opinion",
    "management discussion analysis",
    "risk factors material uncertainty",
    "ESG governance sustainability BRSR",
    "promoter shareholding insider",
]
