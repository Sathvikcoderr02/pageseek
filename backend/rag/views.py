# Views implemented in Step 4 (RAG)
from rest_framework.views import APIView
from rest_framework.response import Response


class AskQuestionView(APIView):
    def post(self, request):
        return Response({"message": "RAG ask — coming in Step 4"})


class ChatHistoryView(APIView):
    def get(self, request):
        return Response({"message": "Chat history — coming in Step 4"})


class EmbedBookView(APIView):
    def post(self, request, book_id):
        return Response({"message": f"Embed book {book_id} — coming in Step 4"})


class EmbedAllBooksView(APIView):
    def post(self, request):
        return Response({"message": "Embed all books — coming in Step 4"})
