"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Send, ChevronDown, ChevronUp } from "lucide-react";
import { api, AskResponse, Source } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  loading?: boolean;
}

const SAMPLES = [
  "What mystery volumes are in the collection?",
  "Which book holds the highest rating?",
  "Recommend something on philosophy",
  "What books carry a dark, negative tone?",
  "Tell me about science fiction titles",
];

function SourceCard({ s, i }: { s: Source; i: number }) {
  const [open, setOpen] = useState(false);
  const pct = Math.round((1 - s.distance) * 100);
  return (
    <div className="rounded-lg p-2.5 font-serif text-sm"
      style={{ background: "rgba(13,11,9,0.8)", border: "1px solid rgba(212,175,100,0.08)" }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-display text-[10px] font-bold flex-shrink-0" style={{ color: "#c9913a" }}>
            [{i}]
          </span>
          <Link href={`/books/${s.book_id}`}
            className="truncate hover:underline" style={{ color: "#e8b96a" }}>
            {s.book_title}
          </Link>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0" style={{ color: "#4a3f30" }}>
          <span className="text-xs">{pct}% match</span>
          <button onClick={() => setOpen(v => !v)} className="hover:text-[#a89070] transition-colors">
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>
      {open && (
        <p className="mt-2 pt-2 font-serif text-sm leading-relaxed"
          style={{ borderTop: "1px solid rgba(212,175,100,0.06)", color: "#6b5d4f" }}>
          {s.chunk_text}
        </p>
      )}
    </div>
  );
}

function OracleMessage({ msg }: { msg: Message }) {
  const [showSrc, setShowSrc] = useState(false);
  return (
    <div className="flex gap-3 unfurl">
      <div className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center text-base mt-0.5"
        style={{ background: "rgba(201,145,58,0.1)", border: "1px solid rgba(201,145,58,0.2)", color: "#c9913a" }}>
        ✦
      </div>
      <div className="flex-1 space-y-2">
        {msg.loading ? (
          <div className="flex items-center gap-1.5 py-2">
            <span className="font-serif text-xs mr-1" style={{ color: "#4a3f30" }}>The Oracle ponders</span>
            <span className="w-1.5 h-3 rounded-sm q1" style={{ background: "#c9913a" }} />
            <span className="w-1.5 h-3 rounded-sm q2" style={{ background: "#c9913a" }} />
            <span className="w-1.5 h-3 rounded-sm q3" style={{ background: "#c9913a" }} />
          </div>
        ) : (
          <>
            <div className="rounded-xl rounded-tl-none p-4"
              style={{ background: "rgba(22,18,16,0.9)", border: "1px solid rgba(212,175,100,0.08)" }}>
              <p className="font-serif leading-relaxed whitespace-pre-wrap" style={{ color: "#c8b890", fontSize: "15px" }}>
                {msg.content}
              </p>
            </div>
            {msg.sources && msg.sources.length > 0 && (
              <div>
                <button onClick={() => setShowSrc(v => !v)}
                  className="flex items-center gap-1 font-serif text-xs transition-colors"
                  style={{ color: "#4a3f30" }}>
                  {showSrc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {msg.sources.length} source{msg.sources.length > 1 ? "s" : ""} cited
                </button>
                {showSrc && (
                  <div className="mt-2 space-y-1.5">
                    {msg.sources.map((s, i) => <SourceCard key={i} s={s} i={i + 1} />)}
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
  const [msgs, setMsgs]   = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async (q: string) => {
    if (!q.trim() || loading) return;
    const uid = Date.now().toString();
    const lid = uid + "l";
    setMsgs(m => [...m,
      { id: uid, role: "user",      content: q },
      { id: lid, role: "assistant", content: "", loading: true },
    ]);
    setInput("");
    setLoading(true);
    try {
      const res: AskResponse = await api.rag.ask(q, sessionId);
      setMsgs(m => m.map(x => x.id === lid ? { ...x, content: res.answer, sources: res.sources, loading: false } : x));
    } catch {
      setMsgs(m => m.map(x => x.id === lid ? { ...x, content: "The Oracle is silent. Please try again.", loading: false } : x));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 9rem)" }}>

      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(212,175,100,0.08)" }}>
        <div className="flex items-center gap-3">
          <Link href="/" style={{ color: "#4a3f30" }} className="hover:text-[#a89070] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="font-display text-base font-bold" style={{ color: "#f0e2c0" }}>Consult the Oracle</span>
        </div>
        <p className="chapter-num text-[9px]">— RAG-Powered —</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-5 pb-4">
        {msgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-7 text-center">
            <div>
              <div className="text-5xl mb-3" style={{ color: "#c9913a" }}>✦</div>
              <h2 className="font-display text-xl font-bold" style={{ color: "#f0e2c0" }}>Ask the Oracle</h2>
              <p className="font-serif text-sm mt-1" style={{ color: "#4a3f30" }}>
                Your questions are answered from the catalogue with cited sources
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-md">
              <p className="chapter-num text-[9px] mb-1">— Suggested Inquiries —</p>
              {SAMPLES.map(q => (
                <button key={q} onClick={() => send(q)}
                  className="text-left font-serif text-sm px-4 py-3 rounded-xl transition-all hover:border-[rgba(201,145,58,0.25)]"
                  style={{ background: "rgba(13,11,9,0.8)", border: "1px solid rgba(212,175,100,0.07)", color: "#6b5d4f" }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          msgs.map(m => m.role === "user" ? (
            <div key={m.id} className="flex justify-end unfurl">
              <div className="font-serif text-sm px-4 py-3 rounded-xl rounded-tr-none max-w-sm"
                style={{ background: "rgba(22,18,16,0.9)", border: "1px solid rgba(212,175,100,0.1)", color: "#f0e2c0" }}>
                {m.content}
              </div>
            </div>
          ) : <OracleMessage key={m.id} msg={m} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 pt-4" style={{ borderTop: "1px solid rgba(212,175,100,0.08)" }}>
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Address your inquiry to the Oracle…"
            rows={1}
            className="tome-input flex-1 rounded-xl px-4 py-3 resize-none"
            style={{ fontSize: "15px" }}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="btn-gold flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center font-serif text-xs mt-2" style={{ color: "#2d2520" }}>
          Enter to send &ensp;·&ensp; Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
