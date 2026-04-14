"""Quick API test script. Run: python test_api.py"""
import json
import requests

BASE = "http://localhost:8000/api"

def p(label, r):
    print(f"\n{'='*50}")
    print(f"  {label}  [{r.status_code}]")
    print('='*50)
    try:
        print(json.dumps(r.json(), indent=2)[:800])
    except Exception:
        print(r.text[:400])

# 1. List books
p("GET /api/books/", requests.get(f"{BASE}/books/"))

# 2. List books with filter
p("GET /api/books/?genre=Mystery", requests.get(f"{BASE}/books/", params={"genre": "Mystery"}))

# 3. Book detail
p("GET /api/books/1/", requests.get(f"{BASE}/books/1/"))

# 4. Recommendations
p("GET /api/books/1/recommendations/", requests.get(f"{BASE}/books/1/recommendations/"))

# 5. RAG ask
p("POST /api/rag/ask/", requests.post(f"{BASE}/rag/ask/", json={
    "question": "Which books are about philosophy?"
}))

# 6. Chat history
p("GET /api/rag/history/", requests.get(f"{BASE}/rag/history/"))

# 7. Scrape jobs
p("GET /api/scrape-jobs/", requests.get(f"{BASE}/scrape-jobs/"))

# 8. Upload a book manually
p("POST /api/books/upload/", requests.post(f"{BASE}/books/upload/", json={
    "title": "Test Book",
    "author": "Test Author",
    "description": "A test book about science and discovery.",
    "genre": "Science",
    "rating": "4.50",
    "book_url": "https://example.com/test-book",
}))
