"""
RAG Pipeline — Retrieval-Augmented Generation for book Q&A.

Flow:
  1. Chunk book text (description + summary + genre/sentiment metadata)
  2. Generate embeddings via sentence-transformers (local, no API key needed)
  3. Store chunks + embeddings in ChromaDB
  4. At query time: embed question → similarity search → build context → LLM answer
"""

import logging
import os
import uuid
from typing import Optional

from django.conf import settings

logger = logging.getLogger(__name__)

# Chunk settings
CHUNK_SIZE = 400        # characters per chunk
CHUNK_OVERLAP = 80      # overlap between adjacent chunks
TOP_K = 5               # number of chunks to retrieve per query


# ── Lazy singletons ───────────────────────────────────────────────────────────

_chroma_client = None
_chroma_collection = None
_embedding_fn = None


def _get_embedding_fn():
    """
    Use ChromaDB's built-in default embedding function (all-MiniLM-L6-v2 via ONNX).
    No PyTorch or sentence-transformers import needed.
    """
    global _embedding_fn
    if _embedding_fn is None:
        from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
        logger.info("Loading ChromaDB default embedding function (ONNX)...")
        _embedding_fn = DefaultEmbeddingFunction()
    return _embedding_fn


def _get_chroma_collection():
    global _chroma_client, _chroma_collection
    if _chroma_collection is None:
        import chromadb
        db_path = getattr(settings, "CHROMA_DB_PATH", "./chroma_db")
        _chroma_client = chromadb.PersistentClient(path=db_path)
        _chroma_collection = _chroma_client.get_or_create_collection(
            name="books",
            metadata={"hnsw:space": "cosine"},
            embedding_function=_get_embedding_fn(),
        )
        logger.info(f"ChromaDB collection 'books' ready at {db_path}")
    return _chroma_collection


# ── Chunking ──────────────────────────────────────────────────────────────────

def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """
    Split text into overlapping fixed-size character chunks.
    Uses sentence-aware splitting to avoid cutting mid-sentence where possible.
    """
    if not text or not text.strip():
        return []

    # Split into sentences first (simple heuristic)
    import re
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())

    chunks = []
    current = ""

    for sentence in sentences:
        if len(current) + len(sentence) + 1 <= chunk_size:
            current = (current + " " + sentence).strip()
        else:
            if current:
                chunks.append(current)
            # Start new chunk with overlap from previous
            if current and overlap > 0:
                overlap_text = current[-overlap:]
                current = (overlap_text + " " + sentence).strip()
            else:
                current = sentence

    if current:
        chunks.append(current)

    return chunks


def build_book_text(book) -> str:
    """
    Combine all book fields into a single rich text for embedding.
    More context = better retrieval accuracy.
    """
    parts = []

    if book.title:
        parts.append(f"Title: {book.title}")
    if book.author:
        parts.append(f"Author: {book.author}")
    if book.genre:
        parts.append(f"Genre: {book.genre}")
    if book.ai_genre:
        parts.append(f"AI Genre: {book.ai_genre}")
    if book.rating:
        parts.append(f"Rating: {book.rating} out of 5")
    if book.sentiment:
        parts.append(f"Tone: {book.sentiment}")
    if book.description:
        parts.append(f"Description: {book.description}")
    if book.summary:
        parts.append(f"Summary: {book.summary}")

    return "\n".join(parts)


# ── Embedding & Indexing ──────────────────────────────────────────────────────

def embed_book(book) -> int:
    """
    Chunk a book's text, generate embeddings, and store in ChromaDB.
    Also saves BookChunk records to the database.

    Returns the number of chunks created.
    """
    from books.models import BookChunk

    full_text = build_book_text(book)
    chunks = chunk_text(full_text)

    if not chunks:
        logger.warning(f"No text to embed for book: {book.title}")
        return 0

    collection = _get_chroma_collection()

    # Remove existing chunks for this book (re-embed cleanly)
    existing_ids = [c.chroma_id for c in BookChunk.objects.filter(book=book)]
    if existing_ids:
        collection.delete(ids=existing_ids)
        BookChunk.objects.filter(book=book).delete()

    chroma_ids = []
    db_chunks = []

    for i, chunk in enumerate(chunks):
        chroma_id = f"book-{book.id}-chunk-{i}-{uuid.uuid4().hex[:8]}"
        chroma_ids.append(chroma_id)

        # Pass documents directly — ChromaDB auto-embeds using the collection's embedding_function
        collection.add(
            ids=[chroma_id],
            documents=[chunk],
            metadatas=[{
                "book_id": book.id,
                "book_title": book.title,
                "chunk_index": i,
                "genre": book.ai_genre or book.genre or "",
            }],
        )

        db_chunks.append(BookChunk(
            book=book,
            chunk_index=i,
            content=chunk,
            chroma_id=chroma_id,
        ))

    BookChunk.objects.bulk_create(db_chunks)

    book.is_embedded = True
    book.save(update_fields=["is_embedded"])

    logger.info(f"Embedded '{book.title}' → {len(chunks)} chunks")
    return len(chunks)


