"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { safeGetUser } from "@/lib/supabase/getUser";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft, Clock, Trophy, CheckCircle2, Loader2, AlertCircle,
  FileText, Image, FileUp, Link2, CheckSquare, Code2,
  UploadCloud, X, Send, ChevronDown, Star, Lock,
} from "lucide-react";
import type { CompetitionCategory, McqQuestion, SubmissionV2, RubricCriterion } from "@/types";
import SubmissionTimer from "@/components/arena/SubmissionTimer";

// ─── Type icons ───────────────────────────────────────────────────────────────
const TYPE_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  TEXT: { icon: FileText, color: "text-violet-400", label: "Text Submission" },
  IMAGE: { icon: Image, color: "text-pink-400", label: "Image Upload" },
  FILE: { icon: FileUp, color: "text-amber-400", label: "File Upload" },
  MCQ: { icon: CheckSquare, color: "text-green-400", label: "Quiz / MCQ" },
  URL: { icon: Link2, color: "text-orange-400", label: "GitHub / URL" },
  CODE: { icon: Code2, color: "text-cyan-400", label: "Code Submission" },
};

// ─── Countdown Timer ─────────────────────────────────────────────────────────
function Countdown({ endsAt }: { endsAt: Date }) {
  const [display, setDisplay] = useState("");
  useEffect(() => {
    const tick = () => {
      const diff = endsAt.getTime() - Date.now();
      if (diff <= 0) { setDisplay("Ended"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setDisplay(h > 0 ? `${h}h ${m}m ${s}s` : `${m}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [endsAt]);
  return <span className="font-mono font-bold text-accent">{display}</span>;
}

// ─── Score Card ───────────────────────────────────────────────────────────────
function ScoreDisplay({ sub, maxScore }: { sub: SubmissionV2; maxScore: number }) {
  if (sub.ai_status === "PENDING") return (
    <div className="flex items-center gap-2 text-muted text-sm">
      <Clock size={14} /> Awaiting AI evaluation...
    </div>
  );
  if (sub.ai_status === "PROCESSING") return (
    <div className="flex items-center gap-2 text-accent text-sm">
      <Loader2 size={14} className="animate-spin" /> AI is evaluating...
    </div>
  );
  if (sub.ai_status === "FAILED") return (
    <div className="flex items-center gap-2 text-red-400 text-sm">
      <AlertCircle size={14} /> Evaluation failed — organizer will grade manually
    </div>
  );

  const displayScore = sub.final_score ?? sub.ai_score ?? 0;
  const pct = maxScore > 0 ? Math.round((displayScore / maxScore) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <span className="font-display text-3xl font-bold text-accent">{displayScore}</span>
        <span className="text-muted text-sm mb-1">/ {maxScore}</span>
        {sub.human_score !== null && sub.human_score !== undefined && (
          <span className="text-xs px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full ml-1">Human reviewed</span>
        )}
      </div>
      <div className="h-2 bg-surface rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444" }} />
      </div>
      {sub.ai_feedback && (
        <div className="text-xs text-muted leading-relaxed bg-surface/50 rounded-lg p-3 border border-border/50">
          <span className="text-accent font-semibold">AI Feedback: </span>{sub.ai_feedback}
        </div>
      )}
      {sub.ai_breakdown && Object.keys(sub.ai_breakdown).length > 0 && (
        <div className="space-y-1 mt-2">
          {Object.entries(sub.ai_breakdown).map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs">
              <span className="text-muted">{k}</span>
              <span className="font-mono">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TEXT Panel ───────────────────────────────────────────────────────────────
function TextPanel({ value, onChange, readOnly }: { value: string; onChange: (v: string) => void; readOnly?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted">
        <span>Your text submission</span>
        <span>{value.length} chars · {value.trim().split(/\s+/).filter(Boolean).length} words</span>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        readOnly={readOnly}
        rows={14}
        placeholder="Write your submission here. Be clear, detailed, and structured..."
        className="input-glass resize-none text-sm leading-relaxed w-full"
      />
    </div>
  );
}

// ─── FILE / IMAGE Upload Panel ────────────────────────────────────────────────
function FilePanel({
  accept, label, file, onFile, uploading, readOnly, existingUrl, existingName,
}: {
  accept: string; label: string;
  file: File | null; onFile: (f: File | null) => void;
  uploading?: boolean; readOnly?: boolean;
  existingUrl?: string; existingName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  if (existingUrl) return (
    <div className="flex items-center gap-3 p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
      <CheckCircle2 size={18} className="text-green-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-green-400">File submitted</p>
        <a href={existingUrl} target="_blank" rel="noopener noreferrer"
          className="text-xs text-muted hover:text-accent transition-colors truncate block">{existingName || "View file"}</a>
      </div>
    </div>
  );

  if (readOnly) return null;

  return (
    <div className="space-y-3">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault(); setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragging ? "border-accent bg-accent/5 scale-[1.01]" : file ? "border-green-500/40 bg-green-500/5" : "border-border hover:border-accent/40"
        }`}
      >
        <input ref={inputRef} type="file" accept={accept} className="hidden"
          onChange={e => onFile(e.target.files?.[0] ?? null)} />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <CheckCircle2 size={20} className="text-green-400" />
            <div className="text-left">
              <p className="text-sm font-medium text-green-400">{file.name}</p>
              <p className="text-xs text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button type="button" onClick={e => { e.stopPropagation(); onFile(null); }}
              className="ml-2 text-muted hover:text-red-400 transition-colors">
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <UploadCloud size={32} className="text-muted/40 mx-auto mb-3" />
            <p className="text-sm text-muted">Drag & drop or <span className="text-accent">click to select</span></p>
            <p className="text-xs text-muted/60 mt-1">{label}</p>
          </>
        )}
      </div>
      {uploading && (
        <div className="flex items-center gap-2 text-sm text-accent">
          <Loader2 size={14} className="animate-spin" /> Uploading to server...
        </div>
      )}
    </div>
  );
}

// ─── URL Panel ────────────────────────────────────────────────────────────────
function UrlPanel({ url, onUrl, description, onDescription, readOnly }: {
  url: string; onUrl: (v: string) => void;
  description: string; onDescription: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted mb-1.5 block">GitHub Repository URL *</label>
        <input value={url} onChange={e => onUrl(e.target.value)} readOnly={readOnly}
          placeholder="https://github.com/yourusername/your-project"
          className="input-glass font-mono text-sm" />
        {url && !url.includes("github.com") && (
          <p className="text-xs text-amber-400 mt-1">⚠ Paste a valid GitHub repository URL for AI evaluation</p>
        )}
      </div>
      <div>
        <label className="text-xs text-muted mb-1.5 block">Project Description (optional)</label>
        <textarea value={description} onChange={e => onDescription(e.target.value)} readOnly={readOnly}
          rows={4} placeholder="Briefly describe your project, tech stack, and what makes it unique..."
          className="input-glass resize-none text-sm" />
      </div>
    </div>
  );
}

// ─── MCQ Panel ────────────────────────────────────────────────────────────────
function McqPanel({
  questions, answers, onAnswer, readOnly,
}: {
  questions: Omit<McqQuestion, "correct_ans">[];
  answers: Record<string, string>;
  onAnswer: (qId: string, choice: string) => void;
  readOnly?: boolean;
}) {
  const CHOICES = ["A", "B", "C", "D"];
  return (
    <div className="space-y-5">
      {questions.map((q, i) => (
        <div key={q.id} className="border border-border rounded-xl p-5 bg-surface/20">
          <p className="text-sm font-medium mb-4">
            <span className="text-muted font-mono mr-2">Q{i + 1}.</span> {q.question}
            <span className="ml-2 text-xs text-muted">({q.marks} mark{q.marks !== 1 ? "s" : ""})</span>
          </p>
          <div className="space-y-2">
            {q.options.map((opt, oi) => {
              const choice = CHOICES[oi];
              const selected = answers[q.id] === choice;
              return (
                <button
                  key={oi}
                  type="button"
                  disabled={readOnly}
                  onClick={() => onAnswer(q.id, choice)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left text-sm transition-all ${
                    selected
                      ? "bg-accent/15 border-2 border-accent text-text"
                      : "glass border border-border hover:border-accent/30 hover:bg-white/3 text-muted"
                  } ${readOnly ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${selected ? "bg-accent text-bg" : "bg-surface text-muted"}`}>
                    {choice}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CategoryArena() {
  const { hackathonId, categoryId } = useParams() as { hackathonId: string; categoryId: string };
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [category, setCategory] = useState<CompetitionCategory | null>(null);
  const [hackathon, setHackathon] = useState<any>(null);
  const [submission, setSubmission] = useState<SubmissionV2 | null>(null);
  const [mcqQuestions, setMcqQuestions] = useState<Omit<McqQuestion, "correct_ans">[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Submission state
  const [textValue, setTextValue] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [urlDescription, setUrlDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});

  // Timer: record when the participant first opens the page
  const timerStartedAt = useRef<number>(Date.now());

  // MCQ redirect countdown after scoring
  const [mcqRedirectSecs, setMcqRedirectSecs] = useState<number | null>(null);

  const load = useCallback(async () => {
    const user = await safeGetUser();
    if (!user) return router.push(`/auth/signin?redirect=/arena/${hackathonId}/category/${categoryId}`);
    setUserId(user.id);

    const [{ data: cat }, { data: hack }] = await Promise.all([
      supabase.from("competition_categories").select("*").eq("id", categoryId).single(),
      supabase.from("hackathons").select("title, start_time, end_time, status, organizer_id, allow_teams, teams_compulsory").eq("id", hackathonId).single(),
    ]);

    if (!cat || !hack) { toast.error("Category not found"); router.push(`/hackathons/${hackathonId}`); return; }
    setCategory(cat);
    setHackathon(hack);

    if (hack.allow_teams && hack.teams_compulsory) {
      const { data: teams } = await supabase.from("teams").select("id").eq("hackathon_id", hackathonId);
      let hasTeam = false;
      if (teams && teams.length > 0) {
        const teamIds = teams.map(t => t.id);
        const { data: tm } = await supabase.from("team_members").select("team_id").eq("user_id", user.id).in("team_id", teamIds).maybeSingle();
        if (tm) {
          const { count } = await supabase.from("team_members").select("*", { count: "exact", head: true }).eq("team_id", tm.team_id);
          if (count && count >= 2) hasTeam = true;
        }
      }
      if (!hasTeam) {
        toast.error("Team participation is compulsory. Your team must have at least 2 members to enter.");
        return router.push(`/hackathons/${hackathonId}/teams`);
      }
    }

    // Load MCQ questions (without correct_ans — RLS hides it)
    if (cat.type === "MCQ") {
      const { data: qs } = await supabase.from("mcq_questions")
        .select("id, question, options, marks, order_index, category_id, created_at")
        .eq("category_id", categoryId).order("order_index");
      setMcqQuestions((qs || []) as Omit<McqQuestion, "correct_ans">[]);
    }

    // Check for existing submission
    const { data: sub } = await supabase.from("submissions_v2")
      .select("*").eq("category_id", categoryId).eq("participant_id", user.id).maybeSingle();

    if (sub) {
      setSubmission(sub);
      if (sub.text_content) setTextValue(sub.text_content);
      if (sub.github_url) setUrlValue(sub.github_url);
      if (sub.mcq_answers) setMcqAnswers(sub.mcq_answers);
    }

    setLoading(false);
  }, [hackathonId, categoryId]);

  useEffect(() => { load(); }, [load]);

  // Real-time AI status updates
  useEffect(() => {
    if (!submission?.id) return;
    if (submission.ai_status === "DONE" || submission.ai_status === "FAILED") return;

    const channel = supabase
      .channel(`sub2-${submission.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "submissions_v2",
        filter: `id=eq.${submission.id}`,
      }, payload => {
        setSubmission(payload.new as SubmissionV2);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [submission?.id, submission?.ai_status]);

  // MCQ: 5-second redirect to leaderboard after AI scores
  useEffect(() => {
    if (category?.type !== "MCQ") return;
    if (submission?.ai_status !== "DONE") return;
    if (mcqRedirectSecs !== null) return; // already counting
    setMcqRedirectSecs(5);
  }, [category?.type, submission?.ai_status]);

  useEffect(() => {
    if (mcqRedirectSecs === null) return;
    if (mcqRedirectSecs <= 0) {
      router.push(`/hackathons/${hackathonId}/leaderboard`);
      return;
    }
    const t = setTimeout(() => setMcqRedirectSecs(prev => (prev !== null ? prev - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [mcqRedirectSecs, hackathonId, router]);

  const uploadFile = async (): Promise<string | null> => {
    if (!file || !userId) return null;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${userId}/${categoryId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("submissions").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: url } = supabase.storage.from("submissions").getPublicUrl(path);
      return url.publicUrl;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!category || !userId || !hackathon) return;

    if (category.type === "TEXT" && !textValue.trim()) { toast.error("Please write your submission text"); return; }
    if ((category.type === "IMAGE" || category.type === "FILE") && !file && !submission?.file_url) { toast.error("Please select a file to upload"); return; }
    if (category.type === "URL" && !urlValue.trim()) { toast.error("Please enter your GitHub URL"); return; }
    if (category.type === "MCQ") {
      const unanswered = mcqQuestions.filter(q => !mcqAnswers[q.id]);
      if (unanswered.length > 0) { toast.error(`Please answer all ${mcqQuestions.length} questions`); return; }
    }

    setSubmitting(true);
    try {
      let fileUrl: string | undefined;
      let fileName: string | undefined;

      if ((category.type === "IMAGE" || category.type === "FILE") && file) {
        const url = await uploadFile();
        if (!url) throw new Error("File upload failed");
        fileUrl = url;
        fileName = file.name;
      }

      const subPayload: any = {
        category_id: categoryId,
        hackathon_id: hackathonId,
        participant_id: userId,
        ai_status: "PENDING",
      };
      if (category.type === "TEXT") subPayload.text_content = textValue.trim();
      if (category.type === "IMAGE" || category.type === "FILE") {
        subPayload.file_url = fileUrl ?? submission?.file_url;
        subPayload.file_name = fileName ?? submission?.file_name;
      }
      if (category.type === "URL") {
        subPayload.github_url = urlValue.trim();
        subPayload.text_content = urlDescription.trim() || null;
      }
      if (category.type === "MCQ") subPayload.mcq_answers = mcqAnswers;

      let savedSub: SubmissionV2;
      if (submission?.id) {
        const { data, error } = await supabase.from("submissions_v2").update(subPayload).eq("id", submission.id).select().single();
        if (error) throw error;
        savedSub = data;
      } else {
        const { data, error } = await supabase.from("submissions_v2").insert(subPayload).select().single();
        if (error) throw error;
        savedSub = data;
      }

      setSubmission(savedSub);
      toast.success("Submission saved! Sending to AI judge...");

      const judgeRes = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: savedSub.id,
          category_type: category.type,
          rubric: category.rubric_json,
          max_score: category.max_score,
        }),
      });

      if (judgeRes.ok) {
        const result = await judgeRes.json();
        setSubmission(prev => prev ? { ...prev, ...result, ai_score: result.score, ai_status: "DONE" } : prev);
        if (category.type === "MCQ") {
          toast.success(`✅ Quiz scored: ${result.score}/${category.max_score} — redirecting to leaderboard...`);
          // redirect effect will trigger via useEffect above
        } else {
          toast.success("🤖 AI evaluation complete!");
        }
      } else {
        toast("Submission saved. AI evaluation is running in the background.", { icon: "⏳" });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Loader2 size={32} className="text-accent animate-spin" />
    </div>
  );

  if (!category || !hackathon) return null;

  const meta = TYPE_META[category.type] ?? TYPE_META.TEXT;
  const TypeIcon = meta.icon;
  const isReadOnly = hackathon.status === "ended";
  // MCQ is locked once submitted (no re-submit)
  const isMcqLocked = category.type === "MCQ" && !!submission;
  const hasSubmission = !!submission;
  const rubric: RubricCriterion[] = Array.isArray(category.rubric_json) ? category.rubric_json : [];
  const hackathonEndDate = new Date(hackathon.end_time);
  // max_submissions comes from migration 004; default 1 if column doesn't exist yet
  const maxSubmissions: number = (category as any).max_submissions ?? 1;

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />

      <div className="pt-20 min-h-screen flex flex-col">
        {/* Top bar */}
        <div className="border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={`/hackathons/${hackathonId}`}
              className="p-1.5 glass rounded-lg hover:text-accent transition-colors shrink-0">
              <ArrowLeft size={16} />
            </Link>
            <TypeIcon size={16} className={meta.color} />
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{category.name}</div>
              <div className="text-xs text-muted truncate">{hackathon.title}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-sm">
            {/* Submission timer — shows when category has a time limit and submission not yet locked */}
            {category.time_limit && !isMcqLocked && hackathon.status === "active" && (
              <SubmissionTimer
                timeLimitMinutes={category.time_limit}
                startedAt={timerStartedAt.current}
                onTimeUp={() => { if (!submitting) handleSubmit(); }}
              />
            )}
            {hackathon.status === "active" && !category.time_limit && (
              <div className="hidden sm:flex items-center gap-2 text-muted">
                <Clock size={14} /> Time left: <Countdown endsAt={hackathonEndDate} />
              </div>
            )}
            {isMcqLocked && (
              <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
                <Lock size={13} /> Quiz Locked
              </div>
            )}
            {!isMcqLocked && hasSubmission && (
              <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
                <CheckCircle2 size={13} /> Submitted
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

          {/* Left panel */}
          <div className="w-full lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r border-border/50 overflow-y-auto p-5 space-y-5">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-surface to-surface/50 border border-border">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface border border-border">
                <TypeIcon size={18} className={meta.color} />
              </div>
              <div>
                <div className="font-semibold">{category.name}</div>
                <div className={`text-xs ${meta.color}`}>{meta.label}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="glass rounded-xl p-3 text-center">
                <div className="font-display text-xl font-bold text-accent">{category.max_score}</div>
                <div className="text-xs text-muted mt-0.5">Max Points</div>
              </div>
              <div className="glass rounded-xl p-3 text-center">
                <div className="font-display text-xl font-bold text-accent2">
                  {category.time_limit ? `${category.time_limit}m` : "∞"}
                </div>
                <div className="text-xs text-muted mt-0.5">Time Limit</div>
              </div>
            </div>

            {category.description && (
              <div className="space-y-2">
                <h3 className="text-xs text-muted uppercase tracking-wider font-medium">Instructions</h3>
                <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{category.description}</p>
              </div>
            )}

            {category.type !== "MCQ" && rubric.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs text-muted uppercase tracking-wider font-medium flex items-center gap-1.5">
                  <Star size={12} /> Grading Rubric
                </h3>
                <div className="space-y-2">
                  {rubric.map((c, i) => (
                    <div key={i} className="p-3 bg-surface/50 rounded-lg border border-border/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{c.name}</span>
                        <span className="text-xs text-accent font-mono">{c.weight}%</span>
                      </div>
                      {c.description && <p className="text-xs text-muted leading-relaxed">{c.description}</p>}
                      <div className="h-1 bg-surface rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-accent/40 rounded-full" style={{ width: `${c.weight}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {category.type === "MCQ" && mcqQuestions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs text-muted uppercase tracking-wider font-medium">Your Progress</h3>
                <div className="p-3 bg-surface/50 rounded-lg border border-border/50 text-sm">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted">Answered</span>
                    <span className="font-mono text-accent">
                      {Object.keys(mcqAnswers).length} / {mcqQuestions.length}
                    </span>
                  </div>
                  <div className="h-2 bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${(Object.keys(mcqAnswers).length / mcqQuestions.length) * 100}%` }} />
                  </div>
                </div>
              </div>
            )}

            <Link href={`/hackathons/${hackathonId}/leaderboard`}
              className="flex items-center justify-between p-3 glass rounded-xl hover:border-accent/20 transition-all group text-sm">
              <span className="flex items-center gap-2 text-muted"><Trophy size={14} /> Leaderboard</span>
              <ChevronDown size={14} className="text-muted group-hover:text-accent transition-colors -rotate-90" />
            </Link>
          </div>

          {/* Right panel */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="flex-1 p-5 space-y-5">

              {submission && (submission.ai_status === "DONE" || submission.ai_status === "FAILED") && (
                <div className="glass rounded-xl p-5">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Trophy size={14} className="text-accent3" /> Your Score
                  </h3>
                  <ScoreDisplay sub={submission} maxScore={category.max_score} />
                </div>
              )}

              {submission && (submission.ai_status === "PROCESSING" || submission.ai_status === "PENDING") && (
                <div className="glass rounded-xl p-4 flex items-center gap-3">
                  <Loader2 size={16} className="text-accent animate-spin shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-accent">AI Evaluation in Progress</p>
                    <p className="text-xs text-muted mt-0.5">Your score will appear here automatically when ready.</p>
                  </div>
                </div>
              )}

              <div className="glass rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <TypeIcon size={14} className={meta.color} />
                  {isReadOnly ? "Your Submission" : hasSubmission ? "Update Submission" : "Submit Your Work"}
                </h3>

                {category.type === "TEXT" && <TextPanel value={textValue} onChange={setTextValue} readOnly={isReadOnly} />}
                {category.type === "IMAGE" && (
                  <FilePanel accept="image/*,.pdf" label="JPG, PNG, GIF — max 10MB"
                    file={file} onFile={setFile} uploading={uploading} readOnly={isReadOnly}
                    existingUrl={submission?.file_url} existingName={submission?.file_name} />
                )}
                {category.type === "FILE" && (
                  <FilePanel accept=".pdf,.pptx,.ppt,.docx,.doc,.zip" label="PDF, PPTX, DOC — max 25MB"
                    file={file} onFile={setFile} uploading={uploading} readOnly={isReadOnly}
                    existingUrl={submission?.file_url} existingName={submission?.file_name} />
                )}
                {category.type === "URL" && (
                  <UrlPanel url={urlValue} onUrl={setUrlValue} description={urlDescription} onDescription={setUrlDescription} readOnly={isReadOnly} />
                )}
                {/* MCQ locked overlay */}
                {isMcqLocked && submission?.ai_status === "DONE" && mcqRedirectSecs !== null && (
                  <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <CheckCircle2 size={20} className="text-green-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-green-400">Quiz submitted & scored!</p>
                      <p className="text-xs text-muted mt-0.5">
                        Redirecting to leaderboard in <span className="font-mono font-bold text-accent">{mcqRedirectSecs}s</span>...
                      </p>
                    </div>
                  </div>
                )}
                {category.type === "MCQ" && mcqQuestions.length > 0 && (
                  <McqPanel questions={mcqQuestions} answers={mcqAnswers} onAnswer={(qId, choice) => setMcqAnswers(prev => ({ ...prev, [qId]: choice }))}
                    readOnly={isReadOnly || isMcqLocked} />
                )}
                {category.type === "CODE" && (
                  <div className="text-center py-8">
                    <Code2 size={32} className="text-cyan-400 mx-auto mb-3" />
                    <p className="text-sm text-muted mb-4">This is a coding category. Use the Code Editor.</p>
                    <Link href={`/arena/${hackathonId}`} className="btn-primary inline-flex items-center gap-2">
                      <Code2 size={14} /> Open Code Editor
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {!isReadOnly && category.type !== "CODE" && !isMcqLocked && (
              <div className="border-t border-border/50 p-4 space-y-2">
                {/* Attempt counter — shown when max_submissions > 1 */}
                {maxSubmissions > 1 && submission && (
                  <p className="text-xs text-muted text-center">
                    <span className="font-mono text-accent">
                      {(submission as any).submission_count ?? 1}
                    </span>
                    {" of "}
                    <span className="font-mono text-accent">{maxSubmissions}</span>
                    {" attempts used"}
                  </p>
                )}
                <button onClick={handleSubmit} disabled={submitting || uploading}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
                  {submitting
                    ? <><Loader2 size={16} className="animate-spin" /> Submitting...</>
                    : <><Send size={16} /> {hasSubmission ? "Update Submission" : "Submit"}</>
                  }
                </button>
                {hasSubmission && category.type !== "MCQ" && (
                  <p className="text-xs text-muted text-center">
                    Re-submitting will replace your previous answer and re-run AI evaluation.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
