"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import {
  Play, Send, Clock, ChevronLeft, ChevronDown, CheckCircle2,
  XCircle, Loader2, AlertTriangle, Zap, Code2, BookOpen,
  Trophy, MessageSquare, Brain, Timer, Shield,
} from "lucide-react";
import type { Problem, Hackathon, Submission } from "@/types";
import { formatDistanceToNow } from "date-fns";
import Discussion from "@/components/Discussion";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-surface">
        <Loader2 size={24} className="text-accent animate-spin" />
      </div>
    ),
  }
);

const LANGUAGES = [
  { id: "python",     label: "Python 3",   monaco: "python",     template: "import sys\ninput = sys.stdin.readline\n\ndef solve():\n    pass\n\nsolve()\n" },
  { id: "javascript", label: "JavaScript", monaco: "javascript", template: "const lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');\nlet idx = 0;\n\nfunction solve() {\n    // Your code here\n}\n\nsolve();\n" },
  { id: "cpp",        label: "C++",        monaco: "cpp",        template: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // Your code here\n    return 0;\n}\n" },
  { id: "c",          label: "C",          monaco: "c",          template: "#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    // Your code here\n    return 0;\n}\n" },
  { id: "java",       label: "Java",       monaco: "java",       template: "import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        // Your code here\n    }\n}\n" },
  { id: "go",         label: "Go",         monaco: "go",         template: "package main\n\nimport (\n    \"bufio\"\n    \"fmt\"\n    \"os\"\n)\n\nfunc main() {\n    reader := bufio.NewReader(os.Stdin)\n    _ = reader\n    fmt.Println()\n}\n" },
  { id: "rust",       label: "Rust",       monaco: "rust",       template: "use std::io::{self, BufRead};\n\nfn main() {\n    let stdin = io::stdin();\n    let _lines: Vec<String> = stdin.lock().lines().map(|l| l.unwrap()).collect();\n    // Your code here\n}\n" },
  { id: "typescript", label: "TypeScript", monaco: "typescript", template: "import * as readline from 'readline';\nconst rl = readline.createInterface({ input: process.stdin });\nconst lines: string[] = [];\nrl.on('line', l => lines.push(l));\nrl.on('close', () => {\n    // Your code here\n});\n" },
];

type TabType = "problem" | "submissions" | "discussion";

interface RunResult { stdout?: string; stderr?: string; exitCode?: number; error?: string; }
interface SubmitResult {
  verdict: string; score: number; passed: number; total: number;
  ai?: { feedback?: string; score?: number; quality?: number; timeComplexity?: string; spaceComplexity?: string; suggestions?: string[]; gradedBy?: string; };
  error?: string;
}

export default function ArenaPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;
  const problemId = params.problemId as string;
  const router = useRouter();
  const supabase = createClient();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [language, setLanguage] = useState("python");
  const languageRef = useRef("python");
  const [code, setCode] = useState(LANGUAGES[0].template);

  const [tab, setTab] = useState<TabType>("problem");
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runOutput, setRunOutput] = useState<RunResult | null>(null);
  const [customStdin, setCustomStdin] = useState<string>("");
  const [useCustomStdin, setUseCustomStdin] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false); // NEW: track if already accepted

  const [hackathonProblems, setHackathonProblems] = useState<{id: string; order_index: number; title?: string; points?: number; difficulty?: string}[]>([]);
  const hackathonProblemsRef = useRef<{id: string; order_index: number; title?: string; points?: number; difficulty?: string}[]>([]);
  const [showProblemSwitcher, setShowProblemSwitcher] = useState(false);
  const [attemptedProblems, setAttemptedProblems] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [problemTimeLeft, setProblemTimeLeft] = useState<number | null>(null);
  const [tabViolations, setTabViolations] = useState(0);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const confettiShownRef = useRef(false);

  useEffect(() => {
    async function load() {
      let user = null;
      try { const { data } = await supabase.auth.getUser(); user = data.user; }
      catch { await new Promise(r => setTimeout(r, 200)); try { const { data } = await supabase.auth.getUser(); user = data.user; } catch {} }
      if (!user) return router.push("/auth/signin");
      setUserId(user.id);

      const [{ data: prob }, { data: hack }, { data: subs }] = await Promise.all([
        supabase.from("problems").select("*").eq("id", problemId).single(),
        supabase.from("hackathons").select("*").eq("id", hackathonId).single(),
        supabase.from("submissions").select("*").eq("user_id", user.id).eq("problem_id", problemId).order("submitted_at", { ascending: false }).limit(20),
      ]);

      if (!prob) { toast.error("Problem not found"); return router.push(`/hackathons/${hackathonId}`); }
      setProblem(prob);
      setHackathon(hack);
      setSubmissions(subs || []);

      // Check if already accepted — suppress auto-submit
      const hasAccepted = subs?.some((s: any) => s.verdict === "accepted");
      setAlreadyAccepted(!!hasAccepted);

      if (subs?.length) setAttemptedProblems(new Set(subs.map((s: any) => s.problem_id as string)));

      const { data: allProbs } = await supabase.from("problems").select("id, order_index, title, points, difficulty").eq("hackathon_id", hackathonId).order("order_index");
      if (allProbs) { setHackathonProblems(allProbs); hackathonProblemsRef.current = allProbs; }

      try {
        const lang = hack?.allowed_languages?.length > 0 ? hack.allowed_languages[0] : "python";
        setLanguage(lang); languageRef.current = lang;
        const saved = localStorage.getItem(`arena_${problemId}_${lang}`);
        setCode(saved || LANGUAGES.find(l => l.id === lang)?.template || "");
      } catch { setCode(LANGUAGES[0].template); }

      setLoading(false);
    }
    load();
  }, [problemId, hackathonId]);

  // ── Event countdown — only show last 10 min, auto-submit on end
  const eventEndedRef = useRef(false);
  useEffect(() => {
    if (!hackathon?.end_time) return;
    const tick = () => {
      const diff = new Date(hackathon.end_time).getTime() - Date.now();
      const remaining = Math.max(0, Math.floor(diff / 1000));
      setTimeLeft(remaining);
      if (remaining === 0 && !eventEndedRef.current) {
        eventEndedRef.current = true;
        toast.error("⏰ Event has ended! Auto-submitting...", { duration: 4000 });
        fetch("/api/submit", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hackathon_id: hackathonId, problem_id: problemId, language: languageRef.current, code, is_practice: false }),
        }).catch(() => {}).finally(() => setTimeout(() => router.push(`/hackathons/${hackathonId}/leaderboard`), 2000));
      }
    };
    tick(); const iv = setInterval(tick, 1000); return () => clearInterval(iv);
  }, [hackathon?.end_time, hackathonId, problemId, code]);

  // ── Per-problem countdown — only auto-submit if NOT already accepted
  const autoSubmittedRef = useRef(false);
  useEffect(() => {
    if (!problem?.time_limit_ms) return;
    autoSubmittedRef.current = false;
    const limitSecs = Math.floor(problem.time_limit_ms / 1000);
    setProblemTimeLeft(limitSecs);
    const iv = setInterval(() => {
      setProblemTimeLeft(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(iv);
          if (!autoSubmittedRef.current) {
            autoSubmittedRef.current = true;
            setTimeout(() => autoSubmitAndNavigate(), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [problem?.id, problem?.time_limit_ms]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest("[data-switcher]")) setShowProblemSwitcher(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (code && problemId) { try { localStorage.setItem(`arena_${problemId}_${language}`, code); } catch {} }
  }, [code, language, problemId]);

  const handleLanguageChange = useCallback((langId: string) => {
    setLanguage(langId); languageRef.current = langId;
    try { const saved = localStorage.getItem(`arena_${problemId}_${langId}`); setCode(saved || LANGUAGES.find(l => l.id === langId)?.template || ""); }
    catch { setCode(LANGUAGES.find(l => l.id === langId)?.template || ""); }
  }, [problemId]);

  useEffect(() => {
    const handle = () => {
      if (document.hidden && hackathon?.status === "active") {
        setTabViolations(v => {
          const n = v + 1;
          toast.error(`⚠️ Tab switch #${n} — -${n * 10}% score penalty`, { duration: 5000 });
          if (userId) supabase.from("security_logs").insert({ user_id: userId, hackathon_id: hackathonId, violation_type: "tab_switch", severity: n >= 3 ? "high" : "medium", metadata: { count: n, problem_id: problemId } }).then(() => {});
          return n;
        });
      }
    };
    document.addEventListener("visibilitychange", handle);
    return () => document.removeEventListener("visibilitychange", handle);
  }, [hackathon, userId, hackathonId, problemId]);

  const autoSubmitAndNavigate = useCallback(async () => {
    // Always submit current code when timer expires — even if previously accepted
    // (participant may have improved their solution)
    toast("⏰ Time's up! Auto-submitting...", { duration: 3000 });
    if (code.trim() && userId && problem) {
      try {
        await fetch("/api/submit", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hackathon_id: hackathonId, problem_id: problemId, language, code, is_practice: false }),
        });
      } catch {}
    }
    await new Promise(r => setTimeout(r, 1500));
    const problems = hackathonProblemsRef.current;
    const currentIndex = problems.findIndex(p => p.id === problemId);
    const next = problems[currentIndex + 1];
    if (next) { toast.success("Moving to next problem...", { duration: 2000 }); router.push(`/arena/${hackathonId}/${next.id}`); }
    else { toast("All problems done!", { duration: 2000 }); router.push(`/hackathons/${hackathonId}/leaderboard`); }
  }, [code, userId, problem, hackathonId, problemId, router, alreadyAccepted]);

  const fireConfetti = useCallback(async () => {
    if (confettiShownRef.current) return;
    confettiShownRef.current = true;
    const confetti = (await import("canvas-confetti")).default;
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, colors: ["#00e5ff", "#7c3aed", "#f59e0b"] });
  }, []);

  const handleRun = useCallback(async () => {
    if (!problem || !code.trim()) return;
    setRunning(true); setRunOutput(null); setSubmitResult(null);
    try {
      const stdin = useCustomStdin ? customStdin : (problem.sample_input || "");
      const res = await fetch("/api/execute", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: languageRef.current, code, stdin }) });
      const data: any = await res.json();
      if (data.error) setRunOutput({ error: data.detail ? `${data.error}\n\n${data.detail}` : data.error });
      else setRunOutput({ stdout: data.run?.stdout || "", stderr: data.run?.stderr || "", exitCode: data.run?.code ?? 0 });
    } catch (e: any) { setRunOutput({ error: `Execution failed: ${e?.message}` }); }
    finally { setRunning(false); }
  }, [problem, code, useCustomStdin, customStdin]);

  const handleSubmit = useCallback(async () => {
    if (!problem || !code.trim() || !userId || submitting) return;
    setSubmitting(true); setRunOutput(null); setSubmitResult(null);
    toast(`Submitting as ${languageRef.current}...`, { duration: 1500, id: "submit-lang" });
    try {
      const res = await fetch("/api/submit", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hackathon_id: hackathonId, problem_id: problemId, language: languageRef.current, code, is_practice: false, tab_violations: tabViolations }) });
      const data: SubmitResult & { error?: string } = await res.json();
      if (!res.ok) { toast.error(data.error || "Submission failed", { duration: 6000 }); setSubmitResult({ verdict: "error", score: 0, passed: 0, total: 0, error: data.error }); return; }
      setSubmitResult(data);
      if (data.verdict === "accepted") {
        setAlreadyAccepted(true);
        toast.success("🎉 Accepted! Redirecting to leaderboard...", { duration: 3000 });
        fireConfetti();
        setTimeout(() => router.push(`/hackathons/${hackathonId}/leaderboard`), 3000);
      } else {
        toast.error(`${data.verdict.replace(/_/g, " ")} — ${data.passed}/${data.total} passed`);
      }
      const { data: newSubs } = await supabase.from("submissions").select("*").eq("user_id", userId).eq("problem_id", problemId).order("submitted_at", { ascending: false }).limit(20);
      if (newSubs) setSubmissions(newSubs);
      setAttemptedProblems(prev => new Set(Array.from(prev).concat(problemId)));
    } catch { toast.error("Network error. Please try again."); }
    finally { setSubmitting(false); }
  }, [problem, code, userId, hackathonId, problemId, submitting, fireConfetti, tabViolations]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.shiftKey && e.key === "Enter") { e.preventDefault(); handleSubmit(); }
        else if (e.key === "Enter") { e.preventDefault(); handleRun(); }
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [handleSubmit, handleRun]);

  const formatTime = (secs: number) => {
    if (secs >= 3600) return `${Math.floor(secs/3600)}h ${String(Math.floor((secs%3600)/60)).padStart(2,"0")}m`;
    return `${String(Math.floor(secs/60)).padStart(2,"0")}:${String(secs%60).padStart(2,"0")}`;
  };

  const timerColor = (secs: number) =>
    secs < 60 ? "text-red-400 bg-red-500/10 border-red-500/30 animate-pulse" :
    secs < 300 ? "text-orange-400 bg-orange-500/10 border-orange-500/30" :
    secs < 600 ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
    "text-yellow-400 bg-yellow-500/5 border-yellow-500/15";

  const verdictColor = (v: string) => ({ accepted: "text-green-400 bg-green-500/10 border-green-500/30", wrong_answer: "text-red-400 bg-red-500/10 border-red-500/30", time_limit_exceeded: "text-amber-400 bg-amber-500/10 border-amber-500/30", runtime_error: "text-orange-400 bg-orange-500/10 border-orange-500/30", compilation_error: "text-purple-400 bg-purple-500/10 border-purple-500/30" }[v] || "text-muted bg-white/5 border-white/10");
  const verdictIcon = (v: string) => ({ accepted: "✅", wrong_answer: "❌", time_limit_exceeded: "⏱", compilation_error: "🔧", runtime_error: "💥" }[v] || "⏳");

  if (loading) return <div className="min-h-screen bg-bg flex items-center justify-center"><Loader2 size={32} className="text-accent animate-spin" /></div>;
  if (!problem) return <div className="min-h-screen bg-bg flex items-center justify-center"><Link href={`/hackathons/${hackathonId}`} className="btn-primary">Back to Hackathon</Link></div>;

  const isTimeCritical = problemTimeLeft !== null && problemTimeLeft > 0 && problemTimeLeft < 60;
  const isTimeWarning = problemTimeLeft !== null && problemTimeLeft >= 60 && problemTimeLeft < 300;

  return (
    <div className="h-screen bg-bg flex flex-col overflow-hidden" ref={editorContainerRef}>

      {/* Time's Up overlay — only if NOT already accepted */}
      {problemTimeLeft === 0 && !alreadyAccepted && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="text-6xl">⏰</div>
            <h2 className="text-3xl font-bold text-red-400 font-display">Time&apos;s Up!</h2>
            <p className="text-muted text-sm">Auto-submitting your code...</p>
          </div>
        </div>
      )}

      {/* ── Top Bar ── */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-surface/80 backdrop-blur-lg shrink-0 z-40">

        {/* Left: back + problem title */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/hackathons/${hackathonId}`} className="flex items-center gap-1 text-muted hover:text-text transition-colors text-sm shrink-0">
            <ChevronLeft size={15} /> <span className="hidden sm:inline truncate max-w-[120px]">{hackathon?.title}</span>
          </Link>
          <span className="text-border shrink-0">/</span>

          {hackathonProblems.length > 1 ? (
            <div className="relative" data-switcher>
              <button onClick={() => setShowProblemSwitcher(p => !p)}
                className="flex items-center gap-2 text-sm font-medium hover:text-accent transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
                <span className="truncate max-w-[140px]">{problem.title}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full badge-${problem.difficulty} shrink-0`}>{problem.difficulty}</span>
                <span className="text-xs text-muted shrink-0">{problem.points}pts</span>
                <ChevronDown size={12} className="text-muted shrink-0" />
              </button>
              {showProblemSwitcher && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs text-muted uppercase tracking-wider font-semibold">Switch Problem</p>
                  </div>
                  {hackathonProblems.map((p, idx) => {
                    const isCurrent = p.id === problemId;
                    const isAttempted = attemptedProblems.has(p.id);
                    return (
                      <button key={p.id} onClick={() => { setShowProblemSwitcher(false); if (!isCurrent) router.push(`/arena/${hackathonId}/${p.id}`); }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors ${isCurrent ? "bg-accent/10 text-accent" : "hover:bg-white/5 text-text"}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-muted text-xs w-5">{idx + 1}.</span>
                          <span className="font-medium">{p.title || `Problem ${idx + 1}`}</span>
                          {isCurrent && <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded">now</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          {isAttempted && <CheckCircle2 size={11} className="text-green-400" />}
                          <span className={`text-xs px-1.5 py-0.5 rounded-full badge-${p.difficulty}`}>{p.difficulty}</span>
                          <span className="text-xs text-muted">{p.points}pts</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate max-w-[140px]">{problem.title}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full badge-${problem.difficulty}`}>{problem.difficulty}</span>
              <span className="text-xs text-muted">{problem.points} pts</span>
            </div>
          )}
        </div>

        {/* Right: timer + violations + controls */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Tab violations */}
          {tabViolations > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
              <Shield size={11} /> {tabViolations}×
            </div>
          )}

          {/* Already accepted badge */}
          {alreadyAccepted && (() => {
            const idx = hackathonProblems.findIndex(p => p.id === problemId);
            const next = hackathonProblems[idx + 1];
            return (
              <button
                onClick={() => next
                  ? router.push(`/arena/${hackathonId}/${next.id}`)
                  : router.push(`/hackathons/${hackathonId}/leaderboard`)}
                className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg hover:bg-green-500/20 transition-colors">
                <CheckCircle2 size={11} /> {next ? "Solved — Next Problem →" : "Solved — Leaderboard →"}
              </button>
            );
          })()}

          {/* Problem timer — MAIN clock */}
          {problemTimeLeft !== null && problemTimeLeft > 0 && (
            <div className={`flex items-center gap-1.5 font-mono font-bold px-3 py-1.5 rounded-lg border text-sm ${timerColor(problemTimeLeft)}`}>
              <Timer size={14} />
              <span>{formatTime(problemTimeLeft)}</span>
              <span className="text-[10px] font-normal opacity-70 hidden sm:inline">left</span>
            </div>
          )}

          {/* Event ends — only last 10 min */}
          {timeLeft !== null && timeLeft < 600 && timeLeft > 0 && (
            <div className="flex items-center gap-1 text-xs font-mono font-bold px-2 py-1 rounded-lg border text-red-400 bg-red-500/10 border-red-500/30 animate-pulse">
              <Clock size={11} /> {formatTime(timeLeft)}
            </div>
          )}

          {/* Language */}
          <select value={language} onChange={e => handleLanguageChange(e.target.value)}
            className="bg-card border border-border text-text text-xs px-2 py-1.5 rounded-lg focus:outline-none focus:border-accent cursor-pointer">
            {LANGUAGES.filter(l => !hackathon?.allowed_languages?.length || hackathon.allowed_languages.includes(l.id)).map(l => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>

          {/* Run */}
          <button onClick={handleRun} disabled={running || submitting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-muted hover:text-text hover:border-white/20 transition-all text-xs font-medium disabled:opacity-40"
            title="Run (Ctrl+Enter)">
            {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Run
          </button>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={running || submitting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 transition-all text-xs font-semibold disabled:opacity-40"
            title="Submit (Ctrl+Shift+Enter)">
            {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Submit
          </button>

          {/* Skip */}
          {hackathonProblems.length > 1 && (() => {
            const idx = hackathonProblems.findIndex(p => p.id === problemId);
            const next = hackathonProblems[idx + 1] || hackathonProblems.find(p => p.id !== problemId);
            if (!next) return null;
            return (
              <button onClick={() => router.push(`/arena/${hackathonId}/${next.id}`)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface border border-border text-muted hover:text-amber-400 hover:border-amber-400/30 transition-all text-xs font-medium"
                title="Skip problem">
                Skip →
              </button>
            );
          })()}
        </div>
      </div>

      {/* ── Main Split ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Problem panel */}
        <div className="w-[46%] flex flex-col border-r border-border overflow-hidden">
          <div className="flex border-b border-border bg-surface/50 shrink-0">
            {(["problem","submissions","discussion"] as TabType[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium capitalize transition-colors border-b-2 ${tab === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-text"}`}>
                {t === "problem" ? <BookOpen size={12} /> : t === "submissions" ? <Code2 size={12} /> : <MessageSquare size={12} />}
                {t}
                {t === "submissions" && submissions.length > 0 && <span className="ml-1 text-xs bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">{submissions.length}</span>}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {tab === "problem" && (
              <div className="space-y-5">
                <div>
                  <h1 className="font-display text-xl font-bold mb-3">{problem.title}</h1>
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full badge-${problem.difficulty}`}>{problem.difficulty}</span>
                    <span className="text-xs text-muted">⏱ {problem.time_limit_ms >= 60000 ? `${Math.round(problem.time_limit_ms/60000)}m` : `${problem.time_limit_ms/1000}s`} limit</span>
                    <span className="text-xs text-muted">💾 {problem.memory_limit_mb}MB</span>
                    <span className="text-xs text-muted font-mono">{problem.points} pts</span>
                  </div>
                  <div className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{problem.description}</div>
                </div>
                {problem.input_format && <div><h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Input Format</h3><p className="text-sm text-muted leading-relaxed">{problem.input_format}</p></div>}
                {problem.output_format && <div><h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Output Format</h3><p className="text-sm text-muted leading-relaxed">{problem.output_format}</p></div>}
                {problem.constraints && <div><h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Constraints</h3><pre className="text-sm text-muted font-mono leading-relaxed whitespace-pre-wrap bg-surface rounded-lg p-3">{problem.constraints}</pre></div>}
                {(problem.sample_input || problem.sample_output) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Sample Input</h3>
                      <pre className="text-xs font-mono bg-surface border border-border rounded-lg p-3 whitespace-pre-wrap">{problem.sample_input || "—"}</pre>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Sample Output</h3>
                      <pre className="text-xs font-mono bg-surface border border-border rounded-lg p-3 whitespace-pre-wrap">{problem.sample_output || "—"}</pre>
                    </div>
                  </div>
                )}
                {problem.explanation && <div><h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Explanation</h3><p className="text-sm text-muted leading-relaxed">{problem.explanation}</p></div>}
              </div>
            )}

            {tab === "submissions" && (
              <div className="space-y-3">
                <h2 className="font-display font-semibold text-sm mb-4">My Submissions</h2>
                {submissions.length === 0 ? <p className="text-muted text-sm text-center py-8">No submissions yet</p> : submissions.map(s => (
                  <div key={s.id} className={`p-3 rounded-xl border ${verdictColor(s.verdict)}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{verdictIcon(s.verdict)} {s.verdict.replace(/_/g," ").toUpperCase()}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span>{s.test_cases_passed}/{s.test_cases_total} tests</span>
                        <span className="font-mono font-bold">{s.score}pts</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span>{s.language}</span>
                      <span>{s.submitted_at ? formatDistanceToNow(new Date(s.submitted_at), { addSuffix: true }) : ""}</span>
                    </div>
                    {s.error_message && <pre className="text-xs text-red-400 mt-2 bg-red-500/5 rounded p-2 whitespace-pre-wrap">{s.error_message}</pre>}
                  </div>
                ))}
              </div>
            )}

            {tab === "discussion" && <Discussion problemId={problemId} hackathonId={hackathonId} userId={userId || ""} />}
          </div>
        </div>

        {/* RIGHT: Editor + Output */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <MonacoEditor
              height="100%"
              language={LANGUAGES.find(l => l.id === language)?.monaco || "python"}
              value={code}
              onChange={v => setCode(v || "")}
              theme="vs-dark"
              options={{
                fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false,
                lineNumbers: "on", wordWrap: "on", automaticLayout: true,
                suggestOnTriggerCharacters: true, quickSuggestions: true,
                folding: true, padding: { top: 12 }, smoothScrolling: true, tabSize: 4,
              }}
            />
          </div>

          {/* Output panel */}
          <div className="border-t border-border bg-surface shrink-0 max-h-[40%] overflow-y-auto">

            {/* STDIN section */}
            <div className="border-b border-border px-3 py-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">Test Input (stdin)</span>
                <div className="flex items-center bg-surface border border-border rounded-lg p-0.5 gap-0.5">
                  <button onClick={() => setUseCustomStdin(false)}
                    className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${!useCustomStdin ? "bg-accent text-bg shadow-sm" : "text-muted hover:text-text"}`}>
                    Sample
                  </button>
                  <button onClick={() => setUseCustomStdin(true)}
                    className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${useCustomStdin ? "bg-accent text-bg shadow-sm" : "text-muted hover:text-text"}`}>
                    Custom
                  </button>
                </div>
              </div>
              {useCustomStdin ? (
                <textarea
                  value={customStdin}
                  onChange={e => setCustomStdin(e.target.value)}
                  placeholder={`Type your custom input here...\n\nThis replaces the sample input when you click Run.\nExample: if sample input is "5\\n1 2 3 4 5", type that here.`}
                  className="w-full bg-bg border border-border rounded-lg p-2.5 font-mono text-xs text-text resize-y focus:outline-none focus:border-accent"
                  style={{ minHeight: "80px", maxHeight: "160px" }}
                />
              ) : (
                <div className="font-mono text-xs bg-bg border border-border rounded-lg p-2.5 min-h-[40px] max-h-[80px] overflow-y-auto whitespace-pre-wrap text-muted">
                  {problem.sample_input || <span className="italic text-muted/50">no sample input provided</span>}
                </div>
              )}
              <p className="text-[10px] text-muted/60 mt-1">
                {useCustomStdin ? "⚡ Custom input active — Run uses this instead of sample" : "Using sample input — toggle Custom to test your own"}
              </p>
            </div>

            {/* Run output */}
            {runOutput !== null && (
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Output</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${runOutput.error ? "bg-red-500/10 text-red-400" : runOutput.exitCode === 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                    {runOutput.error ? "Error" : runOutput.exitCode === 0 ? "✓ Exit 0" : `Exit ${runOutput.exitCode}`}
                  </span>
                  {runOutput.stdout && !runOutput.error && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${runOutput.stdout.trim() === problem.sample_output?.trim() ? "bg-green-500/10 text-green-400" : "bg-muted/10 text-muted"}`}>
                      {runOutput.stdout.trim() === problem.sample_output?.trim() ? "✓ Matches expected" : "≠ Differs from expected"}
                    </span>
                  )}
                </div>
                {runOutput.error
                  ? <pre className="text-red-400 font-mono text-xs whitespace-pre-wrap">{runOutput.error}</pre>
                  : <>
                      {runOutput.stdout && <pre className="font-mono text-xs whitespace-pre-wrap text-text">{runOutput.stdout}</pre>}
                      {runOutput.stderr && <pre className="font-mono text-xs whitespace-pre-wrap text-red-400 mt-1">{runOutput.stderr}</pre>}
                      {!runOutput.stdout && !runOutput.stderr && <span className="text-muted text-xs italic">No output</span>}
                    </>}
              </div>
            )}

            {/* Submit result */}
            {submitResult !== null && !submitResult.error && (
              <div className="p-3 space-y-3">
                <div className={`flex items-center justify-between p-3 rounded-xl border ${verdictColor(submitResult.verdict)}`}>
                  <span className="font-display font-bold text-sm">
                    {verdictIcon(submitResult.verdict)} {submitResult.verdict.replace(/_/g," ").toUpperCase()}
                  </span>
                  <div className="flex items-center gap-4 text-xs">
                    <span>{submitResult.passed}/{submitResult.total} tests</span>
                    <span className="font-mono font-bold">{submitResult.score} pts</span>
                  </div>
                </div>
                {submitResult.ai?.feedback && (
                  <div>
                    <button onClick={() => setShowAI(!showAI)}
                      className="flex items-center gap-2 text-xs text-accent2 hover:text-accent2/80 font-medium">
                      <Brain size={12} /> AI Code Review <ChevronDown size={11} className={`transition-transform ${showAI ? "rotate-180" : ""}`} />
                    </button>
                    {showAI && (
                      <div className="mt-2 bg-accent2/5 border border-accent2/15 rounded-xl p-3 space-y-2">
                        <p className="text-xs text-muted leading-relaxed">{submitResult.ai.feedback}</p>
                        {(submitResult.ai.timeComplexity || submitResult.ai.spaceComplexity) && (
                          <div className="flex gap-4 text-xs">
                            {submitResult.ai.timeComplexity && <span><span className="text-muted">Time: </span><span className="font-mono text-accent">{submitResult.ai.timeComplexity}</span></span>}
                            {submitResult.ai.spaceComplexity && <span><span className="text-muted">Space: </span><span className="font-mono text-accent">{submitResult.ai.spaceComplexity}</span></span>}
                          </div>
                        )}
                        {submitResult.ai.suggestions?.slice(0,3).map((s, i) => <p key={i} className="text-xs text-muted flex gap-1.5"><span className="text-accent2 shrink-0">•</span>{s}</p>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Default hint */}
            {runOutput === null && submitResult === null && (
              <div className="px-4 py-3 flex items-center gap-3 text-xs text-muted">
                <Zap size={12} className="text-accent shrink-0" />
                <span><kbd className="bg-border/50 px-1.5 py-0.5 rounded text-xs">Ctrl+↵</kbd> Run · <kbd className="bg-border/50 px-1.5 py-0.5 rounded text-xs">Ctrl+⇧+↵</kbd> Submit</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}