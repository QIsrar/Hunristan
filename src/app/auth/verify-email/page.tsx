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

        {status === "success" && (
          <>
            <CheckCircle2 size={48} className="text-green-400 mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold mb-2 text-green-400">Email Verified!</h1>
            <p className="text-muted mb-6">{message}</p>
            <p className="text-sm text-muted">Redirecting to sign in...</p>
            <Link 
              href="/auth/signin" 
              className="mt-6 btn-primary w-full inline-block"
            >
              Go to Sign In
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold mb-2 text-red-400">Verification Failed</h1>
            <p className="text-muted mb-6">{message}</p>
            <div className="space-y-3">
              <Link 
                href="/auth/signup" 
                className="block btn-primary"
              >
                Try Signing Up Again
              </Link>
              <Link 
                href="/auth/signin" 
                className="block btn-secondary"
              >
                Go to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
