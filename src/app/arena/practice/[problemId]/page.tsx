"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { safeGetUser } from "@/lib/supabase/getUser";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import {
  Play, Send, ChevronLeft, ChevronDown,
  Loader2, Code2, BookOpen, Brain, Zap,
} from "lucide-react";
import type { Problem, Submission } from "@/types";
import { formatDistanceToNow } from "date-fns";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  { ssr: false, loading: () => <div className="flex-1 bg-surface flex items-center justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div> }
);

const LANGUAGES = [
  { id: "python",     label: "Python 3",   monaco: "python",     template: "import sys\ninput = sys.stdin.readline\n\ndef solve():\n    pass\n\nsolve()\n" },
  { id: "javascript", label: "JavaScript", monaco: "javascript", template: "const lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');\n\n// Your code here\n" },
  { id: "cpp",        label: "C++",        monaco: "cpp",        template: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // Your code here\n    return 0;\n}\n" },
  { id: "java",       label: "Java",       monaco: "java",       template: "import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        // Your code here\n    }\n}\n" },
];

type TabType = "problem" | "submissions";

interface RunResult { stdout?: string; stderr?: string; exitCode?: number; error?: string; }
interface SubmitResult { verdict: string; score: number; passed: number; total: number; ai?: { feedback?: string; score?: number; timeComplexity?: string; spaceComplexity?: string; suggestions?: string[]; gradedBy?: string; }; error?: string; }

export default function PracticeArenaPage() {
  const params = useParams();
  const problemId = params.problemId as string;
  const router = useRouter();
  const supabase = createClient();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(LANGUAGES[0].template);
  const [tab, setTab] = useState<TabType>("problem");
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runOutput, setRunOutput] = useState<RunResult | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [showAI, setShowAI] = useState(false);

  useEffect(() => {
    async function load() {
      const user = await safeGetUser();
      if (!user) return router.push("/auth/signin");
      setUserId(user.id);

      const [{ data: prob }, { data: subs }] = await Promise.all([
        supabase.from("problems").select("*").eq("id", problemId).single(),
        supabase.from("submissions")
          .select("*").eq("user_id", user.id).eq("problem_id", problemId)
          .order("submitted_at", { ascending: false }).limit(10),
      ]);

      if (!prob) { toast.error("Problem not found"); return router.push("/practice"); }
      setProblem(prob);
      setSubmissions(subs || []);

      const saved = localStorage.getItem(`practice_${problemId}_${language}`);
      if (saved) setCode(saved);
      setLoading(false);
    }
    load();
  }, [problemId]);

  useEffect(() => {
    if (code && problemId) localStorage.setItem(`practice_${problemId}_${language}`, code);
  }, [code, language, problemId]);

  const handleLanguageChange = useCallback((langId: string) => {
    setLanguage(langId);
    const saved = localStorage.getItem(`practice_${problemId}_${langId}`);
    setCode(saved || (LANGUAGES.find((l) => l.id === langId)?.template || ""));
  }, [problemId]);

  const handleRun = useCallback(async () => {
    if (!problem || !code.trim()) return;
    setRunning(true); setRunOutput(null);
    try {
      const res = await fetch("/api/execute", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code, stdin: problem.sample_input || "" }),
      });
      const data: { run?: { stdout?: string; stderr?: string; code?: number }; error?: string } = await res.json();
      setRunOutput(data.error ? { error: data.error } : { stdout: data.run?.stdout || "", stderr: data.run?.stderr || "", exitCode: data.run?.code ?? 0 });
    } catch { setRunOutput({ error: "Execution failed." }); }
    finally { setRunning(false); }
  }, [problem, code, language]);

  const handleSubmit = useCallback(async () => {
    if (!problem || !code.trim() || !userId || submitting) return;
    setSubmitting(true); setRunOutput(null); setSubmitResult(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hackathon_id: null, problem_id: problemId, language, code, is_practice: true }),
      });
      const data: SubmitResult & { error?: string } = await res.json();
      if (!res.ok) { toast.error(data.error || "Submission failed"); setSubmitResult({ verdict: "error", score: 0, passed: 0, total: 0, error: data.error }); return; }
      setSubmitResult(data);
      const { data: newSubs } = await supabase.from("submissions").select("*").eq("user_id", userId).eq("problem_id", problemId).order("submitted_at", { ascending: false }).limit(10);
      if (newSubs) setSubmissions(newSubs);
      if (data.verdict === "accepted") { toast.success("✅ Accepted!"); } else { toast.error(`${data.verdict.replace(/_/g, " ")} — ${data.passed}/${data.total} passed`); }
    } catch { toast.error("Network error."); }
    finally { setSubmitting(false); }
  }, [problem, code, language, userId, problemId, submitting]);

  const verdictColor = (v: string) => {
    const m: Record<string, string> = { accepted: "text-green-400 bg-green-500/10 border-green-500/30", wrong_answer: "text-red-400 bg-red-500/10 border-red-500/30", time_limit_exceeded: "text-amber-400 bg-amber-500/10 border-amber-500/30", runtime_error: "text-orange-400 bg-orange-500/10 border-orange-500/30", compilation_error: "text-purple-400 bg-purple-500/10 border-purple-500/30", pending: "text-muted bg-white/5 border-white/10" };
    return m[v] || "text-muted bg-white/5 border-white/10";
  };
  const verdictIcon = (v: string) => ({ accepted: "✅", wrong_answer: "❌", time_limit_exceeded: "⏱", compilation_error: "🔧", runtime_error: "💥", pending: "⏳" }[v] || "⏳");

  if (loading) return <div className="min-h-screen bg-bg flex items-center justify-center"><Loader2 size={28} className="animate-spin text-accent" /></div>;
  if (!problem) return null;

  return (
    <div className="h-screen bg-bg flex flex-col overflow-hidden">
      {/* Topbar */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-surface/80 backdrop-blur shrink-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/practice" className="flex items-center gap-1.5 text-muted hover:text-text text-sm transition-colors">
            <ChevronLeft size={16} /> Practice
          </Link>
          <span className="text-border">/</span>
          <span className="text-sm font-medium">{problem.title}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full badge-${problem.difficulty}`}>{problem.difficulty}</span>
          <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">Practice Mode</span>
        </div>
        <div className="flex items-center gap-3">
          <select value={language} onChange={(e) => handleLanguageChange(e.target.value)} className="bg-card border border-border text-text text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-accent cursor-pointer">
            {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
          <button onClick={handleRun} disabled={running || submitting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-muted hover:text-text text-xs font-medium transition-all">
            {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Run
          </button>
          <button onClick={handleSubmit} disabled={running || submitting} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 text-xs font-semibold transition-all">
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Submit
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-[46%] flex flex-col border-r border-border overflow-hidden">
          <div className="flex border-b border-border bg-surface/50 shrink-0">
            {(["problem", "submissions"] as TabType[]).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium capitalize transition-colors border-b-2 ${tab === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-text"}`}>
                {t === "problem" ? <BookOpen size={12} /> : <Code2 size={12} />} {t}
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
                    <span className="text-xs text-muted">⏱ {problem.time_limit_ms}ms</span>
                    <span className="text-xs text-muted">💾 {problem.memory_limit_mb}MB</span>
                  </div>
                  <div className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{problem.description}</div>
                </div>
                {problem.input_format && <div><h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Input Format</h3><p className="text-sm text-muted">{problem.input_format}</p></div>}
                {problem.constraints && <div><h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Constraints</h3><div className="bg-surface border border-border rounded-xl p-3 font-mono text-xs text-muted whitespace-pre-wrap">{problem.constraints}</div></div>}
                {(problem.sample_input || problem.sample_output) && (
                  <div className="grid grid-cols-2 gap-3">
                    {problem.sample_input && <div><h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Sample Input</h3><div className="bg-surface border border-border rounded-xl p-3 font-mono text-xs whitespace-pre-wrap min-h-[60px]">{problem.sample_input}</div></div>}
                    {problem.sample_output && <div><h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Sample Output</h3><div className="bg-surface border border-border rounded-xl p-3 font-mono text-xs whitespace-pre-wrap min-h-[60px]">{problem.sample_output}</div></div>}
                  </div>
                )}
                {(problem as any).editorial && (
                  <div className="mt-4 p-3 bg-accent/5 border border-accent/15 rounded-xl">
                    <h3 className="text-xs font-semibold text-accent mb-2">📖 Editorial (Practice Mode)</h3>
                    <p className="text-xs text-muted leading-relaxed">{(problem as any).editorial}</p>
                  </div>
                )}
              </div>
            )}
            {tab === "submissions" && (
              <div>
                <h2 className="font-display font-semibold mb-4 text-sm">Your Submissions</h2>
                {submissions.length === 0 ? (
                  <div className="text-center py-12"><Code2 size={32} className="text-muted/20 mx-auto mb-2" /><p className="text-muted text-sm">No submissions yet</p></div>
                ) : (
                  <div className="space-y-2">
                    {submissions.map((s) => (
                      <div key={s.id} className="glass rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-lg border ${verdictColor(s.verdict)}`}>{verdictIcon(s.verdict)} {s.verdict.replace(/_/g, " ").toUpperCase()}</span>
                          <span className="text-xs text-muted font-mono">{formatDistanceToNow(new Date(s.submitted_at), { addSuffix: true })}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted">
                          <span className="font-mono">{s.language}</span>
                          <span>{s.test_cases_passed}/{s.test_cases_total} tests</span>
                          {s.execution_time_ms && <span>{s.execution_time_ms}ms</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: editor + output */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <MonacoEditor
              height="100%"
              language={LANGUAGES.find((l) => l.id === language)?.monaco || "python"}
              value={code}
              onChange={(v) => setCode(v || "")}
              theme="vs-dark"
              options={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", minimap: { enabled: false }, scrollBeyondLastLine: false, wordWrap: "on", padding: { top: 12 }, tabSize: 4 }}
            />
          </div>
          <div className="border-t border-border bg-surface shrink-0">
            {runOutput !== null && (
              <div className="p-4 max-h-40 overflow-y-auto">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Output</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${runOutput.exitCode === 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{runOutput.error ? "Error" : runOutput.exitCode === 0 ? "OK" : `Exit ${runOutput.exitCode}`}</span>
                </div>
                {runOutput.error ? <pre className="text-red-400 font-mono text-xs whitespace-pre-wrap">{runOutput.error}</pre> : <>{runOutput.stdout && <pre className="font-mono text-xs whitespace-pre-wrap">{runOutput.stdout}</pre>}{runOutput.stderr && <pre className="font-mono text-xs text-red-400 whitespace-pre-wrap mt-1">{runOutput.stderr}</pre>}{!runOutput.stdout && !runOutput.stderr && <span className="text-muted text-xs italic">No output</span>}</>}
              </div>
            )}
            {submitResult !== null && !submitResult.error && (
              <div className="p-4 space-y-3 max-h-48 overflow-y-auto">
                <div className={`flex items-center justify-between p-3 rounded-xl border ${verdictColor(submitResult.verdict)}`}>
                  <span className="font-display font-bold text-sm">{verdictIcon(submitResult.verdict)} {submitResult.verdict.replace(/_/g, " ").toUpperCase()}</span>
                  <div className="flex items-center gap-3 text-xs"><span>{submitResult.passed}/{submitResult.total} tests</span><span className="font-mono font-bold">{submitResult.score} pts</span></div>
                </div>
                {submitResult.ai?.feedback && (
                  <div>
                    <button onClick={() => setShowAI(!showAI)} className="flex items-center gap-2 text-xs text-accent2 hover:text-accent2/80 font-medium">
                      <Brain size={12} /> AI Review <ChevronDown size={11} className={`transition-transform ${showAI ? "rotate-180" : ""}`} />
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
                        {submitResult.ai.suggestions && submitResult.ai.suggestions.length > 0 && (
                          <ul className="space-y-1">{submitResult.ai.suggestions.slice(0, 3).map((s, i) => <li key={i} className="text-xs text-muted flex gap-1.5"><span className="text-accent2">•</span>{s}</li>)}</ul>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {runOutput === null && submitResult === null && (
              <div className="px-4 py-3 flex items-center gap-2 text-xs text-muted">
                <Zap size={12} className="text-accent" /> No time limits enforced in practice mode
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}