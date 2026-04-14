import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Tome — AI Book Catalogue",
  description: "An AI-powered bibliographic intelligence engine",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Nav */}
        <header style={{ borderBottom: "1px solid rgba(212,175,100,0.10)", background: "rgba(13,11,9,0.92)" }}
          className="sticky top-0 z-50 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-5 flex items-center justify-between h-14">

            <Link href="/" className="flex items-center gap-3 group">
              <div style={{ border: "1px solid rgba(201,145,58,0.3)", background: "rgba(201,145,58,0.08)" }}
                className="w-7 h-7 rounded flex items-center justify-center text-sm">
                ❧
              </div>
              <span className="font-display text-base font-bold tracking-wide" style={{ color: "#e8b96a" }}>
                The Tome
              </span>
            </Link>

            <nav className="flex items-center gap-1 font-serif text-sm">
              <Link href="/"
                style={{ color: "#a89070" }}
                className="px-4 py-1.5 rounded-lg hover:bg-white/4 hover:text-[#f0e2c0] transition-all">
                Catalogue
              </Link>
              <Link href="/qa"
                style={{ background: "rgba(201,145,58,0.1)", border: "1px solid rgba(201,145,58,0.22)", color: "#e8b96a" }}
                className="px-4 py-1.5 rounded-lg hover:bg-[rgba(201,145,58,0.18)] transition-all font-semibold">
                ✦ Ask the Oracle
              </Link>
            </nav>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-5 py-10">{children}</main>

        {/* Footer */}
        <footer style={{ borderTop: "1px solid rgba(212,175,100,0.08)" }} className="mt-16 py-6">
          <p className="text-center font-serif text-xs" style={{ color: "#4a3f30" }}>
            ❧ &ensp; The Tome — AI Bibliographic Intelligence &ensp; ❧
          </p>
        </footer>
      </body>
    </html>
  );
}
