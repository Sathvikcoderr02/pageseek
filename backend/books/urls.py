from django.urls import path
from . import views

urlpatterns = [
    # Book CRUD / listing
    path("books/", views.BookListView.as_view(), name="book-list"),
    path("books/<int:pk>/", views.BookDetailView.as_view(), name="book-detail"),
    path("books/<int:pk>/recommendations/", views.BookRecommendationsView.as_view(), name="book-recommendations"),

    # Scraping / processing
    path("books/scrape/", views.ScrapeView.as_view(), name="book-scrape"),
    path("books/upload/", views.BookUploadView.as_view(), name="book-upload"),

    # Scrape job status
    path("scrape-jobs/", views.ScrapeJobListView.as_view(), name="scrape-job-list"),
    path("scrape-jobs/<int:pk>/", views.ScrapeJobDetailView.as_view(), name="scrape-job-detail"),
]
