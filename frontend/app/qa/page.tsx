"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Send, BookOpen, ArrowLeft, Loader2, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { api, AskResponse, Source } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  loading?: boolean;
}

const SAMPLE_QUESTIONS = [
  "What mystery books are in the collection?",
  "Recommend a book with a positive tone",
  "Which books are about philosophy?",
  "What is the highest rated book?",
  "Tell me about books with dark themes",
];

function SourceCard({ source, index }: { source: Source; index: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold flex-shrink-0 text-[10px]">
            {index}
          </span>
          <Link href={`/books/${source.book_id}`}
            className="text-indigo-300 hover:text-indigo-200 font-medium truncate transition-colors">
            {source.book_title}
          </Link>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-gray-500">
            {(1 - source.distance).toFixed(0)}% match
          </span>
          <button onClick={() => setExpanded(v => !v)} className="text-gray-400 hover:text-white transition-colors">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      {expanded && (
        <p className="text-gray-400 mt-2 leading-relaxed border-t border-gray-700 pt-2">
          {source.chunk_text}
        </p>
      )}
    </div>
  );
}

function AssistantMessage({ msg }: { msg: Message }) {
  const [showSources, setShowSources] = useState(false);
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
        <BookOpen className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 space-y-2 min-w-0">
        {msg.loading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Searching books and generating answer…
          </div>
        ) : (
          <>
            <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-none px-4 py-3">
              <p className="text-gray-100 text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.sources && msg.sources.length > 0 && (
              <div>
                <button onClick={() => setShowSources(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  {showSources ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showSources ? "Hide" : "Show"} {msg.sources.length} source{msg.sources.length > 1 ? "s" : ""}
                </button>
                {showSources && (
                  <div className="mt-2 space-y-2">
                    {msg.sources.map((s, i) => <SourceCard key={i} source={s} index={i + 1} />)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function QAPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).slice(2));
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: question };
    const loadingMsg: Message = { id: Date.now().toString() + "l", role: "assistant", content: "", loading: true };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput("");
    setLoading(true);

    try {
      const res: AskResponse = await api.rag.ask(question, sessionId);
      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id
            ? { ...m, content: res.answer, sources: res.sources, loading: false }
            : m
        )
      );
    } catch (e) {
      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id
            ? { ...m, content: "Sorry, something went wrong. Please try again.", loading: false }
            : m
        )
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Library
        </Link>
        <div className="h-4 w-px bg-gray-700" />
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" /> Book Q&amp;A
        </h1>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-6">
            <div className="w-16 h-16 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Ask about your books</h2>
              <p className="text-gray-400 text-sm mt-1">Powered by RAG — answers with source citations</p>
            </div>
            <div className="space-y-2 w-full max-w-md">
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Try asking</p>
              {SAMPLE_QUESTIONS.map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="w-full text-left bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-indigo-500/40 text-gray-300 text-sm px-4 py-2.5 rounded-lg transition-all">
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              msg.role === "user" ? (
                <div key={msg.id} className="flex justify-end">
                  <div className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-none text-sm max-w-xs md:max-w-md leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <AssistantMessage key={msg.id} msg={msg} />
              )
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 pt-4">
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <div className="flex-1 bg-gray-900 border border-gray-700 rounded-xl focus-within:border-indigo-500 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about the books…"
              rows={1}
              className="w-full bg-transparent text-white placeholder-gray-500 text-sm px-4 py-3 resize-none focus:outline-none max-h-32"
              style={{ height: "auto" }}
            />
          </div>
          <button type="submit" disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-3 rounded-xl transition-colors flex-shrink-0">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
        <p className="text-gray-600 text-xs mt-2 text-center">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
