"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Eye, EyeOff, Lock, Loader2, CheckCircle2 } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords don't match");
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => router.push("/auth/signin"), 2000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="glass rounded-2xl p-8 text-center animate-slide-up">
        <CheckCircle2 size={48} className="text-green-400 mx-auto mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2">Password Updated!</h1>
        <p className="text-muted text-sm">Redirecting you to sign in...</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-8 animate-slide-up">
      <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-6">
        <Lock size={24} className="text-accent" />
      </div>
      <h1 className="font-display text-2xl font-bold mb-1 text-center">Set New Password</h1>
      <p className="text-muted text-sm mb-8 text-center">Choose a strong password for your account</p>

      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label className="text-sm text-muted mb-2 block">New Password</label>
          <div className="relative">
            <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
              className="input-glass pr-10" placeholder="Min. 8 characters" required minLength={8} />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="flex gap-1 mt-2">
            {[8,12,16].map((len, i) => (
              <div key={len} className={`h-1 flex-1 rounded-full transition-colors ${password.length >= len ? ["bg-red-500","bg-yellow-500","bg-green-500"][i] : "bg-border"}`} />
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm text-muted mb-2 block">Confirm Password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            className={`input-glass ${confirm && confirm !== password ? "border-red-500/50" : ""}`} placeholder="Re-enter password" required />
          {confirm && confirm !== password && <p className="text-red-400 text-xs mt-1">Passwords don't match</p>}
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
