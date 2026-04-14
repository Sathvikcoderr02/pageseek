"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, BookOpen, SlidersHorizontal, X, RotateCw } from "lucide-react";
import { api, Book } from "@/lib/api";

const GENRES = ["Fiction","Mystery","Thriller","Romance","Science Fiction","Fantasy","Horror","Biography","Self-Help","Children","Poetry","Classics","Crime","Adventure","Philosophy","Science"];
const SENTIMENTS = ["positive","neutral","negative"];

function BookCard({ book }: { book: Book }) {
  const rating = book.rating ? parseFloat(book.rating) : null;

  return (
    <Link href={`/books/${book.id}`}>
      <article className="book-card surface rounded-xl overflow-hidden flex flex-col h-full cursor-pointer">
        {/* Cover */}
        <div className="relative overflow-hidden" style={{ aspectRatio: "2/3", background: "#0d0b09" }}>
          {book.cover_image_url ? (
            <Image src={book.cover_image_url} alt={book.title} fill className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "#161210" }}>
              <BookOpen className="w-8 h-8" style={{ color: "#4a3f30" }} />
            </div>
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(8,7,5,0.85) 0%, transparent 50%)" }} />

          {/* Genre badge */}
          {book.ai_genre && (
            <div className="absolute top-2 left-2">
              <span className="genre-badge px-2 py-0.5 rounded-sm text-[10px] font-display uppercase tracking-wider">
                {book.ai_genre}
              </span>
            </div>
          )}

          {/* Rating */}
          {rating && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1">
              <span style={{ color: "#e8b96a", fontSize: "11px", fontFamily: "'Crimson Pro', serif", fontWeight: 600 }}>
                ★ {rating.toFixed(1)}
              </span>
            </div>
          )}

          {/* Sentiment */}
          {book.sentiment && (
            <div className={`absolute bottom-2.5 right-2.5 w-2 h-2 rounded-full border ${
              book.sentiment === "positive" ? "bg-teal-400 border-teal-300/30" :
              book.sentiment === "negative" ? "border-rose-400/30" : "border-amber-600/30"
            }`}
            style={book.sentiment === "negative" ? { background: "#8b2635" } :
                   book.sentiment === "neutral"  ? { background: "#4a3f30" } : {}} />
          )}
        </div>

        {/* Info */}
        <div className="p-3 flex flex-col gap-0.5 flex-1">
          <p className="font-display text-xs font-bold leading-snug line-clamp-2" style={{ color: "#f0e2c0" }}>
            {book.title}
          </p>
          {book.author && (
            <p className="font-serif text-[11px] truncate" style={{ color: "#4a3f30" }}>{book.author}</p>
          )}
          <div className="flex items-center justify-between mt-auto pt-1.5" style={{ borderTop: "1px solid rgba(212,175,100,0.06)" }}>
            {book.ai_genre
              ? <span className="font-serif text-[10px]" style={{ color: "#c9913a" }}>{book.ai_genre}</span>
              : <span />}
            {book.price && <span className="font-serif text-[11px]" style={{ color: "#a89070" }}>£{book.price}</span>}
          </div>
        </div>
      </article>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="surface rounded-xl overflow-hidden">
      <div className="skeleton" style={{ aspectRatio: "2/3" }} />
      <div className="p-3 space-y-2">
        <div className="skeleton h-3 rounded w-4/5" />
        <div className="skeleton h-2.5 rounded w-2/5" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [books, setBooks]       = useState<Book[]>([]);
  const [count, setCount]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [genre, setGenre]       = useState("");
  const [sentiment, setSentiment] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [scraping, setScraping] = useState(false);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, string> = { page: String(page), page_size: "24" };
      if (search)   p.search   = search;
      if (genre)    p.genre    = genre;
      if (sentiment) p.sentiment = sentiment;
      if (ordering) p.ordering = ordering;
      const data = await api.books.list(p);
      setBooks(data.results);
      setCount(data.count);
      setTotalPages(Math.ceil(data.count / 24));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, genre, sentiment, ordering, page]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const hasFilters = search || genre || sentiment;
  const clearFilters = () => { setSearch(""); setGenre(""); setSentiment(""); setPage(1); };

  return (
    <div className="space-y-8">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div>
          <p className="chapter-num mb-1">— Bibliotheca Digitalis —</p>
          <h1 className="font-display text-4xl font-black" style={{ color: "#f0e2c0", lineHeight: 1.1 }}>
            The Catalogue
          </h1>
          <p className="font-serif mt-1.5" style={{ color: "#4a3f30", fontSize: "15px" }}>
            {count.toLocaleString()} volumes indexed &ensp;·&ensp; AI-illuminated
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/qa" className="btn-gold font-display text-sm px-5 py-2.5 rounded-lg flex items-center gap-2">
            ✦ Consult the Oracle
          </Link>
          <button
            onClick={() => { setScraping(true); api.books.scrape(5).then(() => alert("Acquisition started!")).catch(() => {}).finally(() => setScraping(false)); }}
            disabled={scraping}
            className="surface rounded-lg px-3 py-2.5 font-serif text-sm flex items-center gap-1.5 transition-all hover:border-[rgba(212,175,100,0.2)] disabled:opacity-40"
            style={{ color: "#a89070" }}>
            <RotateCw className={`w-3.5 h-3.5 ${scraping ? "animate-spin" : ""}`} />
            Acquire
          </button>
        </div>
      </div>

      {/* ── Stats ledger ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { v: count,                                             l: "Volumes",    n: "I"   },
          { v: books.filter(b => b.summary).length,              l: "Illuminated",n: "II"  },
          { v: books.filter(b => b.is_embedded).length,          l: "Indexed",    n: "III" },
          { v: [...new Set(books.map(b=>b.ai_genre).filter(Boolean))].length, l: "Genres", n: "IV"  },
        ].map(s => (
          <div key={s.l} className="surface-raised rounded-xl p-4" style={{ borderColor: "rgba(212,175,100,0.12)" }}>
            <p className="chapter-num text-[9px] mb-1">{s.n}</p>
            <p className="font-display text-2xl font-black" style={{ color: "#e8b96a" }}>{s.v}</p>
            <p className="font-serif text-xs mt-0.5" style={{ color: "#4a3f30" }}>{s.l}</p>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#4a3f30" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (setPage(1), fetchBooks())}
              placeholder="Search the catalogue…"
              className="tome-input w-full rounded-xl pl-10 pr-4 py-3 text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`rounded-xl px-4 py-3 text-sm font-serif flex items-center gap-1.5 transition-all ${
              showFilters
                ? "border border-[rgba(201,145,58,0.35)] bg-[rgba(201,145,58,0.08)]"
                : "surface hover:border-[rgba(212,175,100,0.2)]"
            }`}
            style={{ color: showFilters ? "#e8b96a" : "#a89070" }}>
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filter</span>
            {hasFilters && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#c9913a" }} />}
          </button>
        </div>

        {showFilters && (
          <div className="surface-raised rounded-xl p-4 flex flex-wrap gap-3 items-center"
            style={{ borderColor: "rgba(212,175,100,0.12)" }}>
            {[
              { label: "Genre",    value: genre,     setter: setGenre,     options: GENRES },
              { label: "Tone",     value: sentiment, setter: setSentiment, options: SENTIMENTS },
            ].map(f => (
              <select
                key={f.label}
                value={f.value}
                onChange={e => { f.setter(e.target.value); setPage(1); }}
                className="tome-input rounded-lg px-3 py-2 text-sm bg-transparent"
                style={{ minWidth: "130px" }}>
                <option value="" className="bg-[#0d0b09]">All {f.label}s</option>
                {f.options.map(o => <option key={o} value={o} className="bg-[#0d0b09] capitalize">{o}</option>)}
              </select>
            ))}
            <select
              value={ordering}
              onChange={e => { setOrdering(e.target.value); setPage(1); }}
              className="tome-input rounded-lg px-3 py-2 text-sm bg-transparent">
              <option value="-created_at" className="bg-[#0d0b09]">Recently acquired</option>
              <option value="-rating"     className="bg-[#0d0b09]">Highest rated</option>
              <option value="title"       className="bg-[#0d0b09]">Alphabetical</option>
              <option value="price"       className="bg-[#0d0b09]">Price ascending</option>
            </select>
            {hasFilters && (
              <button onClick={clearFilters}
                className="ml-auto flex items-center gap-1 font-serif text-xs transition-colors"
                style={{ color: "#8b2635" }}>
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <span className="text-4xl" style={{ color: "#4a3f30" }}>❧</span>
          <p className="font-display text-base" style={{ color: "#4a3f30" }}>No volumes found</p>
          {hasFilters && (
            <button onClick={clearFilters} className="font-serif text-sm" style={{ color: "#c9913a" }}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {books.map(b => <BookCard key={b.id} book={b} />)}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="surface rounded-lg px-5 py-2 font-serif text-sm transition-all hover:border-[rgba(212,175,100,0.2)] disabled:opacity-30"
            style={{ color: "#a89070" }}>
            ← Prev
          </button>
          <span className="font-serif text-sm" style={{ color: "#4a3f30" }}>
            <span style={{ color: "#c9913a" }}>{page}</span> of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="surface rounded-lg px-5 py-2 font-serif text-sm transition-all hover:border-[rgba(212,175,100,0.2)] disabled:opacity-30"
            style={{ color: "#a89070" }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
