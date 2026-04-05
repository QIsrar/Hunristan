"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import { Code2, Filter, Search, Trophy, Clock, Zap, ChevronRight, BookOpen } from "lucide-react";
import type { Problem } from "@/types";

// Practice problems are problems from ended/completed hackathons
export default function PracticePage() {
  const [problems, setProblems] = useState<(Problem & { hackathon_title?: string })[]>([]);
  const [filtered, setFiltered] = useState<typeof problems>([]);
  const [search, setSearch] = useState("");
  const [diff, setDiff] = useState<"all"|"easy"|"medium"|"hard">("all");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get problems from ended hackathons for practice
    supabase.from("problems")
      .select("*,hackathons!inner(title,status)")
      .eq("hackathons.status", "ended")
      .order("difficulty")
      .then(({ data }) => {
        const probs = (data || []).map((p: any) => ({ ...p, hackathon_title: p.hackathons?.title }));
        // Fallback sample if no ended hackathons
        const fallback = probs.length > 0 ? probs : SAMPLE_PRACTICE_PROBLEMS;
        setProblems(fallback);
        setFiltered(fallback);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let result = problems;
    if (diff !== "all") result = result.filter(p => p.difficulty === diff);
    if (search) result = result.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));
    setFiltered(result);
  }, [diff, search, problems]);

  const diffColor = (d: string) => d === "easy" ? "badge-easy" : d === "medium" ? "badge-medium" : "badge-hard";

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent2/10 flex items-center justify-center">
              <BookOpen size={20} className="text-accent2" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold">Practice Arena</h1>
              <p className="text-muted text-sm">Sharpen your skills with problems from past hackathons</p>
            </div>
          </div>
        </div>

        {/* Stats banner */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Easy", count: problems.filter(p => p.difficulty === "easy").length, color: "text-green-400", bg: "bg-green-400/10" },
            { label: "Medium", count: problems.filter(p => p.difficulty === "medium").length, color: "text-yellow-400", bg: "bg-yellow-400/10" },
            { label: "Hard", count: problems.filter(p => p.difficulty === "hard").length, color: "text-red-400", bg: "bg-red-400/10" },
          ].map(s => (
            <div key={s.label} className={`glass rounded-xl p-4 text-center cursor-pointer hover:border-white/10 transition-all`} onClick={() => setDiff(s.label.toLowerCase() as any)}>
              <div className={`font-display text-3xl font-bold ${s.color}`}>{s.count}</div>
              <div className="text-muted text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input-glass pl-9 text-sm" placeholder="Search problems..." />
          </div>
          <div className="flex gap-2">
            {["all","easy","medium","hard"].map(d => (
              <button key={d} onClick={() => setDiff(d as any)}
                className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all ${diff === d ? "bg-accent text-bg" : "glass text-muted hover:text-text"}`}>
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Problem list */}
        <div className="space-y-2">
          {loading ? (
            [...Array(6)].map((_, i) => <div key={i} className="glass rounded-xl h-16 animate-pulse" />)
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Code2 size={48} className="text-muted/20 mx-auto mb-3" />
              <p className="text-muted">No problems match your filters</p>
            </div>
          ) : filtered.map((p, i) => (
            <Link key={p.id} href={`/arena/practice/${p.id}`}
              className="flex items-center gap-4 p-4 glass rounded-xl hover:border-accent/20 hover:bg-white/3 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-xs font-bold font-mono text-muted shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm group-hover:text-accent transition-colors">{p.title}</div>
                <div className="text-xs text-muted mt-0.5">{p.hackathon_title}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full ${diffColor(p.difficulty)}`}>{p.difficulty}</span>
                <span className="text-xs text-muted font-mono">{p.points} pts</span>
                <ChevronRight size={14} className="text-muted group-hover:text-accent transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

const SAMPLE_PRACTICE_PROBLEMS = [
  { id:"p1", hackathon_id:"h1", title:"Two Sum", slug:"two-sum", description:"Find two numbers that add up to a target.", difficulty:"easy" as const, time_limit_ms:2000, memory_limit_mb:256, points:100, order_index:0, hackathon_title:"HackFest 2023" },
  { id:"p2", hackathon_id:"h1", title:"Maximum Subarray", slug:"max-subarray", description:"Find the contiguous subarray with the maximum sum.", difficulty:"easy" as const, time_limit_ms:2000, memory_limit_mb:256, points:100, order_index:1, hackathon_title:"HackFest 2023" },
  { id:"p3", hackathon_id:"h2", title:"Longest Palindromic Substring", slug:"longest-palindrome", description:"Find the longest palindromic substring in a string.", difficulty:"medium" as const, time_limit_ms:2000, memory_limit_mb:256, points:200, order_index:0, hackathon_title:"CodeWar 2023" },
  { id:"p4", hackathon_id:"h2", title:"Word Ladder", slug:"word-ladder", description:"Transform one word to another by changing one letter at a time.", difficulty:"medium" as const, time_limit_ms:3000, memory_limit_mb:256, points:250, order_index:1, hackathon_title:"CodeWar 2023" },
  { id:"p5", hackathon_id:"h3", title:"N-Queens", slug:"n-queens", description:"Place N queens on an NxN chessboard so no two queens attack each other.", difficulty:"hard" as const, time_limit_ms:5000, memory_limit_mb:512, points:400, order_index:0, hackathon_title:"AlgoBlitz 2024" },
  { id:"p6", hackathon_id:"h3", title:"Shortest Path in Grid", slug:"grid-shortest-path", description:"Find the shortest path from top-left to bottom-right in a grid.", difficulty:"hard" as const, time_limit_ms:5000, memory_limit_mb:512, points:500, order_index:1, hackathon_title:"AlgoBlitz 2024" },
];
