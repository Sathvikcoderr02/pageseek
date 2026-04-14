"""
Django management command to generate AI insights for scraped books.

Usage:
    python manage.py generate_insights              # process all books missing insights
    python manage.py generate_insights --limit 20   # process first 20
    python manage.py generate_insights --force      # reprocess all (overwrite existing)
"""

import time
from django.core.management.base import BaseCommand
from books.models import Book, RecommendationTag
from books.ai_insights import generate_all_insights


class Command(BaseCommand):
    help = "Generate AI insights (summary, genre, sentiment) for books"

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Maximum number of books to process",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Reprocess books that already have insights",
        )

    def handle(self, *args, **options):
        limit = options["limit"]
        force = options["force"]

        qs = Book.objects.all()
        if not force:
            # Only process books that are missing a summary
            qs = qs.filter(summary="")

        if limit:
            qs = qs[:limit]

        total = qs.count()
        self.stdout.write(f"Processing {total} book(s)...")

        success = 0
        failed = 0

        for i, book in enumerate(qs, 1):
            self.stdout.write(f"[{i}/{total}] {book.title[:60]}")
            try:
                insights = generate_all_insights(
                    title=book.title,
                    description=book.description,
                    genre=book.genre,
                )
                book.summary = insights["summary"]
                book.ai_genre = insights["ai_genre"]
                book.sentiment = insights["sentiment"]
                book.sentiment_score = insights["sentiment_score"]
                book.save(update_fields=["summary", "ai_genre", "sentiment", "sentiment_score", "updated_at"])

                # Save recommendation tags
                for tag_text in insights.get("recommendation_tags", []):
                    RecommendationTag.objects.get_or_create(book=book, tag=tag_text)

                success += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"     genre={insights['ai_genre']}  sentiment={insights['sentiment']}"
                    )
                )
            except Exception as e:
                failed += 1
                self.stderr.write(self.style.ERROR(f"     FAILED: {e}"))

            # 8 req/min limit on free tier = 1 call per 7.5s minimum
            time.sleep(8)

        self.stdout.write(
            self.style.SUCCESS(f"\nDone — {success} succeeded, {failed} failed.")
        )
