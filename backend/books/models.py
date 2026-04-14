from django.db import models


class Book(models.Model):
    """Stores metadata for each scraped/uploaded book."""

    title = models.CharField(max_length=512)
    author = models.CharField(max_length=256, blank=True, default="")
    rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    num_reviews = models.PositiveIntegerField(default=0)
    description = models.TextField(blank=True, default="")
    genre = models.CharField(max_length=128, blank=True, default="")
    book_url = models.URLField(max_length=1024, blank=True, default="")
    cover_image_url = models.URLField(max_length=1024, blank=True, default="")
    price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    availability = models.CharField(max_length=64, blank=True, default="")

    # AI-generated fields
    summary = models.TextField(blank=True, default="")
    ai_genre = models.CharField(max_length=128, blank=True, default="")
    sentiment = models.CharField(max_length=32, blank=True, default="")  # positive/neutral/negative
    sentiment_score = models.DecimalField(max_digits=4, decimal_places=3, null=True, blank=True)

    # Embedding status
    is_embedded = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["title"]),
            models.Index(fields=["ai_genre"]),
            models.Index(fields=["rating"]),
        ]

    def __str__(self):
        return f"{self.title} — {self.author}"


class RecommendationTag(models.Model):
    """AI-generated tags used for book-to-book recommendations."""

    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="tags")
    tag = models.CharField(max_length=64)

    class Meta:
        unique_together = [("book", "tag")]

    def __str__(self):
        return f"{self.tag} → {self.book.title}"


class BookChunk(models.Model):
    """Text chunks of a book used for RAG retrieval."""

    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="chunks")
    chunk_index = models.PositiveIntegerField()
    content = models.TextField()
    # Unique ID stored in ChromaDB for this chunk
    chroma_id = models.CharField(max_length=256, unique=True)

    class Meta:
        ordering = ["book", "chunk_index"]
        unique_together = [("book", "chunk_index")]

    def __str__(self):
        return f"Chunk {self.chunk_index} of '{self.book.title}'"


class ScrapeJob(models.Model):
    """Tracks bulk scrape runs."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("running", "Running"),
        ("done", "Done"),
        ("failed", "Failed"),
    ]

    source_url = models.URLField(max_length=1024)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="pending")
    books_scraped = models.PositiveIntegerField(default=0)
    error_message = models.TextField(blank=True, default="")
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ScrapeJob {self.id} — {self.status}"


class ChatHistory(models.Model):
    """Persists Q&A chat history per session."""

    session_id = models.CharField(max_length=128)
    question = models.TextField()
    answer = models.TextField()
    sources = models.JSONField(default=list)  # list of {book_id, title, chunk}
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"[{self.session_id}] {self.question[:60]}"
