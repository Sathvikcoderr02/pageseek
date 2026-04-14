from django.urls import path
from . import views

urlpatterns = [
    path("ask/", views.AskQuestionView.as_view(), name="rag-ask"),
    path("history/", views.ChatHistoryView.as_view(), name="chat-history"),
    path("embed/<int:book_id>/", views.EmbedBookView.as_view(), name="embed-book"),
    path("embed/all/", views.EmbedAllBooksView.as_view(), name="embed-all"),
]
