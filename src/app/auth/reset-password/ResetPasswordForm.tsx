"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Eye, EyeOff, Lock, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const resetToken = searchParams.get("token");
    if (!resetToken) {
      setError("Invalid password reset link. Please request a new one.");
    } else {
      setToken(resetToken);
    }
  }, [searchParams]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setError("Invalid reset token");
      return;
    }

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
      const res = await fetch("/api/verify-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        toast.error(data.error || "Failed to reset password");
        return;
      }

      setDone(true);
      toast.success("Password reset successfully!");
      setTimeout(() => router.push("/auth/signin"), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="glass rounded-2xl p-8 text-center animate-slide-up max-w-md w-full mx-auto">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-red-400" />
        </div>
        <h1 className="font-display text-2xl font-bold mb-2 text-red-400">Invalid Link</h1>
        <p className="text-muted text-sm mb-6">{error}</p>
        <Link href="/auth/forgot-password" className="btn-primary w-full flex items-center justify-center gap-2">
          <ArrowLeft size={16} /> Request New Link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="glass rounded-2xl p-8 text-center animate-slide-up max-w-md w-full mx-auto">
        <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-green-400" />
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">Password Reset!</h1>
        <p className="text-muted text-sm mb-6">Your password has been updated successfully.</p>
        <p className="text-muted text-xs mb-4">Redirecting to sign in...</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-8 animate-slide-up max-w-md w-full mx-auto">
      <Link href="/auth/signin" className="flex items-center gap-1.5 text-muted text-sm hover:text-accent transition-colors mb-6">
        <ArrowLeft size={14} /> Back to Sign In
      </Link>
      
      <h1 className="font-display text-2xl font-bold mb-1">Create New Password</h1>
      <p className="text-muted text-sm mb-8">Enter your new password below</p>

      <form onSubmit={handleReset} className="space-y-4">
        {/* New Password */}
        <div>
          <label className="text-sm text-muted mb-2 block">New Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-glass pl-10 pr-10"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-accent transition-colors"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-muted mt-1">Minimum 8 characters</p>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="text-sm text-muted mb-2 block">Confirm Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type={showPass ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input-glass pl-10 pr-10"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
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

      <form onSubmit={handleReset} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold mb-2">New Password</label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input w-full pr-10"
              disabled={loading}
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-accent transition-colors"
              disabled={loading}
            >
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
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
          <p className="text-xs text-muted mt-1">Must be at least 8 characters</p>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Confirm Password</label>
          <input
            type={showPass ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            className="input w-full"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !password || !confirm}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Lock size={16} />
              Set New Password
            </>
          )}
        </button>
      </form>

      <p className="text-xs text-muted text-center mt-6">
        Remember your password? <Link href="/auth/signin" className="text-accent hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
