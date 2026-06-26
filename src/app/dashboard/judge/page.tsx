"use client";
import { useEffect, useState, useCallback } from "react";
import { safeGetUser } from "@/lib/supabase/getUser";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Trophy, CheckCircle2, Loader2, AlertCircle, Clock, Star,
  FileText, Image, FileUp, Link2, CheckSquare, Code2,
  ChevronDown, ChevronUp, Save, Eye, Filter, ArrowLeft,
  Cpu, User, BarChart3,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
interface JudgeItem {
  id: string;
  participant_id: string;
  hackathon_id: string;
  category_id: string;
  ai_score: number | null;
  human_score: number | null;
  final_score: number | null;
  ai_feedback: string | null;
  ai_breakdown: Record<string, number> | null;
  ai_status: string;
  text_content: string | null;
  file_url: string | null;
  file_name: string | null;
  github_url: string | null;
  mcq_answers: Record<string, string> | null;
  submitted_at: string;
  human_feedback: string | null;
  competition_categories: {
    name: string;
    type: string;
    max_score: number;
    rubric_json: { name: string; weight: number }[];
  };
  hackathons: { title: string; end_time: string };
  profiles: { full_name: string; university: string | null };
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  TEXT: FileText, IMAGE: Image, FILE: FileUp, MCQ: CheckSquare, URL: Link2, CODE: Code2,
};
const TYPE_COLORS: Record<string, string> = {
  TEXT: "text-violet-400", IMAGE: "text-pink-400", FILE: "text-amber-400",
  MCQ: "text-green-400", URL: "text-orange-400", CODE: "text-cyan-400",
};
const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  PENDING: { color: "text-muted", label: "Pending", icon: Clock },
  PROCESSING: { color: "text-accent", label: "Processing", icon: Loader2 },
  DONE: { color: "text-green-400", label: "AI Scored", icon: Cpu },
  FAILED: { color: "text-red-400", label: "AI Failed", icon: AlertCircle },
};

