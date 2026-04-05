"use client";
import { useEffect, useState } from "react";
import { safeGetUser } from "@/lib/supabase/getUser";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Trophy, Users, Clock, Tag, Calendar, Code2,
  CheckCircle2, Lock, Loader2, ArrowRight, GitBranch,
  AlertCircle, CreditCard, XCircle, Upload
} from "lucide-react";
import type { Hackathon, Problem } from "@/types";
import { format, formatDistanceToNow } from "date-fns";

export default function HackathonDetail() {
  const params = useParams();
  const id = params.id as string;
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
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

      if (hack) {
        setHackathon(hack);
        setIsFull(!!(hack.max_participants && hack.participant_count >= hack.max_participants));
        if (hack.payment_details) {
          try { setPaymentDetails(JSON.parse(hack.payment_details)); } catch {}
        }
      }
      if (probs) setProblems(probs);

      if (user) {
        const { data: reg } = await supabase.from("registrations")
          .select("*").eq("hackathon_id", id).eq("user_id", user.id).maybeSingle();
        if (reg) {
          setRegistered(true);
          setPaymentStatus(reg.payment_status);
          setHasScreenshot(!!reg.payment_screenshot_url);
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
        setHackathon(h => h ? { ...h, status: "active" } : h);
        return;
      }
      if (hackathon.status === "active" && now >= end) {
        await supabase.from("hackathons").update({ status: "ended" }).eq("id", hackathon.id);
        setHackathon(h => h ? { ...h, status: "ended" } : h);
        setTimeLeft("Ended");
        return;
      }
      const target = hackathon.status === "upcoming" ? start : end;
      const diff = target - now;
      if (diff <= 0) { setTimeLeft(hackathon.status === "upcoming" ? "Starting..." : "Ended"); return; }
      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hrs = Math.floor((totalSeconds % 86400) / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      if (days > 0) {
        setTimeLeft(`${days}d ${hrs}h ${mins}m`);
      } else {
        setTimeLeft(`${hrs}:${mins.toString().padStart(2,"0")}:${secs.toString().padStart(2,"0")}`);
      }
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    } finally {
      setRegistering(false);
    }
  };

  const METHOD_LABELS: Record<string, string> = {
    jazzcash: "JazzCash", easypaisa: "Easypaisa", sadapay: "SadaPay",
    nayapay: "NayaPay", bank_transfer: "Bank Transfer", meezan: "Meezan Bank",
    hbl: "HBL", ubl: "UBL", other: "Other",
  };

  const handlePaymentUpload = async () => {
    if (!uploadFile) return toast.error("Select a screenshot first");
    setUploading(true);
    try {
      // Convert file to base64 (API expects JSON with base64)
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(uploadFile);
      });
      const ext = uploadFile.name.split(".").pop() || "jpg";
      const res = await fetch("/api/payment-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hackathon_id: id, image_base64: base64, file_extension: ext, transaction_id: transactionId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPaymentStatus("pending");
      setHasScreenshot(true);
      setUploadFile(null);
      setTransactionId("");
      toast.success("Screenshot uploaded! Awaiting organizer verification.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleUnregister = async () => {
    if (!confirm("Are you sure you want to unregister?")) return;
    setUnregistering(true);
    try {
      const res = await fetch("/api/register-hackathon", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hackathon_id: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRegistered(false);
      setHackathon(h => h ? { ...h, participant_count: Math.max(0, h.participant_count - 1) } : h);
      toast.success("Unregistered successfully");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to unregister");
    } finally {
      setUnregistering(false);
    }
  };

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
  const canEnterLobby = registered && isActive && paymentCleared && problems.length > 0;

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />

      {/* Hero banner */}
      <div className="relative h-64 mt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-surface to-accent2/10" />
        {hackathon.banner_url && <img src={hackathon.banner_url} alt={hackathon.title} className="w-full h-full object-cover opacity-30" />}
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-5xl mx-auto w-full px-6 pb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-sm px-3 py-1 rounded-full badge-${hackathon.status}`}>{hackathon.status}</span>
              {isFull && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">FULL</span>}
              {hackathon.tags.map((t: any) => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-full glass text-muted flex items-center gap-1"><Tag size={8} />{t}</span>
              ))}
            </div>
            <h1 className="font-display text-4xl font-bold">{hackathon.title}</h1>
            <p className="text-muted mt-1">by {(hackathon as any).profiles?.organization || (hackathon as any).profiles?.full_name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass rounded-2xl p-6">
              <h2 className="font-display font-semibold mb-4">About this Hackathon</h2>
              <p className="text-muted leading-relaxed whitespace-pre-wrap">{hackathon.description}</p>
            </div>

            {/* Problems */}
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
                          {String.fromCharCode(65+i)}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{canCompete ? p.title : `Problem ${String.fromCharCode(65+i)}`}</div>
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

              {/* === Action area === */}

              {/* Organizer/admin — can't register */}
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

              {/* Not registered + open + not ended */}
              {userId && !registered && !isEnded && userRole === "participant" && (
                <>
                  {isFull ? (
                    <div className="text-center py-3 px-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                      <p className="text-red-400 text-sm font-medium">Hackathon Full</p>
                      <p className="text-muted text-xs mt-1">Maximum participants reached.</p>
                    </div>
                  ) : (
                    <button onClick={handleRegister} disabled={registering}
                      className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
                      {registering ? <Loader2 size={16} className="animate-spin" /> : null}
                      {hackathon.registration_fee > 0
                        ? `Register — PKR ${hackathon.registration_fee}`
                        : "Register Free"}
                    </button>
                  )}
                </>
              )}

              {/* Registered — payment pending with screenshot already uploaded */}
              {registered && paymentStatus === "pending" && hasScreenshot && (
                <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock size={15} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-amber-400 text-sm font-medium">Payment Under Review</p>
                    <p className="text-muted text-xs mt-1 leading-relaxed">
                      Your screenshot and transaction ID have been submitted. The organizer will verify your payment shortly.
                    </p>
                    <p className="text-muted/60 text-xs mt-2">You'll receive a notification once approved.</p>
                  </div>
                </div>
              )}

              {/* Registered — payment pending but no screenshot yet, OR rejected */}
              {registered && ((paymentStatus === "pending" && !hasScreenshot) || paymentStatus === "rejected") && (
                <div className="space-y-4">
                  {/* Status banner */}
                  <div className={`flex items-start gap-2 p-3 rounded-xl border ${paymentStatus === "rejected" ? "bg-red-500/5 border-red-500/20" : "bg-amber-500/5 border-amber-500/20"}`}>
                    {paymentStatus === "rejected"
                      ? <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                      : <CreditCard size={15} className="text-amber-400 shrink-0 mt-0.5" />}
                    <div>
                      <p className={`text-sm font-medium ${paymentStatus === "rejected" ? "text-red-400" : "text-amber-400"}`}>
                        {paymentStatus === "rejected" ? "Payment Rejected — reupload" : "Payment Required"}
                      </p>
                      <p className="text-muted text-xs mt-0.5">
                        Send PKR {hackathon.registration_fee} and upload your screenshot below.
                      </p>
                    </div>
                  </div>

                  {/* Payment details from organizer */}
                  {paymentDetails && (
                    <div className="p-4 bg-surface/60 rounded-xl border border-border space-y-2">
                      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Send payment to</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Method</span>
                        <span className="font-semibold text-accent">
                          {paymentDetails.bank_name || METHOD_LABELS[paymentDetails.method] || paymentDetails.method}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Name</span>
                        <span className="font-medium">{paymentDetails.account_name}</span>
                      </div>
                      <div className="flex justify-between text-sm items-center gap-2">
                        <span className="text-muted shrink-0">Number</span>
                        <span className="font-mono text-sm font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-lg">{paymentDetails.account_number}</span>
                      </div>
                      {paymentDetails.instructions && (
                        <p className="text-xs text-muted pt-2 border-t border-border/50 leading-relaxed">{paymentDetails.instructions}</p>
                      )}
                    </div>
                  )}

                  {/* Upload screenshot */}
                  <div className="space-y-2">
                    <label className="text-xs text-muted block">Upload payment screenshot *</label>
                    <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${uploadFile ? "border-accent/40 bg-accent/5" : "border-border hover:border-accent/30"}`}>
                      <input type="file" accept="image/*" id="payment-file"
                        className="hidden" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                      <label htmlFor="payment-file" className="cursor-pointer block">
                        {uploadFile
                          ? <><p className="text-sm text-accent font-medium">{uploadFile.name}</p><p className="text-xs text-muted mt-1">Click to change</p></>
                          : <><p className="text-sm text-muted">Click to select screenshot</p><p className="text-xs text-muted/60 mt-1">PNG, JPG up to 5MB</p></>}
                      </label>
                    </div>
                    {/* Transaction ID */}
                    <div>
                      <label className="text-xs text-muted mb-1.5 flex items-center gap-1.5">
                        Transaction ID *
                        <span className="group relative cursor-help">
                          <span className="w-4 h-4 rounded-full bg-muted/30 text-muted text-[10px] flex items-center justify-center font-bold">i</span>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-2.5 bg-card border border-border rounded-lg text-xs text-text leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl whitespace-normal">
                            {paymentDetails?.method === "jazzcash" && "JazzCash: 9-digit transaction ID from confirmation SMS"}
                            {paymentDetails?.method === "easypaisa" && "Easypaisa: 10-12 digit transaction ID from SMS"}
                            {paymentDetails?.method === "sadapay" && "SadaPay: 12-digit reference from transfer receipt"}
                            {paymentDetails?.method === "nayapay" && "NayaPay: 12-digit transaction reference"}
                            {(paymentDetails?.method === "bank_transfer" || paymentDetails?.method === "meezan" || paymentDetails?.method === "hbl" || paymentDetails?.method === "ubl") && "Bank transfer reference/transaction number from your banking app"}
                            {(!paymentDetails?.method || paymentDetails?.method === "other") && "Transaction or reference number shown in your payment confirmation"}
                          </span>
                        </span>
                      </label>
                      <input
                        value={transactionId}
                        onChange={e => setTransactionId(e.target.value.replace(/\s/g, "").toUpperCase())}
                        className="input-glass font-mono tracking-wider"
                        placeholder={
                          paymentDetails?.method === "jazzcash" ? "9-digit ID e.g. 123456789" :
                          paymentDetails?.method === "easypaisa" ? "10-12 digit ID" :
                          paymentDetails?.method === "sadapay" || paymentDetails?.method === "nayapay" ? "12-digit reference" :
                          "Transaction reference number"
                        }
                        maxLength={24}
                      />
                    </div>
                    <button onClick={handlePaymentUpload} disabled={!uploadFile || !transactionId.trim() || uploading}
                      className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                      {uploading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                      {uploading ? "Uploading..." : "Submit Payment Proof"}
                    </button>
                  </div>
                </div>
              )}

              {/* Registered + active + payment OK → Enter Arena */}
              {canEnterLobby && (
                <Link href={`/arena/${hackathon.id}`}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  <Code2 size={16} /> Enter Arena
                </Link>
              )}

              {/* Registered + upcoming + payment OK */}
              {registered && isUpcoming && paymentCleared && (
                <div className="text-center py-3">
                  <CheckCircle2 size={24} className="text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-green-400 font-medium">You're registered!</p>
                  <p className="text-muted text-xs mt-1">
                    Starts {formatDistanceToNow(new Date(hackathon.start_time), { addSuffix: true })}
                  </p>
                </div>
              )}

              {/* Unregister (upcoming only) */}
              {registered && isUpcoming && (
                <button onClick={handleUnregister} disabled={unregistering}
                  className="w-full mt-2 text-xs text-muted hover:text-red-400 transition-colors flex items-center justify-center gap-1 py-1.5">
                  {unregistering ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                  Unregister
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
                    {hackathon.participant_count}{hackathon.max_participants ? `/${hackathon.max_participants}` : ""}
                    {isFull && " — Full"}
                  </span>
                </div>
                <div className="flex justify-between text-muted">
                  <span className="flex items-center gap-1.5"><Calendar size={12} /> Start</span>
                  <span className="text-xs text-right">{format(new Date(hackathon.start_time),"MMM d, h:mm a")}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span className="flex items-center gap-1.5"><Calendar size={12} /> End</span>
                  <span className="text-xs text-right">{format(new Date(hackathon.end_time),"MMM d, h:mm a")}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span className="flex items-center gap-1.5"><GitBranch size={12} /> Languages</span>
                  <span className="text-xs">{hackathon.allowed_languages?.length || 0} supported</span>
                </div>
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