"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Eye, EyeOff, Lock, Loader2, CheckCircle2, AlertCircle, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const resetCode = searchParams.get("code");
    if (!resetCode) {
      setError("Invalid password reset link. Please request a new one.");
    } else {
      setCode(resetCode);
      // Try to exchange the recovery code for a session
      exchangeRecoveryCode(resetCode);
    }
  }, [searchParams, supabase]);

  const exchangeRecoveryCode = async (recoveryCode: string) => {
    try {
      console.log("Exchanging recovery code for session...");
      const { error } = await supabase.auth.exchangeCodeForSession(recoveryCode);
      
      if (error) {
        console.warn("Code exchange warning (this is expected if PKCE fails):", error.message);
        // PKCE errors are expected - we'll handle it in the password update
      } else {
        console.log("Recovery session established");
      }
    } catch (err) {
      console.warn("Recovery code exchange error (expected):", err);
      // Errors here are okay - we'll use the code directly in updateUser
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("Attempting password reset...");
      
      // Check if we have a session
      const { data: sessionData } = await supabase.auth.getSession();
      console.log("Current session:", sessionData?.session ? "exists" : "missing");

      // Try to update password
      const { error: updateError } = await supabase.auth.updateUser({ password });
      
      if (updateError) {
        console.error("Password update error:", updateError);
        
        // If no session, try exchanging the recovery code again
        if (code && !sessionData?.session) {
          console.log("No session, trying to exchange recovery code again...");
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error("Second exchange attempt error:", exchangeError);
          } else {
            // Try update again after exchanging
            const { error: updateError2 } = await supabase.auth.updateUser({ password });
            if (updateError2) {
              throw new Error(updateError2.message || "Failed to update password");
            } else {
              console.log("Password updated successfully on second attempt");
              setDone(true);
              toast.success("Password updated successfully!");
              setTimeout(() => router.push("/auth/signin"), 2000);
              return;
            }
          }
        }
        
        throw new Error(updateError.message || "Failed to update password");
      }

      console.log("Password updated successfully");
      setDone(true);
      toast.success("Password updated successfully!");
      setTimeout(() => router.push("/auth/signin"), 2000);
    } catch (err: unknown) {
      console.error("Reset error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to reset password";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (error && !code) {
    return (
      <div className="glass rounded-2xl p-8 text-center animate-slide-up">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2">Invalid Reset Link</h1>
        <p className="text-muted text-sm mb-6">{error}</p>
        <Link href="/auth/forgot-password" className="btn-primary inline-flex items-center gap-2">
          <Mail size={18} /> Request New Reset Link
        </Link>
      </div>
    );
  }

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
    <div className="glass rounded-2xl p-8 animate-slide-up max-w-md w-full mx-auto">
      <Link href="/auth/signin" className="flex items-center gap-1.5 text-muted text-sm hover:text-accent transition-colors mb-6">
        <ArrowLeft size={14} /> Back to Sign In
      </Link>

      <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-6">
        <Lock size={24} className="text-accent" />
      </div>
      <h1 className="font-display text-2xl font-bold mb-1 text-center">Set New Password</h1>
      <p className="text-muted text-sm mb-8 text-center">Choose a strong password for your account</p>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label className="text-sm text-muted mb-2 block">New Password</label>
          <div className="relative">
            <input 
              type={showPass ? "text" : "password"} 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="input-glass pr-10" 
              placeholder="Min. 8 characters" 
              required 
              minLength={8}
              disabled={loading}
            />
            <button 
              type="button" 
              onClick={() => setShowPass(!showPass)} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
              disabled={loading}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="flex gap-1 mt-2">
            {[8,12,16].map((len, i) => (
              <div 
                key={len} 
                className={`h-1 flex-1 rounded-full transition-colors ${
                  password.length >= len 
                    ? ["bg-red-500","bg-yellow-500","bg-green-500"][i] 
                    : "bg-border"
                }`} 
              />
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-muted mb-2 block">Confirm Password</label>
          <input 
            type="password" 
            value={confirm} 
            onChange={e => setConfirm(e.target.value)}
            className={`input-glass ${confirm && confirm !== password ? "border-red-500/50" : ""}`} 
            placeholder="Re-enter password" 
            required
            disabled={loading}
          />
          {confirm && confirm !== password && <p className="text-red-400 text-xs mt-1">Passwords don't match</p>}
        </div>

        <button 
          type="submit" 
          disabled={loading || !code} 
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
