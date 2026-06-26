"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="glass rounded-2xl p-8 text-center animate-slide-up">
        <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-green-400" />
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">Check your email</h1>
        <p className="text-muted text-sm mb-6 leading-relaxed">
          We sent a password reset link to <span className="text-text">{email}</span>.
          Check your inbox (and spam folder).
        </p>
        <Link href="/auth/signin" className="btn-secondary flex items-center justify-center gap-2">
          <ArrowLeft size={16} /> Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-8 animate-slide-up">
      <Link href="/auth/signin" className="flex items-center gap-1.5 text-muted text-sm hover:text-accent transition-colors mb-6">
        <ArrowLeft size={14} /> Back to Sign In
      </Link>
      <h1 className="font-display text-2xl font-bold mb-1">Reset Password</h1>
      <p className="text-muted text-sm mb-8">Enter your email and we'll send you a reset link</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-muted mb-2 block">Email Address</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="input-glass pl-10" placeholder="you@university.edu" required />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
    </div>
  );
}
