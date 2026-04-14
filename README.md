# BookSearch — Document Intelligence Platform

A full-stack AI-powered book search and Q&A platform built with Django REST Framework, Next.js, ChromaDB, and Claude AI.

## Screenshots

> _Screenshots will be added after the UI is complete._

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django 4.2, Django REST Framework |
| Database | PostgreSQL (metadata), ChromaDB (vectors) |
| AI | Anthropic Claude / OpenAI / LM Studio |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) |
| Scraping | Selenium + BeautifulSoup4 |
| Frontend | Next.js 14, Tailwind CSS |

## Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL 8+
- (Optional) LM Studio for local LLM

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # fill in your credentials

python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:3000  
Backend API runs on http://localhost:8000/api/

## API Documentation

### Books

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/books/` | List all books (paginated) |
| GET | `/api/books/<id>/` | Book details |
| GET | `/api/books/<id>/recommendations/` | Related books |
| POST | `/api/books/scrape/` | Trigger web scrape |
| POST | `/api/books/upload/` | Manually upload a book |

### RAG / Q&A

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rag/ask/` | Ask a question (RAG) |
| GET | `/api/rag/history/` | Chat history |
| POST | `/api/rag/embed/<id>/` | Embed a single book |
| POST | `/api/rag/embed/all/` | Embed all books |

## Sample Questions

- "What is the best mystery book in the collection?"
- "Recommend a book similar to a thriller with high ratings."
- "Summarize the book 'A Light in the Attic'."
- "Which books have positive sentiment in their descriptions?"
