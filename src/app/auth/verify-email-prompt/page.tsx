"use client";

import { Suspense } from "react";
import VerifyEmailPromptContent from "./verify-email-prompt-content";
import { Mail, Loader2 } from "lucide-react";

function VerifyEmailPromptLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-purple-900 to-black p-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full">
        <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Mail size={32} className="text-cyan-400" />
        </div>
        
        <h1 className="font-display text-2xl font-bold text-center mb-2">Email Not Verified</h1>
        <p className="text-muted text-sm text-center mb-6">Loading...</p>
        <div className="flex justify-center">
          <Loader2 size={24} className="text-cyan-400 animate-spin" />
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPromptPage() {
  return (
    <Suspense fallback={<VerifyEmailPromptLoading />}>
      <VerifyEmailPromptContent />
    </Suspense>
  );
}
