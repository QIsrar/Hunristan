"use client";

import { AlertTriangle, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UnauthorizedPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/signin");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-red-900/20 to-black p-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertTriangle size={32} className="text-red-400" />
        </div>

        <h1 className="font-display text-2xl font-bold mb-2 text-red-400">Access Denied</h1>
        <p className="text-muted text-sm mb-6">
          You don't have permission to access this page.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="btn-secondary w-full"
          >
            Go Back
          </button>

          <button
            onClick={handleSignOut}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
