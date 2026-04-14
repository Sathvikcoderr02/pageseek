from django.contrib import admin
from .models import Book, BookChunk, ScrapeJob, ChatHistory


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ["title", "author", "genre", "rating", "price", "availability", "is_embedded", "created_at"]
    list_filter = ["genre", "ai_genre", "sentiment", "is_embedded"]
    search_fields = ["title", "author", "description"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(BookChunk)
class BookChunkAdmin(admin.ModelAdmin):
    list_display = ["book", "chunk_index", "chroma_id"]
    search_fields = ["book__title", "content"]


@admin.register(ScrapeJob)
class ScrapeJobAdmin(admin.ModelAdmin):
    list_display = ["id", "source_url", "status", "books_scraped", "started_at", "finished_at"]
    list_filter = ["status"]
    readonly_fields = ["created_at"]


@admin.register(ChatHistory)
class ChatHistoryAdmin(admin.ModelAdmin):
    list_display = ["session_id", "question", "created_at"]
    search_fields = ["question", "answer"]
    readonly_fields = ["created_at"]
