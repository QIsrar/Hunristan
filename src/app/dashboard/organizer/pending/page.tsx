"use client";
import { useEffect, useState } from "react";
import { safeGetUser } from "@/lib/supabase/getUser";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { Clock, CheckCircle2, XCircle, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function OrganizerPendingPage() {
  const [status, setStatus] = useState<"pending"|"rejected"|"loading">("loading");
  const [profile, setProfile] = useState<any>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const user = await safeGetUser();
      if (!user) return router.push("/auth/signin");
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!prof || prof.role !== "organizer") return router.push("/dashboard/participant");
      if (prof.organizer_status === "approved") return router.push("/dashboard/organizer");
      setProfile(prof);
      setStatus(prof.organizer_status === "rejected" ? "rejected" : "pending");
    }
    load();
  }, []);

  if (status === "loading") return null;

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />
      <div className="pt-32 pb-16 px-6 flex items-center justify-center">
        <div className="glass rounded-2xl p-10 max-w-lg w-full text-center animate-slide-up">
          {status === "pending" ? (
            <>
              <div className="w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Clock size={40} className="text-amber-400" />
              </div>
              <h1 className="font-display text-2xl font-bold mb-3">Application Under Review</h1>
              <p className="text-muted leading-relaxed mb-6">
                Hi <span className="text-text font-semibold">{profile?.full_name}</span>, your organizer application
                is being reviewed by our admin team. This typically takes <strong className="text-text">1–3 business days</strong>.
              </p>
              <div className="bg-surface/50 rounded-xl p-4 border border-border text-left space-y-2 mb-6 text-sm">
                <div className="flex justify-between"><span className="text-muted">Organization</span><span className="font-medium">{profile?.organization}</span></div>
                <div className="flex justify-between"><span className="text-muted">Applied as</span><span className="font-medium">{profile?.designation || "Organizer"}</span></div>
                <div className="flex justify-between"><span className="text-muted">Status</span><span className="text-amber-400 font-semibold">Pending Review</span></div>
              </div>
              <p className="text-xs text-muted mb-6">You'll receive a notification once a decision is made. You can continue using Smart Hunristan as a participant in the meantime.</p>
              <Link href="/hackathons" className="btn-primary inline-flex items-center gap-2">
                Browse Hackathons
              </Link>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <XCircle size={40} className="text-red-400" />
              </div>
              <h1 className="font-display text-2xl font-bold mb-3">Application Not Approved</h1>
              <p className="text-muted leading-relaxed mb-6">
                Unfortunately your organizer application was not approved at this time.
                You can address the feedback below and reapply.
              </p>
              {(profile as any)?.rejection_reason && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-left mb-6">
                  <p className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-1">Reason</p>
                  <p className="text-sm text-muted">{(profile as any).rejection_reason}</p>
                </div>
              )}
              <div className="flex gap-3">
                <Link href="/auth/signup?role=organizer" className="btn-primary flex-1 text-center">
                  Reapply
                </Link>
                <Link href="/hackathons" className="btn-secondary flex-1 text-center">
                  Browse Hackathons
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}