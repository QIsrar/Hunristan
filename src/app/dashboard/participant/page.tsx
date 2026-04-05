"use client";
import { useEffect, useState } from "react";
import { safeGetUser } from "@/lib/supabase/getUser";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid
} from "recharts";
import {
  Trophy, Code2, Zap, Target, Clock, TrendingUp,
  CheckCircle2, XCircle, ArrowRight, Star, Award, Flame,
  ChevronUp, ChevronDown, Minus
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import type { Profile, Hackathon, Submission, LeaderboardEntry } from "@/types";
import { formatDistanceToNow, format, subDays } from "date-fns";

const LANG_COLORS: Record<string, string> = {
  python: "#3b82f6", javascript: "#f59e0b", cpp: "#8b5cf6",
  java: "#ef4444", go: "#10b981", rust: "#f97316", typescript: "#06b6d4",
};

function StatCard({ icon: Icon, label, value, sub, color, trend }: any) {
  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden group hover:border-white/10 transition-all">
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 ${color.replace("text-","bg-")}`} />
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color.replace("text-","bg-")}/10`}>
          <Icon size={20} className={color} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${trend > 0 ? "text-green-400" : trend < 0 ? "text-red-400" : "text-muted"}`}>
            {trend > 0 ? <ChevronUp size={12} /> : trend < 0 ? <ChevronDown size={12} /> : <Minus size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className={`font-display text-3xl font-bold ${color} mb-1`}>{value}</div>
      <div className="text-muted text-xs uppercase tracking-wider">{label}</div>
      {sub && <div className="text-muted text-xs mt-1">{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, icon: Icon, color, action }: any) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="font-display font-semibold text-lg flex items-center gap-2">
        <Icon size={18} className={color} /> {title}
      </h2>
      {action}
    </div>
  );
}

export default function ParticipantDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const user = await safeGetUser();
      if (!user) return router.push("/auth/signin");
      const [{ data: prof }, { data: hacks }, { data: subs }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("hackathons").select("*,profiles(full_name)").in("status", ["active", "upcoming"]).order("start_time").limit(6),
        supabase.from("submissions").select("*,problems(title,difficulty)").eq("user_id", user.id).order("submitted_at", { ascending: false }).limit(50),
      ]);
      if (!prof) return;
      if (prof.role !== "participant") return router.push(`/dashboard/${prof.role}`);
      setProfile(prof);
      setHackathons(hacks || []);
      setSubmissions(subs || []);
      const { data: lb } = await supabase.from("leaderboard").select("*,profiles(full_name,university)")
        .order("total_score", { ascending: false }).limit(5);
      setLeaderboard(lb || []);

      setLoading(false);
    }
    load();
  }, []);

  // Chart data
  const activityData = [...Array(14)].map((_, i) => {
    const date = subDays(new Date(), 13 - i);
    const dayStr = format(date, "yyyy-MM-dd");
    const count = submissions.filter((s: any) => s.submitted_at?.startsWith(dayStr)).length;
    return { date: format(date, "MMM d"), submissions: count };
  });

  const langData = Object.entries(
    submissions.reduce((acc: Record<string, number>, s) => { acc[s.language] = (acc[s.language] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value, color: LANG_COLORS[name] || "#6b7280" }));

  const acceptedCount = submissions.filter((s: any) => s.verdict === "accepted").length;
  const wrongCount = submissions.filter((s: any) => s.verdict === "wrong_answer").length;
  const tleCount = submissions.filter((s: any) => s.verdict === "time_limit_exceeded").length;

  const radarData = [
    { skill: "Algorithms", score: Math.min(100, acceptedCount * 15) },
    { skill: "Speed", score: Math.min(100, 100 - (tleCount * 20)) },
    { skill: "Accuracy", score: submissions.length > 0 ? Math.round((acceptedCount / submissions.length) * 100) : 0 },
    { skill: "Consistency", score: Math.min(100, activityData.filter((d: any) => d.submissions > 0).length * 7) },
    { skill: "Difficulty", score: Math.min(100, submissions.filter((s: any) => (s as any).problems?.difficulty === "hard" && s.verdict === "accepted").length * 25) },
  ];

  const verdictChartData = [
    { name: "Accepted", value: acceptedCount, color: "#10b981" },
    { name: "Wrong Answer", value: wrongCount, color: "#ef4444" },
    { name: "TLE/Other", value: submissions.length - acceptedCount - wrongCount, color: "#f59e0b" },
  ].filter((d: any) => (d as any).value > 0);

  const stats = [
    (() => {
      const total = submissions.length;
      const accepted = submissions.filter((s: any) => s.verdict === "accepted").length;
      const rate = total > 0 ? Math.round((accepted / total) * 100) : undefined;
      return { icon: Flame, label: "Total Points", value: profile?.total_points || 0, color: "text-accent", trend: undefined, sub: total > 0 ? `${rate}% accept rate` : undefined };
    })(),
    { icon: Code2, label: "Problems Solved", value: profile?.problems_solved || 0, color: "text-green-400", trend: undefined, sub: `${submissions.length} submissions` },
    { icon: Trophy, label: "Best Rank", value: profile?.best_rank ? `#${profile.best_rank}` : "—", color: "text-accent3", trend: undefined },
    { icon: Award, label: "Hackathons", value: profile?.hackathons_participated || 0, color: "text-accent2", trend: undefined },
  ];

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-muted font-display">Loading dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />
      <div className="pt-20 px-4 md:px-6 pb-12 max-w-7xl mx-auto">

        {/* Welcome header */}
        <div className="mt-6 mb-8 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-2xl font-bold text-bg font-display shrink-0">
            {profile?.full_name?.[0]}
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">
              Welcome back, <span className="gradient-text">{profile?.full_name?.split(" ")[0]}</span> 👋
            </h1>
            <p className="text-muted text-sm mt-0.5">{profile?.university} · Participant</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s: any) => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Row 1: Activity chart + Radar */}
        <div className="grid lg:grid-cols-5 gap-6 mb-6">

          {/* Activity timeline */}
          <div className="lg:col-span-3 glass rounded-2xl p-6">
            <SectionHeader title="Submission Activity" icon={TrendingUp} color="text-accent" />
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={activityData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#f1f5f9" }} />
                <Area type="monotone" dataKey="submissions" stroke="#00e5ff" strokeWidth={2} fill="url(#areaGrad)" dot={false} activeDot={{ r: 4, fill: "#00e5ff" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Skills radar */}
          <div className="lg:col-span-2 glass rounded-2xl p-6">
            <SectionHeader title="Skill Profile" icon={Star} color="text-accent2" />
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: "#6b7280", fontSize: 11 }} />
                <Radar dataKey="score" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#f1f5f9" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 2: Main content + sidebar */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* Active Hackathons */}
            <div className="glass rounded-2xl p-6">
              <SectionHeader title="Active & Upcoming" icon={Zap} color="text-accent"
                action={<Link href="/hackathons" className="text-sm text-accent hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>} />
              <div className="space-y-3">
                {hackathons.length === 0 && (
                  <div className="text-center py-10">
                    <Zap size={36} className="text-muted/30 mx-auto mb-2" />
                    <p className="text-muted text-sm">No active hackathons. Check back soon!</p>
                    <Link href="/hackathons" className="btn-primary inline-block mt-3 text-sm !py-2 !px-4">Browse All</Link>
                  </div>
                )}
                {hackathons.map((h: any) => (
                  <Link key={h.id} href={`/hackathons/${h.id}`}
                    className="flex items-center justify-between p-4 rounded-xl bg-surface/50 hover:bg-white/5 border border-border hover:border-accent/20 transition-all group">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="font-semibold text-sm group-hover:text-accent transition-colors truncate">{h.title}</div>
                      <div className="text-xs text-muted mt-0.5 flex items-center gap-1">
                        <Clock size={10} />
                        {h.status === "active" ? `Ends ${formatDistanceToNow(new Date(h.end_time), { addSuffix: true })}` : `Starts ${formatDistanceToNow(new Date(h.start_time), { addSuffix: true })}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full badge-${h.status}`}>{h.status}</span>
                      <ArrowRight size={14} className="text-muted group-hover:text-accent transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Submissions */}
            <div className="glass rounded-2xl p-6">
              <SectionHeader title="Recent Submissions" icon={Target} color="text-accent2" />
              {submissions.length === 0 ? (
                <div className="text-center py-10">
                  <Code2 size={40} className="text-muted/20 mx-auto mb-3" />
                  <p className="text-muted text-sm">No submissions yet. Solve your first problem!</p>
                  <Link href="/hackathons" className="btn-primary inline-block mt-4 text-sm !py-2 !px-4">Find a Hackathon</Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted text-xs uppercase tracking-wider border-b border-border">
                        <th className="text-left pb-3">Problem</th>
                        <th className="text-left pb-3 hidden md:table-cell">Language</th>
                        <th className="text-left pb-3">Verdict</th>
                        <th className="text-right pb-3">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {submissions.slice(0, 8).map((s: any) => (
                        <tr key={s.id} className="hover:bg-white/2 transition-colors">
                          <td className="py-3 font-medium truncate max-w-[160px]">{(s as any).problems?.title || "—"}</td>
                          <td className="py-3 font-mono text-muted text-xs hidden md:table-cell">{s.language}</td>
                          <td className="py-3">
                            <span className={`flex items-center gap-1 text-xs verdict-${s.verdict}`}>
                              {s.verdict === "accepted" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                              <span className="hidden sm:inline">{s.verdict.replace(/_/g, " ")}</span>
                            </span>
                          </td>
                          <td className="py-3 text-right font-mono text-xs">{s.score}/{s.max_score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">

            {/* Verdict breakdown pie */}
            {verdictChartData.length > 0 && (
              <div className="glass rounded-2xl p-6">
                <SectionHeader title="Verdict Breakdown" icon={Target} color="text-accent3" />
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={verdictChartData} innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                      {verdictChartData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {verdictChartData.map((d: any) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: d.color }} /><span className="text-muted">{d.name}</span></div>
                      <span className="font-mono font-medium">{(d as any).value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Language breakdown */}
            {langData.length > 0 && (
              <div className="glass rounded-2xl p-6">
                <SectionHeader title="Languages Used" icon={Code2} color="text-accent" />
                <div className="space-y-3">
                  {langData.slice(0, 5).map((l: any) => {
                    const total = langData.reduce((s, d) => s + (d as any).value, 0);
                    return (
                      <div key={l.name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-mono text-muted">{l.name}</span>
                          <span className="font-mono">{Math.round(((l as any).value / total) * 100)}%</span>
                        </div>
                        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${((l as any).value / total) * 100}%`, background: l.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Leaderboard */}
            <div className="glass rounded-2xl p-6">
              <SectionHeader title="Top Coders" icon={Trophy} color="text-accent3" />
              <div className="space-y-3">
                {leaderboard.map((entry: any, i: number) => (
                  <div key={entry.id} className="flex items-center gap-3">
                    <span className={`w-5 text-center font-display font-bold text-sm shrink-0 ${i === 0 ? "text-accent3" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-700" : "text-muted"}`}>
                      {i < 3 ? ["🥇","🥈","🥉"][i] : `#${i+1}`}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent/60 to-accent2/60 flex items-center justify-center text-xs font-bold text-bg shrink-0">
                      {(entry as any).profiles?.full_name?.[0] || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{(entry as any).profiles?.full_name || "Unknown"}</div>
                      <div className="text-xs text-muted truncate">{(entry as any).profiles?.university}</div>
                    </div>
                    <div className="text-sm font-mono text-accent shrink-0">{entry.total_score}</div>
                  </div>
                ))}
                {leaderboard.length === 0 && <p className="text-muted text-sm text-center py-4">No data yet</p>}
              </div>
            </div>

            {/* Level Progress */}
            <div className="glass rounded-2xl p-6">
              <SectionHeader title="Level Progress" icon={Star} color="text-accent2" />
              {[
                { label: "Easy", emoji: "🟢", solved: Math.min(profile?.problems_solved || 0, 5), total: 5, color: "#10b981" },
                { label: "Medium", emoji: "🟡", solved: Math.max(0, Math.min((profile?.problems_solved || 0) - 5, 5)), total: 5, color: "#f59e0b" },
                { label: "Hard", emoji: "🔴", solved: Math.max(0, (profile?.problems_solved || 0) - 10), total: 5, color: "#ef4444" },
              ].map((lv: any) => (
                <div key={lv.label} className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="flex items-center gap-1.5">{lv.emoji} <span className="text-muted">{lv.label}</span></span>
                    <span className="font-mono text-muted">{lv.solved}/{lv.total}</span>
                  </div>
                  <div className="h-2 bg-surface rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(lv.solved / lv.total) * 100}%`, background: lv.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}