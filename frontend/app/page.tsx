"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Star, RefreshCw, BookOpen, TrendingUp, Filter } from "lucide-react";
import { api, Book } from "@/lib/api";

const GENRES = ["Fiction", "Mystery", "Thriller", "Romance", "Science Fiction", "Fantasy", "Horror", "Biography", "Self-Help", "Children", "Poetry", "Classics", "Crime", "Adventure", "Philosophy", "Science"];
const SENTIMENTS = ["positive", "neutral", "negative"];

const sentimentColors: Record<string, string> = {
  positive: "text-green-400 bg-green-400/10",
  neutral: "text-yellow-400 bg-yellow-400/10",
  negative: "text-red-400 bg-red-400/10",
};

function StarRating({ rating }: { rating: string | null }) {
  if (!rating) return <span className="text-gray-500 text-xs">No rating</span>;
  const num = parseFloat(rating);
  return (
    <div className="flex items-center gap-1">
      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
      <span className="text-yellow-400 text-sm font-medium">{num.toFixed(1)}</span>
    </div>
  );
}

function BookCard({ book }: { book: Book }) {
  return (
    <Link href={`/books/${book.id}`}>
      <div className="group bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-200 h-full flex flex-col">
        <div className="relative aspect-[2/3] bg-gray-800 overflow-hidden">
          {book.cover_image_url ? (
            <Image
              src={book.cover_image_url}
              alt={book.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-gray-600" />
            </div>
          )}
          {book.ai_genre && (
            <span className="absolute top-2 left-2 bg-indigo-600/90 text-white text-xs px-2 py-0.5 rounded-full font-medium backdrop-blur-sm">
              {book.ai_genre}
            </span>
          )}
        </div>
        <div className="p-4 flex flex-col gap-2 flex-1">
          <h3 className="font-semibold text-sm text-white leading-tight line-clamp-2 group-hover:text-indigo-300 transition-colors">
            {book.title}
          </h3>
          {book.author && <p className="text-gray-400 text-xs">{book.author}</p>}
          <div className="flex items-center justify-between mt-auto pt-2">
            <StarRating rating={book.rating} />
            {book.sentiment && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${sentimentColors[book.sentiment] || "text-gray-400"}`}>
                {book.sentiment}
              </span>
            )}
          </div>
          {book.price && <p className="text-indigo-400 text-sm font-semibold">£{book.price}</p>}
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scraping, setScraping] = useState(false);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: "20" };
      if (search) params.search = search;
      if (genre) params.genre = genre;
      if (sentiment) params.sentiment = sentiment;
      if (ordering) params.ordering = ordering;
      const data = await api.books.list(params);
      setBooks(data.results);
      setCount(data.count);
      setTotalPages(Math.ceil(data.count / 20));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, genre, sentiment, ordering, page]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchBooks(); };

  const triggerScrape = async () => {
    setScraping(true);
    try {
      await api.books.scrape(5);
      alert("Scrape started! Refresh in a minute to see new books.");
    } catch { alert("Failed to start scrape."); }
    finally { setScraping(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Book Library</h1>
          <p className="text-gray-400 text-sm mt-1">{count} books in collection</p>
        </div>
        <button onClick={triggerScrape} disabled={scraping}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <RefreshCw className={`w-4 h-4 ${scraping ? "animate-spin" : ""}`} />
          {scraping ? "Scraping…" : "Scrape More Books"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Books", value: count, icon: <BookOpen className="w-5 h-5 text-indigo-400" /> },
          { label: "With AI Insights", value: books.filter(b => b.summary).length, icon: <TrendingUp className="w-5 h-5 text-green-400" /> },
          { label: "Embedded for RAG", value: books.filter(b => b.is_embedded).length, icon: <Star className="w-5 h-5 text-yellow-400" /> },
          { label: "Genres Found", value: [...new Set(books.map(b => b.ai_genre).filter(Boolean))].length, icon: <Filter className="w-5 h-5 text-pink-400" /> },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
            {s.icon}
            <div>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-gray-400 text-xs">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by title or author…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
          </div>
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">Search</button>
        </form>
        <div className="flex flex-wrap gap-3">
          <select value={genre} onChange={e => { setGenre(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500">
            <option value="">All Genres</option>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={sentiment} onChange={e => { setSentiment(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500">
            <option value="">All Sentiments</option>
            {SENTIMENTS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
          <select value={ordering} onChange={e => { setOrdering(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500">
            <option value="-created_at">Newest First</option>
            <option value="-rating">Highest Rated</option>
            <option value="rating">Lowest Rated</option>
            <option value="title">Title A–Z</option>
            <option value="price">Price Low–High</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-[2/3] bg-gray-800" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-800 rounded w-3/4" />
                <div className="h-3 bg-gray-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">No books found.</p>
          <p className="text-sm mt-1">Try scraping or clearing filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {books.map(book => <BookCard key={book.id} book={book} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-sm text-white rounded-lg transition-colors">Previous</button>
          <span className="text-gray-400 text-sm">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-sm text-white rounded-lg transition-colors">Next</button>
        </div>
      )}
    </div>
  );
}