// ─── Score bar ───────────────────────────────────────────────────────────────
function ScoreBar({ value, max, color = "#00e5ff" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 bg-surface rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ─── Submission Preview ───────────────────────────────────────────────────────
function SubmissionPreview({ item }: { item: JudgeItem }) {
  const type = item.competition_categories.type;

  if (type === "TEXT" && item.text_content) return (
    <div className="p-4 bg-surface/60 rounded-xl border border-border/50 text-sm leading-relaxed text-muted max-h-64 overflow-y-auto whitespace-pre-wrap">
      {item.text_content}
    </div>
  );

  if ((type === "IMAGE" || type === "FILE") && item.file_url) return (
    <div className="space-y-2">
      {type === "IMAGE" ? (
        <img src={item.file_url} alt="Submission" className="w-full max-h-64 object-contain rounded-xl border border-border" onError={e => { (e.target as any).style.display = "none"; }} />
      ) : null}
      <a href={item.file_url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 p-3 glass rounded-xl hover:border-accent/20 transition-all text-sm">
        <FileUp size={14} className="text-amber-400" />
        <span className="truncate">{item.file_name || "View file"}</span>
        <Eye size={12} className="ml-auto text-muted" />
      </a>
    </div>
  );

  if (type === "URL" && item.github_url) return (
    <div className="space-y-2">
      <a href={item.github_url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 p-3 glass rounded-xl hover:border-accent/20 transition-all text-sm">
        <Link2 size={14} className="text-orange-400" />
        <span className="truncate text-accent">{item.github_url}</span>
        <Eye size={12} className="ml-auto text-muted" />
      </a>
      {item.text_content && (
        <div className="text-xs text-muted p-3 bg-surface/50 rounded-xl border border-border/50 leading-relaxed">
          {item.text_content}
        </div>
      )}
    </div>
  );

  if (type === "MCQ" && item.mcq_answers) return (
    <div className="p-3 bg-surface/60 rounded-xl border border-border/50 text-xs font-mono text-muted">
      {Object.entries(item.mcq_answers).map(([qId, ans]) => (
        <div key={qId} className="flex gap-2">
          <span className="text-muted/50">{qId.slice(0, 8)}:</span>
          <span className="text-accent font-bold">{ans}</span>
        </div>
      ))}
    </div>
  );

  return <p className="text-xs text-muted italic">No preview available</p>;
}

// ─── Judge Card ───────────────────────────────────────────────────────────────
function JudgeCard({ item, onSaved }: { item: JudgeItem; onSaved: (id: string, humanScore: number, humanFeedback: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [humanScore, setHumanScore] = useState<string>(item.human_score?.toString() ?? "");
  const [humanFeedback, setHumanFeedback] = useState(item.human_feedback ?? "");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const maxScore = item.competition_categories.max_score;
  const TypeIcon = TYPE_ICONS[item.competition_categories.type] ?? FileText;
  const typeColor = TYPE_COLORS[item.competition_categories.type] ?? "text-muted";
  const statusCfg = STATUS_CONFIG[item.ai_status] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = statusCfg.icon;

  const handleSave = async () => {
    const score = parseInt(humanScore);
    if (isNaN(score) || score < 0 || score > maxScore) {
      toast.error(`Score must be between 0 and ${maxScore}`); return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("submissions_v2").update({
        human_score: score,
        human_feedback: humanFeedback.trim() || null,
      }).eq("id", item.id);
      if (error) throw error;
      onSaved(item.id, score, humanFeedback);
      toast.success("Score saved!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally { setSaving(false); }
  };

  const handleApproveAI = async () => {
    if (item.ai_score === null) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("submissions_v2").update({
        human_score: item.ai_score,
        human_feedback: item.ai_feedback || "AI score approved by judge.",
      }).eq("id", item.id);
      if (error) throw error;
      setHumanScore(item.ai_score.toString());
      setHumanFeedback(item.ai_feedback || "AI score approved by judge.");
      onSaved(item.id, item.ai_score, item.ai_feedback || "");
      toast.success("AI score approved!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally { setSaving(false); }
  };

  return (
    <div className={`glass rounded-2xl overflow-hidden transition-all ${expanded ? "border-accent/20" : ""}`}>
      {/* Header (always visible) */}
      <div className="flex items-center gap-4 p-5">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/40 to-accent2/40 flex items-center justify-center font-bold text-bg shrink-0">
          {item.profiles?.full_name?.[0] ?? "?"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-sm truncate">{item.profiles?.full_name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-md flex items-center gap-1 ${typeColor}`}>
              <TypeIcon size={10} /> {item.competition_categories.type}
            </span>
            <span className={`text-xs flex items-center gap-1 ${statusCfg.color}`}>
              <StatusIcon size={10} className={item.ai_status === "PROCESSING" ? "animate-spin" : ""} />
              {statusCfg.label}
            </span>
          </div>
          <div className="text-xs text-muted truncate">
            {item.competition_categories.name} · {item.hackathons.title}
          </div>
          <div className="text-xs text-muted/50">
            Submitted {formatDistanceToNow(new Date(item.submitted_at), { addSuffix: true })}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Score display */}
          <div className="text-right hidden sm:block">
            <div className="flex items-center gap-1 justify-end text-xs text-muted mb-0.5">
              <Cpu size={10} /> AI
            </div>
            <div className={`font-mono text-sm font-bold ${item.ai_score !== null ? "text-accent" : "text-muted/40"}`}>
              {item.ai_score ?? "—"}<span className="text-muted/40">/{maxScore}</span>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="flex items-center gap-1 justify-end text-xs text-muted mb-0.5">
              <User size={10} /> Human
            </div>
            <div className={`font-mono text-sm font-bold ${item.human_score !== null ? "text-green-400" : "text-muted/40"}`}>
              {item.human_score ?? "—"}<span className="text-muted/40">/{maxScore}</span>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="flex items-center gap-1 justify-end text-xs text-muted mb-0.5">
              <Star size={10} /> Final
            </div>
            <div className={`font-mono text-sm font-bold ${item.final_score !== null ? "text-accent3" : "text-muted/40"}`}>
              {item.final_score ?? "—"}<span className="text-muted/40">/{maxScore}</span>
            </div>
          </div>
          <button onClick={() => setExpanded(e => !e)}
            className="glass p-2 rounded-lg hover:border-accent/20 transition-all">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border/50 p-5 space-y-5">
          {/* AI result */}
          {item.ai_status === "DONE" && (
            <div className="p-4 bg-accent/5 border border-accent/15 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-1.5 text-accent"><Cpu size={14} /> AI Evaluation</h4>
                <span className="font-mono text-sm font-bold text-accent">{item.ai_score}/{maxScore}</span>
              </div>
              <ScoreBar value={item.ai_score ?? 0} max={maxScore} />
              {item.ai_feedback && <p className="text-xs text-muted leading-relaxed">{item.ai_feedback}</p>}
              {item.ai_breakdown && Object.keys(item.ai_breakdown).length > 0 && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(item.ai_breakdown).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-muted truncate">{k}</span>
                      <span className="font-mono text-accent ml-1">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {item.ai_status === "FAILED" && (
            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center gap-3">
              <AlertCircle size={15} className="text-red-400 shrink-0" />
              <p className="text-xs text-muted">AI evaluation failed. Please score manually.</p>
            </div>
          )}

          {/* Submission preview */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5"><Eye size={13} /> Submission</h4>
            <SubmissionPreview item={item} />
          </div>

          {/* Human judge panel */}
          <div className="p-4 bg-surface/60 rounded-xl border border-border space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-1.5"><User size={13} className="text-green-400" /> Your Assessment</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted mb-1.5 block">Your Score (0–{maxScore})</label>
                <input
                  type="number"
                  value={humanScore}
                  onChange={e => setHumanScore(e.target.value)}
                  min={0} max={maxScore}
                  className="input-glass font-mono text-lg w-full"
                  placeholder={`0–${maxScore}`}
                />
                {item.ai_score !== null && (
                  <p className="text-xs text-muted mt-1">
                    AI gave: <span className="text-accent font-mono">{item.ai_score}</span>
                    {" — "}
                    <button onClick={handleApproveAI} className="text-accent hover:underline">approve AI score</button>
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Final Score Preview</label>
                <div className="glass rounded-xl p-3 text-center">
                  <div className="font-display text-2xl font-bold text-accent3">
                    {humanScore !== "" && item.ai_score !== null
                      ? Math.round(item.ai_score * 0.4 + parseInt(humanScore) * 0.6)
                      : humanScore !== ""
                        ? humanScore
                        : "—"}
                  </div>
                  <div className="text-xs text-muted mt-1">
                    {item.ai_score !== null
                      ? `40% AI (${item.ai_score}) + 60% Human (${humanScore || "?"})`
                      : "100% Human score"}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted mb-1.5 block">Feedback for Participant (optional)</label>
              <textarea
                value={humanFeedback}
                onChange={e => setHumanFeedback(e.target.value)}
                rows={3}
                className="input-glass resize-none text-sm w-full"
                placeholder="Share constructive feedback visible to the participant..."
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={saving || humanScore === ""}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {item.human_score !== null ? "Update Score" : "Save Score"}
              </button>
              {item.ai_score !== null && item.human_score === null && (
                <button onClick={handleApproveAI} disabled={saving}
                  className="btn-secondary flex items-center gap-2 text-sm">
                  <CheckCircle2 size={14} className="text-green-400" /> Approve AI Score
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function JudgeDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [items, setItems] = useState<JudgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending_human" | "DONE" | "FAILED">("all");
  const [hackathonFilter, setHackathonFilter] = useState<string>("all");
  const [hackathons, setHackathons] = useState<{ id: string; title: string }[]>([]);

  const load = useCallback(async () => {
    const user = await safeGetUser();
    if (!user) { router.push("/auth/signin"); return; }

    // Check role
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || (profile.role !== "organizer" && profile.role !== "admin")) {
      router.push("/dashboard/participant"); return;
    }

    // For organizers: only their hackathons. For admins: all.
    const hQuery = profile.role === "admin"
      ? supabase.from("hackathons").select("id, title").neq("competition_type", "CODING").order("created_at", { ascending: false })
      : supabase.from("hackathons").select("id, title").eq("organizer_id", user.id).neq("competition_type", "CODING").order("created_at", { ascending: false });

    const { data: hacks } = await hQuery;
    setHackathons(hacks || []);

    if (!hacks || hacks.length === 0) { setLoading(false); return; }

    const hackIds = hacks.map(h => h.id);
    const { data: subs } = await supabase.from("submissions_v2")
      .select(`
        *,
        competition_categories(name, type, max_score, rubric_json),
        hackathons(title, end_time),
        profiles(full_name, university)
      `)
      .in("hackathon_id", hackIds)
      .order("submitted_at", { ascending: false });

    setItems(subs || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (id: string, humanScore: number, humanFeedback: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, human_score: humanScore, human_feedback: humanFeedback } : item));
  };

  const filtered = items.filter(item => {
    if (hackathonFilter !== "all" && item.hackathon_id !== hackathonFilter) return false;
    if (filter === "pending_human") return item.ai_status === "DONE" && item.human_score === null;
    if (filter === "DONE") return item.ai_status === "DONE";
    if (filter === "FAILED") return item.ai_status === "FAILED";
    return true;
  });

  const stats = {
    total: items.length,
    aiDone: items.filter(i => i.ai_status === "DONE").length,
    pendingHuman: items.filter(i => i.ai_status === "DONE" && i.human_score === null).length,
    failed: items.filter(i => i.ai_status === "FAILED").length,
    humanDone: items.filter(i => i.human_score !== null).length,
  };

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Loader2 size={32} className="text-accent animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />
      <div className="pt-24 pb-16 px-4 md:px-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/organizer" className="glass p-2 rounded-xl hover:border-accent/20 transition-all">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display text-3xl font-bold">Judge Dashboard</h1>
            <p className="text-muted text-sm mt-0.5">Review and grade multi-track submissions</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total Submissions", value: stats.total, color: "text-accent", icon: BarChart3 },
            { label: "AI Scored", value: stats.aiDone, color: "text-cyan-400", icon: Cpu },
            { label: "Need Human Review", value: stats.pendingHuman, color: "text-amber-400", icon: Clock },
            { label: "AI Failed", value: stats.failed, color: "text-red-400", icon: AlertCircle },
            { label: "Fully Graded", value: stats.humanDone, color: "text-green-400", icon: CheckCircle2 },
          ].map(s => (
            <div key={s.label} className="glass rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <s.icon size={14} className={s.color} />
                <span className="text-xs text-muted">{s.label}</span>
              </div>
              <div className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted" />
            <span className="text-sm text-muted">Filter:</span>
          </div>
          {[
            { key: "all", label: "All" },
            { key: "pending_human", label: `Needs Review (${stats.pendingHuman})` },
            { key: "DONE", label: "AI Scored" },
            { key: "FAILED", label: "AI Failed" },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key as any)}
              className={`text-sm px-3 py-1.5 rounded-lg transition-all ${filter === f.key ? "bg-accent text-bg" : "glass text-muted hover:text-text"}`}>
              {f.label}
            </button>
          ))}
          {hackathons.length > 1 && (
            <select value={hackathonFilter} onChange={e => setHackathonFilter(e.target.value)}
              className="input-glass text-sm ml-auto">
              <option value="all">All Events</option>
              {hackathons.map(h => <option key={h.id} value={h.id}>{h.title}</option>)}
            </select>
          )}
        </div>

        {/* Submissions */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Trophy size={48} className="text-muted/20 mx-auto mb-4" />
            <p className="text-muted font-display text-xl">No submissions here yet</p>
            <p className="text-muted/60 text-sm mt-2">
              {filter === "pending_human"
                ? "All AI-scored submissions have been reviewed!"
                : "Submissions from your multi-track events will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted mb-2">
              <span>Showing {filtered.length} submission{filtered.length !== 1 ? "s" : ""}</span>
            </div>
            {filtered.map(item => (
              <JudgeCard key={item.id} item={item} onSaved={handleSaved} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
