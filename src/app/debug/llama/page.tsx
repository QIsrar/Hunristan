"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Play, Sparkles, Code2, AlertCircle, CheckCircle2, Zap, Clock, Shield } from "lucide-react";
import toast from "react-hot-toast";

const LANGUAGES = [
  { id: "python", name: "Python", icon: "🐍", default: "def hello_world():\n    print('Hello from Hunristan!')\n\nhello_world()" },
  { id: "java", name: "Java", icon: "☕", default: "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello from Hunristan!\");\n    }\n}" },
  { id: "c", name: "C", icon: "💎", default: "#include <stdio.h>\n\nint main() {\n    printf(\"Hello from Hunristan!\\n\");\n    return 0;\n}" }
];

export default function LlamaPlayground() {
  const [lang, setLang] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(lang.default);
  const [problem, setProblem] = useState("Given an array of integers, return the sum of all elements.");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testLlama = async () => {
    if (!problem.trim()) { toast.error("Add a problem statement first!"); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/debug/llama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language: lang.id,
          problemTitle: "Test Problem",
          problemDescription: problem
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to contact Llama");
      
      setResult(data);
      toast.success("Response received from Llama!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg grid-bg p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
              <Sparkles className="text-accent" /> Llama AI Playground
            </h1>
            <p className="text-muted text-sm mt-1">Test your fine-tuned model connectivity (Python, Java, C)</p>
          </div>
          <div className="flex gap-2">
            {LANGUAGES.map(l => (
              <button
                key={l.id}
                onClick={() => { setLang(l); setCode(l.default); }}
                className={`px-4 py-2 rounded-xl border transition-all text-sm flex items-center gap-2 ${
                  lang.id === l.id ? "bg-accent/10 border-accent text-accent" : "bg-surface/50 border-border text-muted hover:border-accent/30"
                }`}
              >
                <span>{l.icon}</span> {l.name}
              </button>
            ))}
          </div>
        </header>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Editor */}
          <div className="space-y-4">

            {/* Problem Statement */}
            <div className="glass rounded-2xl p-4 border border-white/5">
              <label className="text-xs uppercase tracking-widest font-bold text-muted mb-2 block">📋 Problem Statement</label>
              <textarea
                value={problem}
                onChange={e => setProblem(e.target.value)}
                rows={4}
                placeholder="Describe the problem here... e.g. Given an array, return the sum of all elements."
                className="w-full bg-transparent text-sm text-text placeholder-muted/40 resize-none outline-none leading-relaxed"
              />
            </div>

            <div className="glass rounded-2xl overflow-hidden border border-white/5">
              <div className="bg-surface/80 px-4 py-2 border-b border-white/5 flex items-center justify-between">
                <span className="text-xs font-mono text-muted">{lang.name} Editor</span>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                </div>
              </div>
              <Editor
                height="500px"
                language={lang.id}
                theme="vs-dark"
                value={code}
                onChange={(v) => setCode(v || "")}
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 16, bottom: 16 },
                }}
              />
            </div>
            <button
              onClick={testLlama}
              disabled={loading}
              className="btn-primary w-full py-4 text-lg font-bold flex items-center justify-center gap-3 group"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Play size={20} className="fill-current" /> 
                  Run Llama Review
                  <Zap size={18} className="text-yellow-400 group-hover:scale-125 transition-transform" />
                </>
              )}
            </button>
          </div>

          {/* Right: Results */}
          <div className="space-y-6">
            {!result && !loading && (
              <div className="glass rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[500px] border-dashed">
                <div className="w-20 h-20 rounded-3xl bg-surface flex items-center justify-center mb-6 text-muted/30">
                  <Code2 size={40} />
                </div>
                <h3 className="text-xl font-semibold mb-2">No results yet</h3>
                <p className="text-muted text-sm max-w-xs mx-auto">
                  Run the model to see your code's verdict, complexity, and AI feedback.
                </p>
              </div>
            )}

            {loading && (
              <div className="glass rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[500px] animate-pulse">
                <div className="w-16 h-16 rounded-full border-4 border-accent/20 border-t-accent animate-spin mb-6" />
                <h3 className="text-xl font-semibold mb-2 text-accent">Llama is thinking...</h3>
                <p className="text-muted text-sm">Analyzing your code structure and logic</p>
              </div>
            )}

            {result && (
              <div className="animate-slide-up space-y-6">
                {/* Header Card */}
                <div className={`glass rounded-2xl p-6 border-l-4 ${
                  result.verdict === "CORRECT" ? "border-green-500" : "border-yellow-500"
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs uppercase tracking-widest text-muted font-bold">AI Verdict</span>
                    <span className="text-xs font-mono text-muted/50">{result.gradedBy}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      result.verdict === "CORRECT" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
                    }`}>
                      {result.verdict === "CORRECT" ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                    </div>
                    <div>
                      <div className="text-2xl font-bold tracking-tight">{result.verdict}</div>
                      <div className="text-sm text-muted">{result.status || "Analysis Complete"}</div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-3xl font-display font-bold gradient-text">{result.aiScore}/100</div>
                      <div className="text-[10px] uppercase text-muted font-bold tracking-tighter">AI Score</div>
                    </div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass rounded-2xl p-4 bg-surface/30">
                    <div className="flex items-center gap-2 text-muted text-xs mb-2 uppercase font-bold tracking-wider">
                      <Clock size={14} className="text-cyan-400" /> Time Complexity
                    </div>
                    <div className="text-xl font-mono font-bold text-cyan-400">{result.timeComplexity}</div>
                  </div>
                  <div className="glass rounded-2xl p-4 bg-surface/30">
                    <div className="flex items-center gap-2 text-muted text-xs mb-2 uppercase font-bold tracking-wider">
                      <Zap size={14} className="text-purple-400" /> Space Complexity
                    </div>
                    <div className="text-xl font-mono font-bold text-purple-400">{result.spaceComplexity}</div>
                  </div>
                </div>

                {/* Feedback */}
                <div className="glass rounded-2xl p-6">
                  <div className="text-xs uppercase tracking-widest text-muted font-bold mb-4">AI Review & Feedback</div>
                  <p className="text-text leading-relaxed text-sm">
                    {result.feedback}
                  </p>
                </div>

                {/* Suggestions */}
                {result.suggestions?.length > 0 && (
                  <div className="glass rounded-2xl p-6 bg-accent/5 border-accent/10">
                    <div className="text-xs uppercase tracking-widest text-accent font-bold mb-4 flex items-center gap-2">
                      <Shield size={14} /> Improvement Suggestions
                    </div>
                    <ul className="space-y-3">
                      {result.suggestions.map((s: string, i: number) => (
                        <li key={i} className="text-sm text-muted flex gap-3">
                          <span className="text-accent font-bold">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
