"""
Django management command to embed books into ChromaDB for RAG.

Usage:
    python manage.py embed_books              # embed all un-embedded books
    python manage.py embed_books --force      # re-embed all books
    python manage.py embed_books --id 42      # embed a single book by ID
"""

from django.core.management.base import BaseCommand
from rag.pipeline import embed_book, embed_all_books
from books.models import Book


class Command(BaseCommand):
    help = "Generate embeddings for books and store them in ChromaDB"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Re-embed all books, even those already embedded",
        )
        parser.add_argument(
            "--id",
            type=int,
            default=None,
            help="Embed a single book by its ID",
        )

    def handle(self, *args, **options):
        if options["id"]:
            try:
                book = Book.objects.get(pk=options["id"])
                chunks = embed_book(book)
                self.stdout.write(
                    self.style.SUCCESS(f"Embedded '{book.title}' → {chunks} chunks")
                )
            except Book.DoesNotExist:
                self.stderr.write(self.style.ERROR(f"Book with ID {options['id']} not found."))
            return

        result = embed_all_books(force=options["force"])
        self.stdout.write(
            self.style.SUCCESS(
                f"Done — {result['success']} embedded, {result['failed']} failed "
                f"(total: {result['total']})"
            )
        )
