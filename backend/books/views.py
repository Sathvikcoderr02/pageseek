# Views implemented in Step 3 (APIs)
from rest_framework.views import APIView
from rest_framework.response import Response


class BookListView(APIView):
    def get(self, request):
        return Response({"message": "Book list — coming in Step 3"})


class BookDetailView(APIView):
    def get(self, request, pk):
        return Response({"message": f"Book {pk} detail — coming in Step 3"})


class BookRecommendationsView(APIView):
    def get(self, request, pk):
        return Response({"message": f"Recommendations for book {pk} — coming in Step 3"})


class ScrapeView(APIView):
    def post(self, request):
        return Response({"message": "Scrape trigger — coming in Step 3"})


class BookUploadView(APIView):
    def post(self, request):
        return Response({"message": "Book upload — coming in Step 3"})


class ScrapeJobListView(APIView):
    def get(self, request):
        return Response({"message": "Scrape jobs — coming in Step 3"})


class ScrapeJobDetailView(APIView):
    def get(self, request, pk):
        return Response({"message": f"Scrape job {pk} — coming in Step 3"})
