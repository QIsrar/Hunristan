"use client";

import { AlertCircle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-purple-900 to-black p-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertCircle size={32} className="text-red-400" />
        </div>

        <h1 className="font-display text-2xl font-bold mb-2 text-red-400">
          Authentication Error
        </h1>

        <p className="text-muted text-sm mb-4 leading-relaxed">
          An error occurred during the authentication process. Please try again.
        </p>

        {isDev && (
          <div className="glass rounded-xl p-3 bg-red-500/5 border border-red-500/20 mb-6 text-left">
            <p className="text-xs text-red-400 font-semibold mb-2">Error Details:</p>
            <p className="text-xs text-muted font-mono break-words">{error.message}</p>
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

          <Link href="/auth/signin" className="btn-secondary w-full flex items-center justify-center gap-2">
            <Home size={16} />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
