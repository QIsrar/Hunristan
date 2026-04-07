"use client";

import { Suspense } from "react";
import VerifyEmailContent from "./verify-email-content";
import { Loader2 } from "lucide-react";

function VerifyEmailLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-purple-900 to-black p-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
        <Loader2 size={48} className="text-accent mx-auto mb-4 animate-spin" />
        <h1 className="font-display text-2xl font-bold mb-2">Verifying Your Email</h1>
        <p className="text-muted">Please wait while we verify your email address...</p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailLoading />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
