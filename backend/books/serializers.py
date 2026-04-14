from rest_framework import serializers
from .models import Book, BookChunk, ScrapeJob, ChatHistory, RecommendationTag


class RecommendationTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecommendationTag
        fields = ["id", "tag"]


class BookListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing books."""
    tags = RecommendationTagSerializer(many=True, read_only=True)

    class Meta:
        model = Book
        fields = [
            "id", "title", "author", "rating", "num_reviews",
            "genre", "ai_genre", "sentiment", "cover_image_url",
            "book_url", "price", "availability", "is_embedded",
            "tags", "created_at",
        ]


class BookDetailSerializer(serializers.ModelSerializer):
    """Full serializer including AI-generated fields."""
    tags = RecommendationTagSerializer(many=True, read_only=True)

    class Meta:
        model = Book
        fields = [
            "id", "title", "author", "rating", "num_reviews",
            "description", "genre", "ai_genre", "sentiment",
            "sentiment_score", "summary", "cover_image_url",
            "book_url", "price", "availability", "is_embedded",
            "tags", "created_at", "updated_at",
        ]


class BookUploadSerializer(serializers.Serializer):
    """Validates manual book upload payload."""
    title = serializers.CharField(max_length=512)
    author = serializers.CharField(max_length=256, required=False, default="")
    description = serializers.CharField(required=False, default="")
    genre = serializers.CharField(max_length=128, required=False, default="")
    rating = serializers.DecimalField(max_digits=3, decimal_places=2, required=False, allow_null=True)
    book_url = serializers.URLField(required=False, default="")
    cover_image_url = serializers.URLField(required=False, default="")
    price = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, allow_null=True)


class ScrapeJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScrapeJob
        fields = [
            "id", "source_url", "status", "books_scraped",
            "error_message", "started_at", "finished_at", "created_at",
        ]


class ChatHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatHistory
        fields = ["id", "session_id", "question", "answer", "sources", "created_at"]
