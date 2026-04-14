import threading
import logging
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination

from .models import Book, ScrapeJob, RecommendationTag
from .serializers import (
    BookListSerializer,
    BookDetailSerializer,
    BookUploadSerializer,
    ScrapeJobSerializer,
)

logger = logging.getLogger(__name__)


class BookPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


# ── Book List ─────────────────────────────────────────────────────────────────

class BookListView(APIView):
    """
    GET /api/books/
    Query params:
        search      — filter by title/author
        genre       — filter by ai_genre
        sentiment   — filter by sentiment (positive/neutral/negative)
        ordering    — rating | -rating | title | -created_at (default)
        page        — page number
        page_size   — results per page (default 20)
    """

    def get(self, request):
        qs = Book.objects.prefetch_related("tags").all()

        # Filters
        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(title__icontains=search) | qs.filter(author__icontains=search)

        genre = request.query_params.get("genre", "").strip()
        if genre:
            qs = qs.filter(ai_genre__icontains=genre)

        sentiment = request.query_params.get("sentiment", "").strip()
        if sentiment:
            qs = qs.filter(sentiment=sentiment)

        # Ordering
        ordering = request.query_params.get("ordering", "-created_at")
        allowed_orderings = ["rating", "-rating", "title", "-title", "created_at", "-created_at", "price", "-price"]
        if ordering in allowed_orderings:
            qs = qs.order_by(ordering)

        paginator = BookPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = BookListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


# ── Book Detail ───────────────────────────────────────────────────────────────

class BookDetailView(APIView):
    """
    GET /api/books/<id>/
    Returns full book details including AI insights.
    """

    def get(self, request, pk):
        book = get_object_or_404(Book.objects.prefetch_related("tags"), pk=pk)
        serializer = BookDetailSerializer(book)
        return Response(serializer.data)


# ── Recommendations ───────────────────────────────────────────────────────────

class BookRecommendationsView(APIView):
    """
    GET /api/books/<id>/recommendations/
    Returns up to 6 books that share recommendation tags or genre with this book.
    """

    def get(self, request, pk):
        book = get_object_or_404(Book, pk=pk)

        # Get tag names for this book
        book_tags = list(RecommendationTag.objects.filter(book=book).values_list("tag", flat=True))

        recommended = Book.objects.none()

        if book_tags:
            # Books sharing at least one tag
            tag_matches = Book.objects.filter(
                tags__tag__in=book_tags
            ).exclude(pk=book.pk).distinct()
            recommended = tag_matches

        # Fallback / supplement with same ai_genre
        if recommended.count() < 6 and book.ai_genre:
            genre_matches = Book.objects.filter(
                ai_genre__iexact=book.ai_genre
            ).exclude(pk=book.pk).exclude(pk__in=recommended.values("pk"))
            recommended = (recommended | genre_matches).distinct()

        recommended = recommended[:6]
        serializer = BookListSerializer(recommended, many=True)

        return Response({
            "book_id": book.id,
            "book_title": book.title,
            "recommendations": serializer.data,
        })


# ── Scrape Trigger ────────────────────────────────────────────────────────────

class ScrapeView(APIView):
    """
    POST /api/books/scrape/
    Body: { "pages": 5, "fetch_details": true }
    Triggers a background scrape and returns a ScrapeJob ID.
    """

    def post(self, request):
        pages = int(request.data.get("pages", 5))
        fetch_details = request.data.get("fetch_details", True)
        pages = min(max(pages, 1), 50)

        job = ScrapeJob.objects.create(
            source_url="https://books.toscrape.com",
            status="pending",
        )

        # Run scrape in background thread so the API returns immediately
        thread = threading.Thread(
            target=_run_scrape_job,
            args=(job.id, pages, fetch_details),
            daemon=True,
        )
        thread.start()

        return Response(
            {
                "message": f"Scrape job #{job.id} started for {pages} page(s).",
                "job_id": job.id,
            },
            status=status.HTTP_202_ACCEPTED,
        )


def _run_scrape_job(job_id: int, pages: int, fetch_details: bool):
    """Background worker that runs the scrape and saves results."""
    from .scraper import scrape_books

    job = ScrapeJob.objects.get(pk=job_id)
    job.status = "running"
    job.started_at = timezone.now()
    job.save(update_fields=["status", "started_at"])

    try:
        scraped = scrape_books(max_pages=pages, fetch_details=fetch_details)
        saved = 0

        for b in scraped:
            _, created = Book.objects.update_or_create(
                book_url=b.book_url,
                defaults={
                    "title": b.title,
                    "author": b.author,
                    "rating": b.rating,
                    "num_reviews": b.num_reviews,
                    "description": b.description,
                    "genre": b.genre,
                    "cover_image_url": b.cover_image_url,
                    "price": b.price,
                    "availability": b.availability,
                },
            )
            if created:
                saved += 1

        job.status = "done"
        job.books_scraped = saved
        job.finished_at = timezone.now()
        job.save(update_fields=["status", "books_scraped", "finished_at"])
        logger.info(f"ScrapeJob #{job_id} done — {saved} new books")

    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)
        job.finished_at = timezone.now()
        job.save(update_fields=["status", "error_message", "finished_at"])
        logger.error(f"ScrapeJob #{job_id} failed: {e}")


# ── Book Upload ───────────────────────────────────────────────────────────────

class BookUploadView(APIView):
    """
    POST /api/books/upload/
    Manually create a book record and optionally generate AI insights.

    Body: { title, author, description, genre, rating, book_url, cover_image_url, price }
    """

    def post(self, request):
        serializer = BookUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        book = Book.objects.create(**data)

        # Generate AI insights in background if description is available
        if book.description:
            thread = threading.Thread(
                target=_generate_insights_background,
                args=(book.id,),
                daemon=True,
            )
            thread.start()

        return Response(
            BookDetailSerializer(book).data,
            status=status.HTTP_201_CREATED,
        )


def _generate_insights_background(book_id: int):
    from .ai_insights import generate_all_insights
    from .models import RecommendationTag

    try:
        book = Book.objects.get(pk=book_id)
        insights = generate_all_insights(book.title, book.description, book.genre)
        book.summary = insights["summary"]
        book.ai_genre = insights["ai_genre"]
        book.sentiment = insights["sentiment"]
        book.sentiment_score = insights["sentiment_score"]
        book.save(update_fields=["summary", "ai_genre", "sentiment", "sentiment_score", "updated_at"])

        for tag in insights.get("recommendation_tags", []):
            RecommendationTag.objects.get_or_create(book=book, tag=tag)

        logger.info(f"Insights generated for book #{book_id}")
    except Exception as e:
        logger.error(f"Failed to generate insights for book #{book_id}: {e}")


# ── Scrape Job Status ─────────────────────────────────────────────────────────

class ScrapeJobListView(APIView):
    """GET /api/scrape-jobs/"""

    def get(self, request):
        jobs = ScrapeJob.objects.order_by("-created_at")[:20]
        serializer = ScrapeJobSerializer(jobs, many=True)
        return Response({"results": serializer.data})


class ScrapeJobDetailView(APIView):
    """GET /api/scrape-jobs/<id>/"""

    def get(self, request, pk):
        job = get_object_or_404(ScrapeJob, pk=pk)
        return Response(ScrapeJobSerializer(job).data)
