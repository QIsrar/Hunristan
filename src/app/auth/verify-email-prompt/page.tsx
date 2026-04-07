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
        <p className="text-muted text-sm text-center mb-6 leading-relaxed">
          Your email address needs to be verified before you can sign in.
        </p>

        <div className="glass rounded-xl p-4 bg-cyan-500/5 border border-cyan-500/20 mb-6">
          <p className="text-xs text-muted uppercase tracking-wider mb-2">Verification Email</p>
          <p className="text-sm text-text break-all font-semibold">{email}</p>
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={handleResend}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail size={16} />
                Resend Verification Email
              </>
            )}
          </button>

          <Link
            href="/auth/signin"
            className="btn-secondary w-full text-center"
          >
            Back to Sign In
          </Link>
        </div>

        <p className="text-xs text-muted text-center">
          Don't see the email? Check your spam folder or request a new verification link above.
        </p>
      </div>
    </div>
  );
}
