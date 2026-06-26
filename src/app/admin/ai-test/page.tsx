"use client";

import { useState } from "react";
import { Brain, Code2, Play, Terminal, AlertCircle, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

export default function AITestPage() {
  const [problem, setProblem] = useState("");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTest = async () => {
    if (!problem || !code) {
      toast.error("Please provide both problem and code");
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      const res = await fetch("/api/debug/ai-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem, code, language }),
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Testing failed");
      
      setResult(data);
      toast.success("AI Grading Complete!");
    } catch (err: any) {
      toast.error(err.message);
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center">
            <Brain className="text-accent" size={28} />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">AI Model Playground</h1>
            <p className="text-muted text-sm">Test your fine-tuned Llama model directly</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* INPUTS */}
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-widest mb-2 block">Problem Description</label>
                <textarea
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  placeholder="e.g. Write a function that returns the sum of two numbers..."
                  className="w-full h-40 bg-surface border border-border rounded-xl p-4 text-sm focus:outline-none focus:border-accent transition-colors resize-none"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-muted uppercase tracking-widest mb-2 block">Programming Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                  >
                    <option value="python">Python</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                    <option value="javascript">JavaScript</option>
                  </select>
                </div>
                <div className="flex-1 flex items-end">
                  <button
                    onClick={handleTest}
                    disabled={loading}
                    className="w-full btn-primary flex items-center justify-center gap-2 h-[42px]"
                  >
                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play size={16} />}
                    {loading ? "Grading..." : "Run AI Review"}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-widest mb-2 block">Code to Review</label>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Paste your solution code here..."
                  className="w-full h-64 bg-surface border border-border rounded-xl p-4 font-mono text-xs focus:outline-none focus:border-accent transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* OUTPUT */}
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6 h-full min-h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-lg flex items-center gap-2">
                  <Terminal size={18} className="text-accent2" /> Llama Output
                </h2>
                {result?.gradedBy && (
                  <span className="text-[10px] px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full">
                    {result.gradedBy === "custom_model" ? "Llama Active" : "Local Fallback"}
                  </span>
                )}
              </div>

              {!result ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted opacity-30">
                  <Brain size={60} strokeWidth={1} />
                  <p className="text-sm mt-4 italic">Waiting for input...</p>
                </div>
              ) : result.error ? (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex gap-3 items-start">
                  <AlertCircle className="text-red-400 shrink-0" size={18} />
                  <div>
                    <div className="text-sm font-bold text-red-400">Error</div>
                    <div className="text-xs text-red-400/80">{result.error}</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                  {/* Score Card */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <div className="text-[10px] text-muted uppercase font-bold tracking-widest mb-1">AI Score</div>
                      <div className="text-3xl font-display font-bold text-accent">{result.score}/100</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <div className="text-[10px] text-muted uppercase font-bold tracking-widest mb-1">Category</div>
                      <div className="text-sm font-bold text-accent2 uppercase mt-2">{result.verdict}</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <div className="text-[10px] text-muted uppercase font-bold tracking-widest mb-1">Time</div>
                      <div className="text-sm font-mono text-green-400 mt-2">{result.timeComplexity}</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <div className="text-[10px] text-muted uppercase font-bold tracking-widest mb-1">Space</div>
                      <div className="text-sm font-mono text-green-400 mt-2">{result.spaceComplexity}</div>
                    </div>
                  </div>

                  {/* Feedback */}
                  <div className="bg-accent/5 p-5 rounded-2xl border border-accent/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><Brain size={60} /></div>
                    <h3 className="text-xs font-bold text-accent uppercase tracking-widest mb-2">Model Feedback</h3>
                    <p className="text-sm italic leading-relaxed">&quot;{result.feedback}&quot;</p>
                  </div>

                  {/* Suggestions */}
                  {result.suggestions?.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-muted uppercase tracking-widest">Improvements</h3>
                      <div className="space-y-2">
                        {result.suggestions.map((s: string, i: number) => (
                          <div key={i} className="flex gap-3 bg-surface/50 border border-border p-3 rounded-xl text-xs text-muted">
                            <CheckCircle2 size={14} className="text-accent shrink-0 mt-0.5" />
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* RAW JSON */}
                  <div className="mt-4">
                    <h3 className="text-[10px] text-muted uppercase font-bold tracking-widest mb-2">Raw JSON Response</h3>
                    <pre className="bg-black/50 p-4 rounded-xl text-[10px] font-mono text-muted/80 overflow-x-auto">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
