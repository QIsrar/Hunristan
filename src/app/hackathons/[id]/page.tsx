"use client";
import { useEffect, useState } from "react";
import { safeGetUser } from "@/lib/supabase/getUser";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Trophy, Users, Clock, Tag, Calendar, CheckCircle2, Lock, Loader2,
  ArrowRight, GitBranch, AlertCircle, CreditCard, XCircle, Upload,
  Layers, Code2, FileText, Image, FileUp, CheckSquare, Link2, Star,
} from "lucide-react";
import type { Hackathon, Problem, CompetitionCategory } from "@/types";
import { format, formatDistanceToNow } from "date-fns";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  CODE: Code2, TEXT: FileText, IMAGE: Image, FILE: FileUp,
  MCQ: CheckSquare, URL: Link2,
};
const CATEGORY_COLORS: Record<string, string> = {
  CODE: "text-cyan-400", TEXT: "text-violet-400", IMAGE: "text-pink-400",
  FILE: "text-amber-400", MCQ: "text-green-400", URL: "text-orange-400",
};

export default function HackathonDetail() {
  const params = useParams();
  const id = params.id as string;

  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [categories, setCategories] = useState<CompetitionCategory[]>([]);
  const [categorySubmissions, setCategorySubmissions] = useState<Record<string, any>>({});
  const [hasTeam, setHasTeam] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>("not_required");
  const [registering, setRegistering] = useState(false);
  const [unregistering, setUnregistering] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [isFull, setIsFull] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [hasScreenshot, setHasScreenshot] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const user = await safeGetUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        if (profile) setUserRole(profile.role);
      }

      const [{ data: hack }, { data: probs }] = await Promise.all([
        supabase.from("hackathons").select("*,profiles(full_name,organization)").eq("id", id).single(),
        supabase.from("problems").select("*").eq("hackathon_id", id).order("order_index"),
      ]);

      if (!hack) { setNotFound(true); return; }
      setHackathon(hack);
      setIsFull(!!(hack.max_participants && hack.participant_count >= hack.max_participants));
      if (hack.payment_details) {
        try { setPaymentDetails(JSON.parse(hack.payment_details)); } catch { }
      }
      if (probs) setProblems(probs);

      // Load categories for MULTI_TRACK events
      if (hack.competition_type === "MULTI_TRACK") {
        const { data: cats } = await supabase.from("competition_categories")
          .select("*").eq("hackathon_id", id).eq("is_active", true).order("order_index");
        setCategories(cats || []);

        // Load participant's submissions per category
        if (user && cats && cats.length > 0) {
          const { data: subs } = await supabase.from("submissions_v2")
            .select("category_id, ai_status, final_score, ai_score")
            .eq("hackathon_id", id).eq("participant_id", user.id);
          const subMap: Record<string, any> = {};
          for (const s of subs ?? []) { subMap[s.category_id] = s; }
          setCategorySubmissions(subMap);
        }
      }

      if (user) {
        const { data: reg } = await supabase.from("registrations")
          .select("*").eq("hackathon_id", id).eq("user_id", user.id).maybeSingle();
        if (reg) {
          setRegistered(true);
          setPaymentStatus(reg.payment_status);
          setHasScreenshot(!!reg.payment_screenshot_url);
          
          if (hack.allow_teams) {
            const { data: teams } = await supabase.from("teams").select("id").eq("hackathon_id", id);
            if (teams && teams.length > 0) {
              const teamIds = teams.map(t => t.id);
              const { data: tm } = await supabase.from("team_members").select("team_id").eq("user_id", user.id).in("team_id", teamIds).maybeSingle();
              if (tm) {
                const { count } = await supabase.from("team_members").select("*", { count: "exact", head: true }).eq("team_id", tm.team_id);
                if (count && count >= 2) {
                  setHasTeam(true);
                }
              }
            }
          }
        }
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    if (!hackathon) return;
    const tick = async () => {
      const now = Date.now();
      const start = new Date(hackathon.start_time).getTime();
      const end = new Date(hackathon.end_time).getTime();
      if (hackathon.status === "upcoming" && now >= start) {
        await supabase.from("hackathons").update({ status: "active" }).eq("id", hackathon.id);
        setHackathon(h => h ? { ...h, status: "active" } : h); return;
      }
      if (hackathon.status === "active" && now >= end) {
        await supabase.from("hackathons").update({ status: "ended" }).eq("id", hackathon.id);
        setHackathon(h => h ? { ...h, status: "ended" } : h);
        setTimeLeft("Ended"); return;
      }
      const target = hackathon.status === "upcoming" ? start : end;
      const diff = target - now;
      if (diff <= 0) { setTimeLeft(hackathon.status === "upcoming" ? "Starting..." : "Ended"); return; }
      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hrs = Math.floor((totalSeconds % 86400) / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      setTimeLeft(days > 0 ? `${days}d ${hrs}h ${mins}m` : `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [hackathon?.status]);

  const handleRegister = async () => {
    if (!userId) return router.push("/auth/signin?redirect=/hackathons/" + id);
    setRegistering(true);
    try {
      const res = await fetch("/api/register-hackathon", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hackathon_id: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRegistered(true);
      setPaymentStatus(data.requires_payment ? "pending" : "not_required");
      setHackathon(h => h ? { ...h, participant_count: h.participant_count + 1 } : h);
      toast.success(data.message);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally { setRegistering(false); }
  };

  const handlePaymentUpload = async () => {
    if (!uploadFile) return toast.error("Select a screenshot first");
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(uploadFile);
      });
      const ext = uploadFile.name.split(".").pop() || "jpg";
      const res = await fetch("/api/payment-upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hackathon_id: id, image_base64: base64, file_extension: ext, transaction_id: transactionId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPaymentStatus("pending"); setHasScreenshot(true); setUploadFile(null); setTransactionId("");
      toast.success("Screenshot uploaded! Awaiting organizer verification.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally { setUploading(false); }
  };

  const handleUnregister = async () => {
    if (!confirm("Are you sure you want to unregister?")) return;
    setUnregistering(true);
    try {
      const res = await fetch("/api/register-hackathon", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hackathon_id: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRegistered(false);
      setHackathon(h => h ? { ...h, participant_count: Math.max(0, h.participant_count - 1) } : h);
      toast.success("Unregistered successfully");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to unregister");
    } finally { setUnregistering(false); }
  };

  if (notFound) return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-6 text-center px-6">
      <div className="text-7xl">🔍</div>
      <h1 className="font-display text-3xl font-bold">Hackathon Not Found</h1>
      <p className="text-muted max-w-sm">This hackathon doesn&apos;t exist or has been removed.</p>
      <Link href="/hackathons" className="btn-primary">Browse Hackathons</Link>
    </div>
  );

  if (!hackathon) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Loader2 size={32} className="text-accent animate-spin" />
    </div>
  );

  const now = Date.now();
  const isActive = hackathon.status === "active" ||
    (hackathon.status === "upcoming" && now >= new Date(hackathon.start_time).getTime() && now < new Date(hackathon.end_time).getTime());
  const isUpcoming = hackathon.status === "upcoming" && now < new Date(hackathon.start_time).getTime();
  const isEnded = hackathon.status === "ended" || now >= new Date(hackathon.end_time).getTime();
  const paymentCleared = paymentStatus === "not_required" || paymentStatus === "verified";
  const canCompete = registered && isActive && paymentCleared;
  const isMultiTrack = (hackathon as any).competition_type === "MULTI_TRACK";

  const METHOD_LABELS: Record<string, string> = {
    jazzcash: "JazzCash", easypaisa: "Easypaisa", sadapay: "SadaPay",
    nayapay: "NayaPay", bank_transfer: "Bank Transfer", meezan: "Meezan Bank",
    hbl: "HBL", ubl: "UBL", other: "Other",
  };

  // ── Banner gradient ──────────────────────────────────────────────────────
  const words = hackathon.title.trim().split(/\s+/);
  const initials = words.slice(0, 3).map((w: string) => w[0]?.toUpperCase() ?? "").join("");
  const gradients = [
    "from-cyan-500/80 to-violet-600/80", "from-violet-500/80 to-pink-600/80",
    "from-emerald-500/80 to-cyan-600/80", "from-amber-500/80 to-rose-600/80",
    "from-pink-500/80 to-purple-600/80", "from-blue-500/80 to-indigo-600/80",
  ];
  const grad = gradients[(hackathon.title.charCodeAt(0) || 0) % gradients.length];

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />

      {/* Hero banner */}
      <div className={`relative h-64 mt-16 overflow-hidden bg-gradient-to-br ${grad}`}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display font-extrabold text-white/20 text-[9rem] tracking-widest select-none leading-none">{initials}</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-bg/80 via-transparent to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-5xl mx-auto w-full px-6 pb-8">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className={`text-sm px-3 py-1 rounded-full badge-${hackathon.status}`}>{hackathon.status}</span>
              {isMultiTrack && (
                <span className="text-xs px-2 py-0.5 rounded-full glass text-accent border border-accent/30 flex items-center gap-1">
                  <Layers size={10} /> Multi-Track Event
                </span>
              )}
              {isFull && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">FULL</span>}
              {hackathon.tags.map((t: any) => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-full glass text-muted flex items-center gap-1"><Tag size={8} />{t}</span>
              ))}
            </div>
            <h1 className="font-display text-4xl font-bold drop-shadow-lg">{hackathon.title}</h1>
            <p className="text-muted mt-1">by {(hackathon as any).profiles?.organization || (hackathon as any).profiles?.full_name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass rounded-2xl p-6">
              <h2 className="font-display font-semibold mb-4">About this Event</h2>
              <p className="text-muted leading-relaxed whitespace-pre-wrap">{hackathon.description}</p>
            </div>

            {/* ── MULTI_TRACK: Categories grid ── */}
            {isMultiTrack && categories.length > 0 && (
              <div className="glass rounded-2xl p-6">
                <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
                  <Layers size={18} className="text-accent" /> Competition Tracks ({categories.length})
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {categories.map(cat => {
                    const CatIcon = CATEGORY_ICONS[cat.type] ?? FileText;
                    const catColor = CATEGORY_COLORS[cat.type] ?? "text-muted";
                    const sub = categorySubmissions[cat.id];
                    const hasSubmitted = !!sub;
                    const score = sub?.final_score ?? sub?.ai_score;
                    const status = sub?.ai_status;

                    return (
                      <div key={cat.id} className={`relative flex flex-col p-4 rounded-xl border transition-all ${
                        canCompete ? "border-border hover:border-accent/30 hover:bg-white/2 cursor-pointer" : "border-border/50 opacity-60"
                      } bg-surface/20`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-surface border border-border`}>
                              <CatIcon size={15} className={catColor} />
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{cat.name}</div>
                              <div className={`text-xs ${catColor}`}>{cat.type}</div>
                            </div>
                          </div>
                          {hasSubmitted && (
                            status === "DONE"
                              ? <CheckCircle2 size={15} className="text-green-400 shrink-0" />
                              : status === "PROCESSING" || status === "PENDING"
                                ? <Loader2 size={15} className="text-accent animate-spin shrink-0" />
                                : null
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted mt-auto">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1"><Star size={10} /> {cat.max_score} pts</span>
                            {cat.time_limit && <span className="flex items-center gap-1"><Clock size={10} /> {cat.time_limit}m</span>}
                          </div>
                          {score !== undefined && score !== null
                            ? <span className="text-accent font-mono font-bold">{score}/{cat.max_score}</span>
                            : hasSubmitted ? <span className="text-amber-400">Grading...</span>
                              : null
                          }
                        </div>

                        {canCompete && (
                          <Link href={`/arena/${hackathon.id}/category/${cat.id}`}
                            className="absolute inset-0 rounded-xl" aria-label={`Enter ${cat.name}`} />
                        )}
                        {!canCompete && <Lock size={12} className="absolute top-3 right-3 text-muted/30" />}
                      </div>
                    );
                  })}
                </div>
                {canCompete && (
                  <p className="text-xs text-muted mt-3 text-center">Click any track to open the submission arena</p>
                )}
              </div>
            )}

            {/* ── CODING: Problems list ── */}
            {!isMultiTrack && (
              <div className="glass rounded-2xl p-6">
                <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
                  <Code2 size={18} className="text-accent" /> Problems ({problems.length})
                </h2>
                {problems.length === 0 ? (
                  <p className="text-muted text-sm">Problems will be revealed when the hackathon starts.</p>
                ) : (
                  <div className="space-y-3">
                    {problems.map((p: any, i: number) => (
                      <div key={p.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        canCompete ? "border-border hover:border-accent/30 hover:bg-white/2" : "border-border/50 opacity-60"
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-sm font-bold font-display text-muted">
                            {String.fromCharCode(65 + i)}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{canCompete ? p.title : `Problem ${String.fromCharCode(65 + i)}`}</div>
                            <div className="text-xs text-muted mt-0.5">{p.points} points</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full badge-${p.difficulty}`}>{p.difficulty}</span>
                          {canCompete
                            ? <Link href={`/arena/${hackathon.id}/${p.id}`} className="text-accent hover:text-accent/70 transition-colors"><ArrowRight size={14} /></Link>
                            : <Lock size={14} className="text-muted" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Rules */}
            {hackathon.rules && (
              <div className="glass rounded-2xl p-6">
                <h2 className="font-display font-semibold mb-3">Rules</h2>
                <p className="text-muted text-sm leading-relaxed whitespace-pre-wrap">{hackathon.rules}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* CTA card */}
            <div className="glass rounded-2xl p-6">
              {/* Timer */}
              {(isActive || isUpcoming) && timeLeft && (
                <div className="text-center mb-5 pb-5 border-b border-border/50">
                  <div className="text-muted text-xs mb-1">{isActive ? "Time Remaining" : "Starts In"}</div>
                  <div className={`font-display text-3xl font-bold ${isActive ? "text-accent" : "text-accent2"}`}>{timeLeft}</div>
                </div>
              )}

              {/* Organizer/admin */}
              {(userRole === "organizer" || userRole === "admin") && (
                <div className="text-center py-3 px-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <p className="text-amber-400 text-sm font-medium">Organizer/Admin Account</p>
                  <p className="text-muted text-xs mt-1">You cannot register as a participant.</p>
                </div>
              )}

              {/* Not signed in */}
              {!userId && !isEnded && (
                <Link href={`/auth/signin?redirect=/hackathons/${id}`}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  Sign in to Register
                </Link>
              )}

              {/* Not registered */}
              {userId && !registered && !isEnded && userRole === "participant" && (
                isFull ? (
                  <div className="text-center py-3 px-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                    <p className="text-red-400 text-sm font-medium">Hackathon Full</p>
                  </div>
                ) : (
                  <button onClick={handleRegister} disabled={registering}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
                    {registering ? <Loader2 size={16} className="animate-spin" /> : null}
                    {hackathon.registration_fee > 0 ? `Register — PKR ${hackathon.registration_fee}` : "Register Free"}
                  </button>
                )
              )}

              {/* Payment pending + screenshot */}
              {registered && paymentStatus === "pending" && hasScreenshot && (
                <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <Clock size={15} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-400 text-sm font-medium">Payment Under Review</p>
                    <p className="text-muted text-xs mt-1">Awaiting organizer verification.</p>
                  </div>
                </div>
              )}

              {/* Payment pending — needs upload */}
              {registered && ((paymentStatus === "pending" && !hasScreenshot) || paymentStatus === "rejected") && (
                <div className="space-y-4">
                  <div className={`flex items-start gap-2 p-3 rounded-xl border ${paymentStatus === "rejected" ? "bg-red-500/5 border-red-500/20" : "bg-amber-500/5 border-amber-500/20"}`}>
                    {paymentStatus === "rejected" ? <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" /> : <CreditCard size={15} className="text-amber-400 shrink-0 mt-0.5" />}
                    <div>
                      <p className={`text-sm font-medium ${paymentStatus === "rejected" ? "text-red-400" : "text-amber-400"}`}>
                        {paymentStatus === "rejected" ? "Payment Rejected — reupload" : "Payment Required"}
                      </p>
                      <p className="text-muted text-xs mt-0.5">Send PKR {hackathon.registration_fee} and upload screenshot.</p>
                    </div>
                  </div>
                  {paymentDetails && (
                    <div className="p-4 bg-surface/60 rounded-xl border border-border space-y-2">
                      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Send payment to</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Method</span>
                        <span className="font-semibold text-accent">{paymentDetails.bank_name || METHOD_LABELS[paymentDetails.method] || paymentDetails.method}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Name</span>
                        <span className="font-medium">{paymentDetails.account_name}</span>
                      </div>
                      <div className="flex justify-between text-sm items-center gap-2">
                        <span className="text-muted shrink-0">Number</span>
                        <span className="font-mono text-sm font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-lg">{paymentDetails.account_number}</span>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-xs text-muted block">Upload payment screenshot *</label>
                    <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${uploadFile ? "border-accent/40 bg-accent/5" : "border-border hover:border-accent/30"}`}>
                      <input type="file" accept="image/*" id="payment-file" className="hidden" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                      <label htmlFor="payment-file" className="cursor-pointer block">
                        {uploadFile ? <><p className="text-sm text-accent font-medium">{uploadFile.name}</p><p className="text-xs text-muted mt-1">Click to change</p></> : <><Upload size={16} className="mx-auto mb-1 text-muted" /><p className="text-sm text-muted">Click to select screenshot</p></>}
                      </label>
                    </div>
                    <input value={transactionId} onChange={e => setTransactionId(e.target.value.replace(/\s/g, "").toUpperCase())} className="input-glass font-mono tracking-wider" placeholder="Transaction ID" maxLength={24} />
                    <button onClick={handlePaymentUpload} disabled={!uploadFile || !transactionId.trim() || uploading}
                      className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                      {uploading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                      {uploading ? "Uploading..." : "Submit Payment Proof"}
                    </button>
                  </div>
                </div>
              )}

              {/* Multi-track arena CTA */}
              {canCompete && isMultiTrack && categories.length > 0 && (
                <div className="space-y-2">
                  {hackathon.teams_compulsory && !hasTeam ? (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                      <p className="text-red-400 font-semibold mb-2">Team Required</p>
                      <p className="text-muted text-sm mb-3">You must create or join a team before you can compete.</p>
                      <Link href={`/hackathons/${hackathon.id}/teams`} className="btn-primary w-full inline-block">Go to Teams</Link>
                    </div>
                  ) : (
                    <>
                      {categories.slice(0, 3).map(cat => {
                    const CatIcon = CATEGORY_ICONS[cat.type] ?? FileText;
                    const catColor = CATEGORY_COLORS[cat.type] ?? "text-muted";
                    return (
                      <Link key={cat.id} href={`/arena/${hackathon.id}/category/${cat.id}`}
                        className="flex items-center justify-between p-3 glass rounded-xl hover:border-accent/20 transition-all group">
                        <span className="flex items-center gap-2 text-sm">
                          <CatIcon size={14} className={catColor} /> {cat.name}
                        </span>
                        <ArrowRight size={13} className="text-muted group-hover:text-accent transition-colors" />
                      </Link>
                    );
                  })}
                  {categories.length > 3 && (
                    <p className="text-xs text-muted text-center">+{categories.length - 3} more tracks above</p>
                  )}
                    </>
                  )}
                </div>
              )}

              {/* Coding arena CTA */}
              {canCompete && !isMultiTrack && problems.length > 0 && (
                hackathon.teams_compulsory && !hasTeam ? (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center mt-2">
                    <p className="text-red-400 font-semibold mb-2">Team Required</p>
                    <p className="text-muted text-sm mb-3">You must create or join a team before you can compete.</p>
                    <Link href={`/hackathons/${hackathon.id}/teams`} className="btn-primary w-full inline-block">Go to Teams</Link>
                  </div>
                ) : (
                  <Link href={`/arena/${hackathon.id}`}
                    className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                    <Code2 size={16} /> Enter Arena
                  </Link>
                )
              )}

              {/* Registered + upcoming */}
              {registered && isUpcoming && paymentCleared && (
                <div className="text-center py-3">
                  <CheckCircle2 size={24} className="text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-green-400 font-medium">You&apos;re registered!</p>
                  <p className="text-muted text-xs mt-1">Starts {formatDistanceToNow(new Date(hackathon.start_time), { addSuffix: true })}</p>
                </div>
              )}

              {/* Team CTA */}
              {registered && hackathon.allow_teams && !isEnded && paymentCleared && (
                <Link href={`/hackathons/${hackathon.id}/teams`}
                  className="w-full flex items-center justify-center gap-2 mt-2 py-2.5 rounded-xl border border-accent/30 text-accent font-semibold hover:bg-accent/10 transition-colors">
                  <Users size={16} /> Manage Team
                </Link>
              )}

              {/* Unregister */}
              {registered && isUpcoming && (
                <button onClick={handleUnregister} disabled={unregistering}
                  className="w-full mt-2 text-xs text-muted hover:text-red-400 transition-colors flex items-center justify-center gap-1 py-1.5">
                  {unregistering ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />} Unregister
                </button>
              )}

              {/* Ended */}
              {isEnded && (
                <Link href={`/hackathons/${hackathon.id}/leaderboard`}
                  className="btn-secondary w-full flex items-center justify-center gap-2">
                  <Trophy size={16} /> View Final Results
                </Link>
              )}

              {/* Stats */}
              <div className="mt-5 pt-4 border-t border-border/50 space-y-3 text-sm">
                <div className="flex justify-between text-muted">
                  <span className="flex items-center gap-1.5"><Users size={12} /> Participants</span>
                  <span className={isFull ? "text-red-400 font-medium" : ""}>
                    {hackathon.participant_count}{hackathon.max_participants ? `/${hackathon.max_participants}` : ""}{isFull && " — Full"}
                  </span>
                </div>
                <div className="flex justify-between text-muted">
                  <span className="flex items-center gap-1.5"><Calendar size={12} /> Start</span>
                  <span className="text-xs text-right">{format(new Date(hackathon.start_time), "MMM d, h:mm a")}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span className="flex items-center gap-1.5"><Calendar size={12} /> End</span>
                  <span className="text-xs text-right">{format(new Date(hackathon.end_time), "MMM d, h:mm a")}</span>
                </div>
                {!isMultiTrack && (
                  <div className="flex justify-between text-muted">
                    <span className="flex items-center gap-1.5"><GitBranch size={12} /> Languages</span>
                    <span className="text-xs">{hackathon.allowed_languages?.length || 0} supported</span>
                  </div>
                )}
                {hackathon.registration_fee > 0 && (
                  <div className="flex justify-between text-muted">
                    <span className="flex items-center gap-1.5"><CreditCard size={12} /> Entry Fee</span>
                    <span className="text-accent font-medium">PKR {hackathon.registration_fee}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Prizes */}
            {hackathon.prize_details && (
              <div className="glass rounded-2xl p-6">
                <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
                  <Trophy size={16} className="text-accent3" /> Prizes
                </h3>
                <p className="text-muted text-sm whitespace-pre-wrap leading-relaxed">{hackathon.prize_details}</p>
              </div>
            )}

            <Link href={`/hackathons/${hackathon.id}/leaderboard`}
              className="glass rounded-xl p-4 flex items-center justify-between hover:border-accent/20 transition-all group">
              <span className="font-medium text-sm flex items-center gap-2"><Trophy size={14} className="text-accent3" /> Leaderboard</span>
              <ArrowRight size={14} className="text-muted group-hover:text-accent transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}