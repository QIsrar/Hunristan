"use client";

export const dynamic = "force-dynamic";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function VerifyEmailPromptPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") || "";
  
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResend = async () => {
    if (!email) {
      toast.error("Email not found");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/resend-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to resend verification email");
        return;
      }

      setSent(true);
      toast.success("Verification email sent! Check your inbox.");
      
      setTimeout(() => {
        router.push("/auth/signin");
      }, 3000);
    } catch (error) {
      toast.error("Failed to resend verification email");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-purple-900 to-black p-4">
        <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
          <CheckCircle2 size={48} className="text-green-400 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2 text-green-400">Email Sent!</h1>
          <p className="text-muted mb-6">Check your inbox for the verification link.</p>
          <p className="text-sm text-muted">Redirecting to sign in...</p>
          <Link 
            href="/auth/signin" 
            className="mt-6 btn-primary w-full inline-block"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-purple-900 to-black p-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full">
        <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Mail size={32} className="text-cyan-400" />
        </div>
        
        <h1 className="font-display text-2xl font-bold text-center mb-2">Email Not Verified</h1>
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
