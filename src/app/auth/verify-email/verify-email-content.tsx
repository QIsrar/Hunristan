"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link - token is missing.");
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch("/api/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok) {
          setStatus("error");
          setMessage(data.error || "Failed to verify email");
        } else {
          setStatus("success");
          setMessage("Your email has been verified successfully!");
          toast.success("Email verified!");
          setTimeout(() => {
            router.push("/auth/signin");
          }, 3000);
        }
      } catch (error) {
        setStatus("error");
        setMessage("An error occurred while verifying your email");
        console.error(error);
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-purple-900 to-black p-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <div className="animate-spin">
              <div className="w-12 h-12 rounded-full border-4 border-accent/20 border-t-accent mx-auto" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2 mt-4">Verifying Your Email</h1>
            <p className="text-muted">Please wait while we verify your email address...</p>
          </>
        )}

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
