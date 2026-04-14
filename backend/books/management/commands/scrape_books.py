"""
Django management command to scrape books and save them to the database.

Usage:
    python manage.py scrape_books                  # scrape 5 pages (default)
    python manage.py scrape_books --pages 10       # scrape 10 pages
    python manage.py scrape_books --pages 50       # scrape all 1000 books
    python manage.py scrape_books --no-details     # skip detail pages (faster)
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from books.models import Book, ScrapeJob
from books.scraper import scrape_books


class Command(BaseCommand):
    help = "Scrape books from books.toscrape.com and save to the database"

    def add_arguments(self, parser):
        parser.add_argument(
            "--pages",
            type=int,
            default=5,
            help="Number of listing pages to scrape (default: 5, max: 50)",
        )
        parser.add_argument(
            "--no-details",
            action="store_true",
            help="Skip individual book detail pages (faster but no description/genre)",
        )

    def handle(self, *args, **options):
        max_pages = min(options["pages"], 50)
        fetch_details = not options["no_details"]

        # Create a job record
        job = ScrapeJob.objects.create(
            source_url="https://books.toscrape.com",
            status="running",
            started_at=timezone.now(),
        )
        self.stdout.write(f"ScrapeJob #{job.id} started — scraping {max_pages} page(s)...")

        try:
            scraped = scrape_books(max_pages=max_pages, fetch_details=fetch_details)
            saved = 0
            skipped = 0

            for b in scraped:
                # Upsert by title + book_url to avoid duplicates
                obj, created = Book.objects.update_or_create(
                    book_url=b.book_url,
                    defaults={
                        "title": b.title,
                        "author": b.author,
                        "rating": b.rating,
                        "num_reviews": b.num_reviews,
                        "description": b.description,
                        "genre": b.genre,
                        "book_url": b.book_url,
                        "cover_image_url": b.cover_image_url,
                        "price": b.price,
                        "availability": b.availability,
                    },
                )
                if created:
                    saved += 1
                else:
                    skipped += 1

            job.status = "done"
            job.books_scraped = saved
            job.finished_at = timezone.now()
            job.save()

            self.stdout.write(
                self.style.SUCCESS(
                    f"Done! {saved} new books saved, {skipped} updated. Job #{job.id}"
                )
            )

        except Exception as e:
            job.status = "failed"
            job.error_message = str(e)
            job.finished_at = timezone.now()
            job.save()
            self.stderr.write(self.style.ERROR(f"Scrape failed: {e}"))
            raise
