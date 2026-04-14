"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ExternalLink, BookOpen, MessageSquare } from "lucide-react";
import { api, Book } from "@/lib/api";

export default function BookDetailPage() {
  const { id } = useParams();
  const [book, setBook] = useState<Book | null>(null);
  const [recs, setRecs]   = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([api.books.detail(Number(id)), api.books.recommendations(Number(id))])
      .then(([b, r]) => { setBook(b); setRecs(r.recommendations); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="skeleton h-4 rounded w-20" />
      <div className="flex gap-8">
        <div className="skeleton w-44 h-64 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-3 pt-2">
          <div className="skeleton h-8 rounded w-3/5" />
          <div className="skeleton h-4 rounded w-1/3" />
          <div className="skeleton h-20 rounded mt-4" />
        </div>
      </div>
    </div>
  );

  if (!book) return (
    <div className="py-20 text-center">
      <p className="font-serif" style={{ color: "#4a3f30" }}>Volume not found in the catalogue.</p>
      <Link href="/" className="font-serif text-sm mt-2 inline-block" style={{ color: "#c9913a" }}>← Return</Link>
    </div>
  );

  const rating = book.rating ? parseFloat(book.rating) : null;
  const sentClass = book.sentiment === "positive" ? "sent-positive" : book.sentiment === "negative" ? "sent-negative" : "sent-neutral";

  return (
    <div className="space-y-10">
      <Link href="/" className="inline-flex items-center gap-1.5 font-serif text-sm transition-colors hover:opacity-80"
        style={{ color: "#4a3f30" }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Return to Catalogue
      </Link>

      {/* ── Main card ── */}
      <div className="surface-raised rounded-2xl overflow-hidden" style={{ borderColor: "rgba(212,175,100,0.14)" }}>
        <div className="flex flex-col md:flex-row">

          {/* Cover column */}
          <div className="flex-shrink-0 md:w-60 flex flex-col items-center gap-4 p-7"
            style={{ background: "#0d0b09", borderRight: "1px solid rgba(212,175,100,0.08)" }}>
            <div className="relative rounded-xl overflow-hidden shadow-2xl"
              style={{ width: 150, height: 220, boxShadow: "0 20px 50px -10px rgba(0,0,0,0.8), 0 0 0 1px rgba(212,175,100,0.1)" }}>
              {book.cover_image_url
                ? <Image src={book.cover_image_url} alt={book.title} fill className="object-cover" unoptimized />
                : <div className="w-full h-full flex items-center justify-center" style={{ background: "#161210" }}>
                    <BookOpen className="w-12 h-12" style={{ color: "#4a3f30" }} />
                  </div>}
            </div>

            {book.price && (
              <div className="text-center">
                <p className="font-display text-2xl font-black" style={{ color: "#e8b96a" }}>£{book.price}</p>
                {book.availability && <p className="font-serif text-xs mt-0.5" style={{ color: "#2a6b78" }}>{book.availability}</p>}
              </div>
            )}

            <div className="w-full space-y-2">
              {book.book_url && (
                <a href={book.book_url} target="_blank" rel="noopener noreferrer"
                  className="btn-gold w-full text-xs font-display uppercase tracking-widest py-2.5 rounded-lg flex items-center justify-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5" /> Acquire Volume
                </a>
              )}
              <Link href="/qa"
                className="w-full font-serif text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all hover:border-[rgba(212,175,100,0.2)]"
                style={{ border: "1px solid rgba(212,175,100,0.1)", color: "#a89070" }}>
                <MessageSquare className="w-3.5 h-3.5" /> Ask the Oracle
              </Link>
            </div>
          </div>

          {/* Info column */}
          <div className="flex-1 p-7 space-y-6 min-w-0">
            {/* Title */}
            <div>
              <p className="chapter-num text-[9px] mb-2">— Volume Details —</p>
              <h1 className="font-display text-3xl font-black leading-tight" style={{ color: "#f0e2c0" }}>
                {book.title}
              </h1>
              {book.author && (
                <p className="font-serif text-base mt-1.5" style={{ color: "#a89070" }}>
                  by <span style={{ color: "#c9913a" }}>{book.author}</span>
                </p>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {book.ai_genre && (
                <span className="genre-badge px-3 py-1 rounded-sm font-display text-xs uppercase tracking-wider">
                  {book.ai_genre}
                </span>
              )}
              {book.sentiment && (
                <span className={`${sentClass} border text-xs px-3 py-1 rounded-sm font-serif capitalize`}>
                  {book.sentiment} tone
                </span>
              )}
              {book.is_embedded && (
                <span className="font-serif text-xs px-3 py-1 rounded-sm border"
                  style={{ background: "rgba(42,107,120,0.1)", borderColor: "rgba(42,107,120,0.25)", color: "#7dd3e0" }}>
                  ◎ Oracle Indexed
                </span>
              )}
            </div>

            {/* Stars */}
            {rating && (
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => (
                  <span key={i} className={`text-base ${i <= Math.round(rating) ? "star-filled" : "star-empty"}`}>★</span>
                ))}
                <span className="font-serif text-sm ml-1.5" style={{ color: "#a89070" }}>{rating.toFixed(1)} / 5</span>
              </div>
            )}

            {/* AI Summary */}
            {book.summary && (
              <div className="rounded-xl p-4" style={{ background: "rgba(201,145,58,0.05)", border: "1px solid rgba(201,145,58,0.12)" }}>
                <p className="chapter-num text-[9px] mb-2">✦ Oracle's Summary</p>
                <p className="font-serif text-base leading-relaxed" style={{ color: "#c8b890", fontSize: "15px" }}>
                  {book.summary}
                </p>
              </div>
            )}

            {/* Description */}
            {book.description && (
              <div>
                <p className="chapter-num text-[9px] mb-2">— Publisher's Description —</p>
                <p className="font-serif leading-relaxed" style={{ color: "#6b5d4f", fontSize: "15px" }}>
                  {book.description}
                </p>
              </div>
            )}

            {/* Tags */}
            {book.tags?.length > 0 && (
              <div>
                <p className="chapter-num text-[9px] mb-2">— Themes —</p>
                <div className="flex flex-wrap gap-2">
                  {book.tags.map(t => (
                    <span key={t.id}
                      className="font-serif text-xs px-2.5 py-1 rounded-sm transition-colors cursor-default hover:border-[rgba(212,175,100,0.2)]"
                      style={{ border: "1px solid rgba(212,175,100,0.08)", color: "#6b5d4f" }}>
                      {t.tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Recommendations ── */}
      {recs.length > 0 && (
        <div>
          <div className="ornament mb-5 font-display text-[9px] tracking-widest">Similar Volumes</div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {recs.map(r => (
              <Link key={r.id} href={`/books/${r.id}`}>
                <div className="book-card surface rounded-xl overflow-hidden">
                  <div className="relative" style={{ aspectRatio: "2/3", background: "#0d0b09" }}>
                    {r.cover_image_url
                      ? <Image src={r.cover_image_url} alt={r.title} fill className="object-cover" unoptimized />
                      : <div className="w-full h-full" style={{ background: "#161210" }} />}
                  </div>
                  <div className="p-2">
                    <p className="font-display text-[11px] font-bold line-clamp-2 leading-tight" style={{ color: "#f0e2c0" }}>{r.title}</p>
                    {r.ai_genre && <p className="font-serif text-[10px] mt-0.5" style={{ color: "#c9913a" }}>{r.ai_genre}</p>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
