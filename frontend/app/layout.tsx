import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BookSearch — Document Intelligence Platform",
  description: "AI-powered book discovery and Q&A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-white">
              <span className="text-indigo-400">📚</span> BookSearch
            </Link>
            <div className="flex items-center gap-6 text-sm font-medium">
              <Link href="/" className="text-gray-300 hover:text-white transition-colors">
                Library
              </Link>
              <Link href="/qa" className="text-gray-300 hover:text-white transition-colors">
                Q&amp;A
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      </body>
    </html>
  );
}
