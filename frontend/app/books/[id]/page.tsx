"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Star, ExternalLink, BookOpen, Tag, ArrowLeft, MessageSquare } from "lucide-react";
import { api, Book } from "@/lib/api";

const sentimentColors: Record<string, string> = {
  positive: "text-green-400 bg-green-400/10 border-green-400/20",
  neutral: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  negative: "text-red-400 bg-red-400/10 border-red-400/20",
};

function StarRating({ rating }: { rating: string | null }) {
  if (!rating) return null;
  const num = parseFloat(rating);
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= Math.round(num) ? "fill-yellow-400 text-yellow-400" : "text-gray-700"}`} />
      ))}
      <span className="text-yellow-400 font-semibold ml-1">{num.toFixed(1)}</span>
      <span className="text-gray-500 text-sm">/ 5</span>
    </div>
  );
}

function RecommendationCard({ book }: { book: Book }) {
  return (
    <Link href={`/books/${book.id}`}>
      <div className="group bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all flex gap-3 p-3">
        <div className="relative w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-700">
          {book.cover_image_url ? (
            <Image src={book.cover_image_url} alt={book.title} fill className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-gray-500" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white line-clamp-2 group-hover:text-indigo-300 transition-colors">{book.title}</p>
          {book.author && <p className="text-gray-400 text-xs mt-0.5">{book.author}</p>}
          {book.ai_genre && <span className="text-xs text-indigo-400 mt-1 block">{book.ai_genre}</span>}
        </div>
      </div>
    </Link>
  );
}

export default function BookDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const [book, setBook] = useState<Book | null>(null);
  const [recommendations, setRecommendations] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.books.detail(id),
      api.books.recommendations(id),
    ]).then(([bookData, recData]) => {
      setBook(bookData);
      setRecommendations(recData.recommendations);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-6 bg-gray-800 rounded w-32" />
        <div className="flex gap-8">
          <div className="w-48 h-72 bg-gray-800 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="h-8 bg-gray-800 rounded w-3/4" />
            <div className="h-4 bg-gray-800 rounded w-1/3" />
            <div className="h-20 bg-gray-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Book not found.</p>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 inline-block">← Back to library</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back */}
      <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Library
      </Link>

      {/* Main detail */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Cover */}
        <div className="flex-shrink-0">
          <div className="relative w-48 h-72 rounded-xl overflow-hidden bg-gray-800 shadow-2xl shadow-black/50">
            {book.cover_image_url ? (
              <Image src={book.cover_image_url} alt={book.title} fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="w-16 h-16 text-gray-600" />
              </div>
            )}
          </div>
          {book.price && (
            <p className="text-center text-indigo-400 font-bold text-lg mt-3">£{book.price}</p>
          )}
          {book.availability && (
            <p className="text-center text-green-400 text-xs mt-1">{book.availability}</p>
          )}
          {book.book_url && (
            <a href={book.book_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 mt-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors w-full">
              <ExternalLink className="w-4 h-4" /> View on Site
            </a>
          )}
          <Link href="/qa"
            className="flex items-center justify-center gap-2 mt-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-sm px-4 py-2 rounded-lg transition-colors w-full">
            <MessageSquare className="w-4 h-4" /> Ask about this book
          </Link>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-5">
          <div>
            <h1 className="text-3xl font-bold text-white leading-tight">{book.title}</h1>
            {book.author && <p className="text-gray-400 text-lg mt-1">by {book.author}</p>}
          </div>

          {/* Metadata pills */}
          <div className="flex flex-wrap gap-2">
            {book.ai_genre && (
              <span className="bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-sm px-3 py-1 rounded-full">
                {book.ai_genre}
              </span>
            )}
            {book.genre && book.genre !== book.ai_genre && (
              <span className="bg-gray-800 text-gray-300 border border-gray-700 text-sm px-3 py-1 rounded-full">
                {book.genre}
              </span>
            )}
            {book.sentiment && (
              <span className={`border text-sm px-3 py-1 rounded-full capitalize ${sentimentColors[book.sentiment] || ""}`}>
                {book.sentiment} tone
              </span>
            )}
            {book.is_embedded && (
              <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-sm px-3 py-1 rounded-full">
                RAG Indexed
              </span>
            )}
          </div>

          <StarRating rating={book.rating} />

          {/* AI Summary */}
          {book.summary && (
            <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-4">
              <h3 className="text-indigo-300 font-semibold text-sm mb-2 flex items-center gap-2">
                ✨ AI Summary
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">{book.summary}</p>
            </div>
          )}

          {/* Description */}
          {book.description && (
            <div>
              <h3 className="text-white font-semibold mb-2">Description</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{book.description}</p>
            </div>
          )}

          {/* Recommendation Tags */}
          {book.tags && book.tags.length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-400" /> Themes
              </h3>
              <div className="flex flex-wrap gap-2">
                {book.tags.map(t => (
                  <span key={t.id} className="bg-gray-800 border border-gray-700 text-gray-300 text-xs px-3 py-1 rounded-full">
                    {t.tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4">You might also like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {recommendations.map(r => <RecommendationCard key={r.id} book={r} />)}
          </div>
        </div>
      )}
    </div>
  );
}
