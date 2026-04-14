const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface Book {
  id: number;
  title: string;
  author: string;
  rating: string | null;
  num_reviews: number;
  genre: string;
  ai_genre: string;
  sentiment: string;
  sentiment_score?: string;
  description?: string;
  summary?: string;
  cover_image_url: string;
  book_url: string;
  price: string | null;
  availability: string;
  is_embedded: boolean;
  tags: { id: number; tag: string }[];
  created_at: string;
  updated_at?: string;
}

export interface Source {
  book_id: number;
  book_title: string;
  chunk_text: string;
  distance: number;
}

export interface AskResponse {
  answer: string;
  sources: Source[];
  chunks_used: number;
  session_id: string;
}

export interface ChatMessage {
  id: number;
  session_id: string;
  question: string;
  answer: string;
  sources: Source[];
  created_at: string;
}

export interface BooksResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Book[];
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export const api = {
  books: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return apiFetch<BooksResponse>(`/books/${qs}`);
    },
    detail: (id: number) => apiFetch<Book>(`/books/${id}/`),
    recommendations: (id: number) =>
      apiFetch<{ book_id: number; book_title: string; recommendations: Book[] }>(
        `/books/${id}/recommendations/`
      ),
    upload: (data: Record<string, unknown>) =>
      apiFetch<Book>("/books/upload/", { method: "POST", body: JSON.stringify(data) }),
    scrape: (pages: number) =>
      apiFetch("/books/scrape/", { method: "POST", body: JSON.stringify({ pages }) }),
  },
  rag: {
    ask: (question: string, session_id?: string) =>
      apiFetch<AskResponse>("/rag/ask/", {
        method: "POST",
        body: JSON.stringify({ question, session_id }),
      }),
    history: (session_id?: string) => {
      const qs = session_id ? `?session_id=${session_id}` : "";
      return apiFetch<{ results: ChatMessage[]; count: number }>(`/rag/history/${qs}`);
    },
  },
};
