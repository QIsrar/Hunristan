"use client";
import { useEffect, useState, useCallback } from "react";
import { safeGetUser } from "@/lib/supabase/getUser";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  Plus, Users, Code2, Trophy, TrendingUp, Edit, Eye,
  Download, CheckCircle2, Clock, BarChart2, Zap, Ban, Trash2,
  Loader2, CreditCard, XCircle, ExternalLink,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import type { Profile, Hackathon } from "@/types";
import { format } from "date-fns";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ui/ConfirmModal";

// ── Small helpers ────────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, color, sub }: any) {
  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden">
      <div className={`absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-10 ${color.replace("text-", "bg-")}`} />
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color.replace("text-", "bg-")}/10`}>
        <Icon size={20} className={color} />
      </div>
      <div className={`font-display text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-muted text-xs uppercase tracking-wider mt-1">{label}</div>
      {sub && <div className="text-muted text-xs mt-1">{sub}</div>}
    </div>
  );
}

function ActionBtn({ href, onClick, tip, hoverColor, newTab, children }: {
  href?: string; onClick?: () => void; tip: string; hoverColor: string; newTab?: boolean; children?: any;
}) {
  const cls = `group relative p-1.5 rounded-lg hover:bg-white/5 text-muted ${hoverColor} transition-colors`;
  const tooltip = (
    <span className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-card border border-border rounded-lg text-xs text-text whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
      {tip}
    </span>
  );
  if (href) return <Link href={href} target={newTab ? "_blank" : undefined} rel={newTab ? "noopener noreferrer" : undefined} className={cls}>{children}{tooltip}</Link>;
  return <button onClick={onClick} className={cls}>{children}{tooltip}</button>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full badge-${status}`}>{status}</span>;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OrganizerDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [verifyingPayment, setVerifyingPayment] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; hackathon: Hackathon | null }>({
    open: false, hackathon: null,
  });

  const supabase = createClient();
  const router = useRouter();

  const fetchData = useCallback(async () => {
    const user = await safeGetUser();
    if (!user) return router.push("/auth/signin");

    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (prof?.role !== "organizer") return router.push(`/dashboard/${prof?.role || "participant"}`);
    // Block access until admin approves
    if ((prof as any).organizer_status !== "approved") {
      router.push("/dashboard/organizer/pending");
      return;
    }
    setProfile(prof);

    const { data: hacks } = await supabase
      .from("hackathons").select("*")
      .eq("organizer_id", user.id)
      .order("created_at", { ascending: false });
    setHackathons(hacks || []);

    if (hacks && hacks.length > 0) {
      const { data: subs } = await supabase
        .from("submissions")
        .select("verdict, language, score, submitted_at, hackathon_id")
        .in("hackathon_id", hacks.map((h: any) => h.id));
      setAllSubmissions(subs || []);

      // Fetch pending payment screenshots for all organizer hackathons
      const { data: payments } = await supabase
        .from("registrations")
        .select("id,hackathon_id,user_id,payment_status,payment_screenshot_url,transaction_id,registered_at,profiles(full_name,email),hackathons(title)")
        .in("hackathon_id", hacks.map((h: any) => h.id))
        .in("payment_status", ["pending"])
        .not("payment_screenshot_url", "is", null)
        .order("registered_at", { ascending: false });
      setPendingPayments(payments || []);
    }

    setLoading(false);
  }, []);

  // Initial load
  useEffect(() => { fetchData(); }, []);

  // Re-fetch when page becomes visible again — fixes stale data after SPA navigation
  // visibilitychange fires on Next.js in-app navigation; window.focus does not
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchData();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchData]);

  // ── Derived chart data ────────────────────────────────────────────────────

  const submissionsByVerdict = [
    { name: "Accepted", value: allSubmissions.filter((s: any) => s.verdict === "accepted").length, fill: "#10b981" },
    { name: "Wrong",    value: allSubmissions.filter((s: any) => s.verdict === "wrong_answer").length, fill: "#ef4444" },
    { name: "TLE",      value: allSubmissions.filter((s: any) => s.verdict === "time_limit_exceeded").length, fill: "#f59e0b" },
    { name: "Runtime",  value: allSubmissions.filter((s: any) => s.verdict === "runtime_error").length, fill: "#f97316" },
  ].filter((d: any) => d.value > 0);

  const langUsage = Object.entries(
    allSubmissions.reduce((acc: Record<string, number>, s) => {
      acc[s.language] = (acc[s.language] || 0) + 1; return acc;
    }, {})
  ).slice(0, 6).map(([lang, count]) => ({ lang, count }));

  const hackathonParticipants = hackathons.slice(0, 6).map((h: any) => ({
    name: h.title.length > 15 ? h.title.slice(0, 15) + "…" : h.title,
    participants: h.participant_count,
  }));

  const totalParticipants = hackathons.reduce((s: any, h: any) => s + h.participant_count, 0);
  const acceptRate = allSubmissions.length > 0
    ? Math.round((allSubmissions.filter((s: any) => s.verdict === "accepted").length / allSubmissions.length) * 100)
    : 0;

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleVerifyPayment = async (registrationId: string, hackathonId: string, action: "verify" | "reject") => {
    setVerifyingPayment(registrationId);
    try {
      const res = await fetch("/api/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: registrationId, action, hackathon_id: hackathonId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPendingPayments(prev => prev.filter((p: any) => p.id !== registrationId));
      toast.success(action === "verify" ? "Payment verified! Participant can now enter arena." : "Payment rejected.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setVerifyingPayment(null);
    }
  };

  const handleDelete = (hackathon: Hackathon) => {
    if (hackathon.is_approved) return;
    setConfirmModal({ open: true, hackathon });
  };

  const confirmDelete = async () => {
    const hackathon = confirmModal.hackathon;
    if (!hackathon) return;
    setConfirmModal({ open: false, hackathon: null });
    const { error } = await supabase.from("hackathons").delete().eq("id", hackathon.id);
    if (error) {
      toast.error("Delete failed: " + error.message);
    } else {
      toast.success("Hackathon deleted.");
      window.location.reload();
    }
  };

  const handleExportCSV = async (hackathon: Hackathon) => {
    try {
      const { data: entries } = await supabase
        .from("leaderboard")
        .select("*, profiles(full_name, email, university)")
        .eq("hackathon_id", hackathon.id)
        .order("total_score", { ascending: false });

      if (!entries || entries.length === 0) { toast.error("No leaderboard data yet"); return; }

      const header = ["Rank","Name","Email","University","Score","Problems Solved","Last Submission"];
      const rows = entries.map((e: any, i: number) => [
        i + 1, e.profiles?.full_name || "", e.profiles?.email || "",
        e.profiles?.university || "", e.total_score, e.problems_solved,
        e.last_submission_at ? new Date(e.last_submission_at).toISOString() : "",
      ]);

      const csv = [header, ...rows]
        .map((row: any) => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${hackathon.title.replace(/[^a-zA-Z0-9]/g, "_")}_leaderboard.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${entries.length} entries`);
    } catch {
      toast.error("Export failed");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />
      <div className="pt-20 px-4 md:px-6 pb-12 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 mt-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent3 to-accent bg-opacity-20 flex items-center justify-center">
              <BarChart2 size={22} className="text-accent3" />
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold">Organizer Dashboard</h1>
              <p className="text-muted text-sm">{profile?.organization || profile?.full_name}</p>
            </div>
          </div>
          <Link href="/hackathons/create" className="btn-primary flex items-center gap-2 self-start md:self-auto">
            <Plus size={18} /> Create Hackathon
          </Link>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard icon={Trophy}     label="Total Hackathons"  value={hackathons.length}        color="text-accent" />
          <MetricCard icon={Users}      label="Total Participants" value={totalParticipants}         color="text-green-400" sub="across all events" />
          <MetricCard icon={Code2}      label="Total Submissions"  value={allSubmissions.length}     color="text-accent2" />
          <MetricCard icon={TrendingUp} label="Accept Rate"        value={`${acceptRate}%`}          color="text-accent3" sub="of all submissions" />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 glass rounded-2xl p-6">
            <h2 className="font-display font-semibold mb-5 flex items-center gap-2">
              <Users size={16} className="text-accent" /> Participants per Hackathon
            </h2>
            {hackathonParticipants.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hackathonParticipants} margin={{ left: -20 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00e5ff" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#f1f5f9" }} />
                  <Bar dataKey="participants" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-16 text-muted text-sm">No hackathons yet</div>
            )}
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="font-display font-semibold mb-5 flex items-center gap-2">
              <Zap size={16} className="text-accent2" /> Submission Outcomes
            </h2>
            {submissionsByVerdict.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={submissionsByVerdict} innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {submissionsByVerdict.map((entry: any, i: number) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {submissionsByVerdict.map((d: any) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: d.fill }} />
                        <span className="text-muted">{d.name}</span>
                      </div>
                      <span className="font-mono">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-muted text-sm">No submissions yet</div>
            )}
          </div>
        </div>

        {/* Language usage */}
        {langUsage.length > 0 && (
          <div className="glass rounded-2xl p-6 mb-8">
            <h2 className="font-display font-semibold mb-5 flex items-center gap-2">
              <Code2 size={16} className="text-accent3" /> Language Usage Across Events
            </h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={langUsage} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="lang" tick={{ fill: "#6b7280", fontSize: 12, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#f1f5f9" }} />
                <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Pending Payments Panel */}
        {pendingPayments.length > 0 && (
          <div className="glass rounded-2xl overflow-hidden mb-6">
            <div className="p-5 border-b border-white/5 flex items-center gap-3">
              <CreditCard size={16} className="text-amber-400" />
              <h2 className="font-display font-semibold">Pending Payment Verifications</h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold">{pendingPayments.length} pending</span>
            </div>
            <div className="divide-y divide-border/50">
              {pendingPayments.map((p: any) => (
                <div key={p.id} className="p-5 flex items-start justify-between gap-4 flex-wrap hover:bg-white/2 transition-colors">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center font-bold text-accent shrink-0">
                      {(p as any).profiles?.full_name?.[0] || "?"}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{(p as any).profiles?.full_name}</div>
                      <div className="text-xs text-muted">{(p as any).profiles?.email}</div>
                      <div className="text-xs text-accent mt-0.5">{(p as any).hackathons?.title}</div>
                      <div className="text-xs text-muted mt-0.5">{p.payment_status === "rejected" ? "⚠️ Previously rejected — resubmitted" : "Awaiting verification"}</div>
                      {p.transaction_id && (
                        <div className="text-xs mt-1 font-mono bg-surface px-2 py-0.5 rounded border border-border inline-block">
                          TXN: <span className="text-accent font-bold">{p.transaction_id}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.payment_screenshot_url && (
                      <a href={p.payment_screenshot_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg glass text-xs text-accent hover:bg-accent/10 transition-colors border border-accent/20">
                        <ExternalLink size={12} /> View Screenshot
                      </a>
                    )}
                    <button onClick={() => handleVerifyPayment(p.id, p.hackathon_id, "verify")}
                      disabled={verifyingPayment === p.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/25 text-green-400 hover:bg-green-500/20 text-xs font-semibold transition-all disabled:opacity-40">
                      {verifyingPayment === p.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Verify
                    </button>
                    <button onClick={() => handleVerifyPayment(p.id, p.hackathon_id, "reject")}
                      disabled={verifyingPayment === p.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all disabled:opacity-40">
                      <XCircle size={12} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hackathons table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-display font-semibold text-lg">My Hackathons</h2>
            <span className="text-muted text-sm">{hackathons.length} total</span>
          </div>

          {hackathons.length === 0 ? (
            <div className="text-center py-20">
              <Trophy size={48} className="text-muted/20 mx-auto mb-4" />
              <p className="text-muted mb-5">Create your first hackathon to unlock analytics</p>
              <Link href="/hackathons/create" className="btn-primary inline-flex items-center gap-2">
                <Plus size={16} /> Create Now
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted text-xs uppercase tracking-wider border-b border-border">
                    {["Hackathon","Status","Participants","Dates","Admin Review","Actions"].map((col: any) => (
                      <th key={col} className={`p-4 ${col === "Actions" ? "text-right" : "text-left"}`}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {hackathons.map((h: any) => (
                    <tr key={h.id} className="hover:bg-white/2 transition-colors">

                      {/* Title + tags */}
                      <td className="p-4">
                        <div className="font-medium">{h.title}</div>
                        <div className="text-muted text-xs mt-0.5 flex gap-1 flex-wrap">
                          {h.tags.slice(0, 3).map((t: any) => (
                            <span key={t} className="px-1.5 py-0.5 bg-surface rounded text-xs">{t}</span>
                          ))}
                        </div>
                      </td>

                      {/* Status badge */}
                      <td className="p-4"><StatusBadge status={h.status} /></td>

                      {/* Participants bar */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-surface rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full"
                              style={{ width: h.max_participants ? `${Math.min(100, (h.participant_count / h.max_participants) * 100)}%` : "0%" }} />
                          </div>
                          <span className="text-xs">{h.participant_count}{h.max_participants ? `/${h.max_participants}` : ""}</span>
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="p-4 text-muted text-xs">
                        {format(new Date(h.start_time), "MMM d")} → {format(new Date(h.end_time), "MMM d, yyyy")}
                      </td>

                      {/* Admin review status */}
                      <td className="p-4">
                        {h.status === "draft" ? (
                          <span className="text-muted text-xs flex items-center gap-1"><Clock size={12} /> Not submitted</span>
                        ) : h.is_approved ? (
                          <span className="text-green-400 text-xs flex items-center gap-1"><CheckCircle2 size={12} /> Approved</span>
                        ) : (h as any).rejection_reason ? (
                          <span className="group relative text-red-400 text-xs flex items-center gap-1 cursor-help">
                            <Ban size={12} /> Rejected
                            <span className="absolute bottom-full left-0 mb-2 w-56 p-2.5 bg-card border border-red-500/20 rounded-lg text-xs text-text leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                              <span className="block text-red-400 font-semibold mb-1">Rejection reason:</span>
                              {(h as any).rejection_reason}
                            </span>
                          </span>
                        ) : (
                          <span className="text-amber-400 text-xs flex items-center gap-1"><Clock size={12} /> Pending review</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          <ActionBtn href={`/hackathons/${h.id}`} tip="View public page" hoverColor="hover:text-accent" newTab><Eye size={14} /></ActionBtn>
                          <ActionBtn 
                            onClick={() => { window.location.href = `/hackathons/${h.id}/edit`; }} 
                            tip={h.is_approved ? "Edit basic info only (approved)" : "Edit hackathon"} 
                            hoverColor="hover:text-accent"
                          ><Edit size={14} /></ActionBtn>
                          <ActionBtn href={`/hackathons/${h.id}/leaderboard`} tip="View leaderboard" hoverColor="hover:text-accent3" newTab><Trophy size={14} /></ActionBtn>
                          <ActionBtn onClick={() => handleExportCSV(h)} tip="Export participants CSV" hoverColor="hover:text-green-400"><Download size={14} /></ActionBtn>
                          {!h.is_approved && (
                            <ActionBtn onClick={() => handleDelete(h)} tip="Delete hackathon" hoverColor="hover:text-red-400"><Trash2 size={14} /></ActionBtn>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmModal.open}
        title="Delete Hackathon"
        message={`Are you sure you want to delete "${confirmModal.hackathon?.title}"? This will permanently remove the hackathon and all its problems. This cannot be undone.`}
        confirmLabel="Yes, Delete"
        cancelLabel="Keep It"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmModal({ open: false, hackathon: null })}
      />
    </div>
  );
}