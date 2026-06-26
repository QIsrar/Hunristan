"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application Error:", error);
  }, [error]);

  const errorMessage = error.message || "An unexpected error occurred";
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-red-900/20 to-black p-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertCircle size={32} className="text-red-400" />
        </div>

        <h1 className="font-display text-2xl font-bold mb-2 text-red-400">
          Oops! Something Went Wrong
        </h1>

        <p className="text-muted text-sm mb-4 leading-relaxed">
          We encountered an unexpected error. Our team has been notified.
        </p>

        {isDev && (
          <div className="glass rounded-xl p-3 bg-red-500/5 border border-red-500/20 mb-6 text-left">
            <p className="text-xs text-red-400 font-semibold mb-2">Error Details (Dev Only):</p>
            <p className="text-xs text-muted font-mono break-words">{errorMessage}</p>
            {error.digest && (
              <p className="text-xs text-muted font-mono mt-2">ID: {error.digest}</p>
            )}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => reset()}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            Try Again
          </button>

          <Link href="/" className="btn-secondary w-full flex items-center justify-center gap-2">
            <Home size={16} />
            Go to Home
          </Link>
        </div>

        <p className="text-xs text-muted mt-6">
          Error ID: {error.digest || "unknown"} — Please save this ID when contacting support.
        </p>
      </div>
    </div>
  );
}
