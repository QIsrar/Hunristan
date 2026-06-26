"use client";

import Link from "next/link";
import { FileQuestion, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-purple-900 to-black p-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <FileQuestion size={32} className="text-amber-400" />
        </div>

        <h1 className="font-display text-2xl font-bold mb-2">Page Not Found</h1>
        <p className="text-muted text-sm mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="glass rounded-xl p-4 bg-amber-500/5 border border-amber-500/20 mb-6">
          <p className="text-xs text-amber-400 uppercase tracking-wider mb-2">Error Code</p>
          <p className="text-2xl font-bold text-text">404</p>
        </div>

        <div className="space-y-3">
          <Link href="/" className="btn-primary w-full flex items-center justify-center gap-2">
            <Home size={16} />
            Go to Home
          </Link>

          <Link href="/dashboard" className="btn-secondary w-full flex items-center justify-center gap-2">
            <Search size={16} />
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
