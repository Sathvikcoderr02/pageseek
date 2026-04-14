import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from books.models import Book, ChatHistory
from rag.pipeline import embed_book, embed_all_books, rag_query


class AskQuestionView(APIView):
    """
    POST /api/rag/ask/

    Body:
        {
            "question": "What is the best mystery book?",
            "session_id": "optional-session-id",
            "top_k": 5
        }

    Returns:
        {
            "answer": str,
            "sources": [...],
            "chunks_used": int,
            "session_id": str
        }
    """

    def post(self, request):
        question = request.data.get("question", "").strip()
        if not question:
            return Response(
                {"error": "question is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session_id = request.data.get("session_id") or str(uuid.uuid4())
        top_k = int(request.data.get("top_k", 5))

        try:
            result = rag_query(question=question, session_id=session_id, top_k=top_k)
            return Response({**result, "session_id": session_id})
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ChatHistoryView(APIView):
    """
    GET /api/rag/history/?session_id=<id>

    Returns the Q&A history for a session.
    """

    def get(self, request):
        session_id = request.query_params.get("session_id")
        qs = ChatHistory.objects.all()
        if session_id:
            qs = qs.filter(session_id=session_id)

        data = [
            {
                "id": h.id,
                "session_id": h.session_id,
                "question": h.question,
                "answer": h.answer,
                "sources": h.sources,
                "created_at": h.created_at,
            }
            for h in qs[:100]
        ]
        return Response({"results": data, "count": len(data)})


class EmbedBookView(APIView):
    """
    POST /api/rag/embed/<book_id>/

    Embeds a single book into ChromaDB.
    """

    def post(self, request, book_id):
        book = get_object_or_404(Book, pk=book_id)
        try:
            chunks_created = embed_book(book)
            return Response({
                "message": f"Book '{book.title}' embedded successfully.",
                "chunks_created": chunks_created,
                "book_id": book.id,
            })
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class EmbedAllBooksView(APIView):
    """
    POST /api/rag/embed/all/

    Embeds all un-embedded books. Pass {"force": true} to re-embed all.
    """

    def post(self, request):
        force = request.data.get("force", False)
        try:
            result = embed_all_books(force=force)
            return Response({
                "message": "Embedding complete.",
                **result,
            })
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