def embed_all_books(force: bool = False) -> dict:
    """
    Embed all books that haven't been embedded yet.
    Set force=True to re-embed everything.
    """
    from books.models import Book

    qs = Book.objects.all() if force else Book.objects.filter(is_embedded=False)
    total = qs.count()
    logger.info(f"Embedding {total} book(s)...")

    success, failed = 0, 0
    for book in qs:
        try:
            embed_book(book)
            success += 1
        except Exception as e:
            logger.error(f"Failed to embed '{book.title}': {e}")
            failed += 1

    return {"total": total, "success": success, "failed": failed}


# ── Retrieval ─────────────────────────────────────────────────────────────────

def retrieve_chunks(question: str, top_k: int = TOP_K, genre_filter: Optional[str] = None) -> list[dict]:
    """
    Embed the question and find the most similar book chunks.

    Returns list of:
        {
            "chunk_text": str,
            "book_id": int,
            "book_title": str,
            "chunk_index": int,
            "distance": float,
        }
    """
    collection = _get_chroma_collection()

    if collection.count() == 0:
        return []

    where_filter = {"genre": genre_filter} if genre_filter else None

    # Pass query_texts — ChromaDB auto-embeds using the collection's embedding_function
    results = collection.query(
        query_texts=[question],
        n_results=min(top_k, collection.count()),
        where=where_filter,
        include=["documents", "metadatas", "distances"],
    )

    chunks = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        chunks.append({
            "chunk_text": doc,
            "book_id": meta.get("book_id"),
            "book_title": meta.get("book_title", ""),
            "chunk_index": meta.get("chunk_index", 0),
            "distance": round(dist, 4),
        })

    return chunks


# ── Answer Generation ─────────────────────────────────────────────────────────

def generate_answer(question: str, chunks: list[dict]) -> str:
    """
    Given a question and retrieved chunks, generate a grounded answer using the LLM.
    """
    from books.ai_insights import _chat

    if not chunks:
        return "I don't have enough information in the book collection to answer that question."

    # Build context block
    context_parts = []
    for i, c in enumerate(chunks, 1):
        context_parts.append(
            f"[Source {i}: {c['book_title']}]\n{c['chunk_text']}"
        )
    context = "\n\n".join(context_parts)

    system = (
        "You are a knowledgeable book assistant. Answer the user's question using ONLY "
        "the provided book excerpts. Cite sources using [Source N] notation. "
        "If the answer is not in the excerpts, say so honestly. "
        "Keep answers concise and helpful."
    )

    user = (
        f"Question: {question}\n\n"
        f"Book excerpts:\n{context}\n\n"
        "Answer (with source citations):"
    )

    return _chat(system, user, max_tokens=600)


# ── Full RAG Query ────────────────────────────────────────────────────────────

def rag_query(question: str, session_id: str = "default", top_k: int = TOP_K) -> dict:
    """
    Full RAG pipeline: retrieve → generate → save to chat history.

    Returns:
        {
            "answer": str,
            "sources": [{"book_id", "book_title", "chunk_text", "distance"}],
            "chunks_used": int,
        }
    """
    from books.models import ChatHistory

    chunks = retrieve_chunks(question, top_k=top_k)
    answer = generate_answer(question, chunks)

    sources = [
        {
            "book_id": c["book_id"],
            "book_title": c["book_title"],
            "chunk_text": c["chunk_text"][:200],
            "distance": c["distance"],
        }
        for c in chunks
    ]

    # Persist to chat history
    ChatHistory.objects.create(
        session_id=session_id,
        question=question,
        answer=answer,
        sources=sources,
    )

    return {
        "answer": answer,
        "sources": sources,
        "chunks_used": len(chunks),
    }
