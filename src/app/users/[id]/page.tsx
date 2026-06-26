"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeGetUser } from "@/lib/supabase/getUser";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import {
  Trophy, Code2, Zap, Award, Github, Linkedin, Edit2,
  ArrowLeft, Calendar, Loader2, MessageSquare, CheckCircle2,
  XCircle, Clock, Layers, FileText, FileUp, CheckSquare,
  Link2, Globe, MapPin, TrendingUp, ExternalLink, Mail,
} from "lucide-react";

const CAT_ICONS: Record<string, React.ElementType> = { TEXT: FileText, FILE: FileUp, MCQ: CheckSquare, URL: Link2, CODE: Code2 };
const CAT_COLORS: Record<string, string> = {
  TEXT: "text-violet-400", IMAGE: "text-pink-400", FILE: "text-amber-400",
  MCQ: "text-green-400", URL: "text-orange-400", CODE: "text-cyan-400",
};
const CAT_BG: Record<string, string> = {
  TEXT: "bg-violet-400/10", IMAGE: "bg-pink-400/10", FILE: "bg-amber-400/10",
  MCQ: "bg-green-400/10", URL: "bg-orange-400/10", CODE: "bg-cyan-400/10",
};
const VERDICT_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  accepted: { label: "Accepted", icon: CheckCircle2, color: "text-green-400" },
  wrong_answer: { label: "Wrong Answer", icon: XCircle, color: "text-red-400" },
  time_limit_exceeded: { label: "TLE", icon: Clock, color: "text-amber-400" },
  runtime_error: { label: "Runtime Err", icon: Zap, color: "text-orange-400" },
  compilation_error: { label: "Compile Err", icon: Code2, color: "text-red-300" },
  pending: { label: "Pending", icon: Clock, color: "text-muted" },
};
const POST_COLORS: Record<string, { label: string; color: string }> = {
  discussion: { label: "Discussion", color: "text-accent" },
  team_request: { label: "Looking for Team", color: "text-accent2" },
  showcase: { label: "Showcase", color: "text-accent3" },
  announcement: { label: "Announcement", color: "text-amber-400" },
};

function AvatarBlock({ name }: { name: string }) {
  return (
    <div className="w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-gradient-to-br from-accent via-accent2 to-accent3 flex items-center justify-center text-4xl font-bold text-bg font-display shrink-0 shadow-xl shadow-accent/20 select-none">
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function StatPill({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden hover:border-white/10 transition-all">
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10 ${color.replace("text-", "bg-")}`} />
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color.replace("text-", "bg-")}/10`}>
        <Icon size={18} className={color} />
      </div>
      <div className={`font-display text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted uppercase tracking-wider">{label}</div>
    </div>
  );
}

export default function PublicProfilePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const supabase = createClient();

  const [myId, setMyId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [hackathons, setHackathons] = useState<any[]>([]);
  const [codingSubs, setCodingSubs] = useState<any[]>([]);
  const [multiSubs, setMultiSubs] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "coding" | "events" | "posts">("overview");

  const load = useCallback(async () => {
    const user = await safeGetUser();
    if (user) setMyId(user.id);

    const { data: prof } = await supabase.from("profiles").select("*").eq("id", id).single();
    if (!prof) { router.push("/participants"); return; }
    setProfile(prof);

    const [
      { data: regs },
      { data: subs },
      { data: v2 },
      { data: cposts },
    ] = await Promise.all([
      supabase.from("registrations")
        .select("*, hackathons(id,title,status,start_time,end_time,competition_type)")
        .eq("user_id", id).order("registered_at", { ascending: false }).limit(20),
      supabase.from("submissions")
        .select("id,verdict,language,submitted_at,problems(title,difficulty,points)")
        .eq("user_id", id).order("submitted_at", { ascending: false }).limit(30),
      supabase.from("submissions_v2")
        .select("id,ai_score,ai_status,submitted_at,competition_categories(name,type,max_score),hackathons(title)")
        .eq("participant_id", id).order("submitted_at", { ascending: false }).limit(20),
      supabase.from("community_posts")
        .select("id,title,content,post_type,upvotes,created_at")
        .eq("author_id", id).order("created_at", { ascending: false }).limit(10),
    ]);

    const hackathonIds = (regs ?? []).map((r: any) => r.hackathon_id);
    const lbMap: Record<string, any> = {};
    if (hackathonIds.length > 0) {
      const { data: lbData } = await supabase.from("leaderboard")
        .select("hackathon_id,total_score,rank").eq("user_id", id).in("hackathon_id", hackathonIds);
      (lbData ?? []).forEach((l: any) => { lbMap[l.hackathon_id] = l; });
    }

    setHackathons((regs ?? []).map((r: any) => ({ ...r, lb: lbMap[r.hackathon_id] })));
    setCodingSubs(subs ?? []);
    setMultiSubs(v2 ?? []);
    setPosts(cposts ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Loader2 size={32} className="text-accent animate-spin" />
    </div>
  );
  if (!profile) return null;

  const isOwn = myId === id;
  const accepted = codingSubs.filter((s: any) => s.verdict === "accepted").length;
  const acceptRate = codingSubs.length > 0 ? Math.round((accepted / codingSubs.length) * 100) : 0;

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "coding", label: `Coding (${codingSubs.length})` },
    { id: "events", label: `Events (${hackathons.length})` },
    { id: "posts", label: `Posts (${posts.length})` },
  ] as const;

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />
      <div className="pt-20 pb-16 px-4 md:px-6 max-w-5xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mt-6 mb-6">
          <button onClick={() => router.back()} className="p-2 glass rounded-lg hover:text-accent transition-colors">
            <ArrowLeft size={16} />
          </button>
          <nav className="text-sm text-muted flex items-center gap-1.5">
            <Link href="/participants" className="hover:text-accent transition-colors">Participants</Link>
            <span>/</span>
            <span className="text-text truncate">{profile.full_name}</span>
          </nav>
        </div>

        {/* ── Hero card ── */}
        <div className="glass rounded-3xl p-6 md:p-8 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-accent2/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <AvatarBlock name={profile.full_name} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="font-display text-2xl md:text-3xl font-bold">{profile.full_name}</h1>
                {profile.role !== "participant" && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/15 text-accent border border-accent/20 capitalize">
                    {profile.role}
                  </span>
                )}
                {isOwn && (
                  <Link href="/profile"
                    className="flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors px-2.5 py-1 glass rounded-lg border border-border">
                    <Edit2 size={11} /> Edit Profile
                  </Link>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted mb-3">
                {profile.university && <span className="flex items-center gap-1.5"><MapPin size={12} />{profile.university}</span>}
                {profile.experience_level && <span className="flex items-center gap-1.5 capitalize"><TrendingUp size={12} />{profile.experience_level}</span>}
                {profile.degree_program && <span className="flex items-center gap-1.5"><Globe size={12} />{profile.degree_program}</span>}
                <span className="flex items-center gap-1.5">
                  <Calendar size={12} /> Joined {format(new Date(profile.created_at), "MMM yyyy")}
                </span>
              </div>
              {profile.bio && (
                <p className="text-sm text-muted leading-relaxed mb-4 max-w-xl">{profile.bio}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {profile.github_url && (
                  <a href={profile.github_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 glass rounded-lg text-xs text-muted hover:text-accent transition-colors border border-border hover:border-accent/30">
                    <Github size={13} /> GitHub
                  </a>
                )}
                {profile.linkedin_url && (
                  <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 glass rounded-lg text-xs text-muted hover:text-accent2 transition-colors border border-border hover:border-accent2/30">
                    <Linkedin size={13} /> LinkedIn
                  </a>
                )}
                {!isOwn && (
                  <>
                    <Link href={`/messages?user_id=${id}`}
                      className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg text-xs text-accent hover:bg-accent/20 transition-colors">
                      <Mail size={13} /> Message
                    </Link>
                    <Link href="/community"
                      className="flex items-center gap-2 px-3 py-1.5 glass rounded-lg text-xs text-muted hover:text-accent transition-colors border border-border hover:border-accent/30">
                      <MessageSquare size={13} /> Post in Community
                    </Link>
                  </>
                )}
              </div>
            </div>
            {profile.elo_rating && (
              <div className="shrink-0 text-center p-4 bg-gradient-to-br from-accent/10 to-accent2/10 border border-accent/20 rounded-2xl hidden sm:block">
                <div className="font-display text-2xl font-bold gradient-text">{profile.elo_rating}</div>
                <div className="text-xs text-muted mt-0.5">ELO Rating</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatPill icon={Zap} label="Total Points" value={(profile.total_points ?? 0).toLocaleString()} color="text-accent" />
          <StatPill icon={Code2} label="Problems Solved" value={profile.problems_solved ?? 0} color="text-green-400" />
          <StatPill icon={Trophy} label="Best Rank" value={profile.best_rank ? `#${profile.best_rank}` : "—"} color="text-accent3" />
          <StatPill icon={Award} label="Events Joined" value={profile.hackathons_participated ?? 0} color="text-accent2" />
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 glass rounded-xl p-1 mb-6 w-fit overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${tab === t.id ? "bg-accent text-bg" : "text-muted hover:text-text"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {tab === "overview" && (
          <div className="grid md:grid-cols-2 gap-6">

            {/* Coding snapshot */}
            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Code2 size={15} className="text-cyan-400" /> Coding Snapshot
              </h3>
              {codingSubs.length === 0
                ? <p className="text-sm text-muted text-center py-6">No coding submissions yet.</p>
                : (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Accept Rate</span>
                      <span className="font-mono text-green-400">{acceptRate}%</span>
                    </div>
                    <div className="h-2 bg-surface rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${acceptRate}%` }} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {[
                        { label: "Accepted", val: accepted, color: "text-green-400" },
                        { label: "Wrong", val: codingSubs.filter((s: any) => s.verdict === "wrong_answer").length, color: "text-red-400" },
                        { label: "TLE", val: codingSubs.filter((s: any) => s.verdict === "time_limit_exceeded").length, color: "text-amber-400" },
                      ].map(m => (
                        <div key={m.label} className="text-center p-2 bg-surface/50 rounded-lg">
                          <div className={`font-mono font-bold text-lg ${m.color}`}>{m.val}</div>
                          <div className="text-xs text-muted">{m.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {Object.entries(
                        codingSubs.reduce((a: Record<string, number>, s: any) => {
                          a[s.language] = (a[s.language] || 0) + 1; return a;
                        }, {})
                      ).slice(0, 4).map(([lang, cnt]) => (
                        <div key={lang} className="flex items-center gap-2">
                          <span className="text-xs text-muted w-20 capitalize">{lang}</span>
                          <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                            <div className="h-full bg-accent/60 rounded-full"
                              style={{ width: `${((cnt as number) / codingSubs.length) * 100}%` }} />
                          </div>
                          <span className="text-xs text-muted font-mono">{cnt as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }
            </div>

            {/* Recent events */}
            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Trophy size={15} className="text-accent3" /> Recent Events
              </h3>
              {hackathons.length === 0
                ? <p className="text-sm text-muted text-center py-6">No events joined yet.</p>
                : (
                  <div className="space-y-3">
                    {hackathons.slice(0, 5).map((reg: any) => {
                      const h = reg.hackathons; const lb = reg.lb;
                      return (
                        <Link key={reg.id} href={`/hackathons/${h?.id}`}
                          className="flex items-center gap-3 p-3 bg-surface/30 rounded-xl hover:bg-surface/60 transition-all group">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${h?.competition_type === "MULTI_TRACK" ? "bg-accent2/10" : "bg-accent/10"}`}>
                            {h?.competition_type === "MULTI_TRACK"
                              ? <Layers size={14} className="text-accent2" />
                              : <Code2 size={14} className="text-accent" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-accent transition-colors">{h?.title}</p>
                            <p className="text-xs text-muted">{h?.status} · {format(new Date(reg.registered_at), "MMM d, yyyy")}</p>
                          </div>
                          {lb && (
                            <div className="text-right shrink-0">
                              <div className="text-xs font-mono text-accent3 font-bold">#{lb.rank}</div>
                              <div className="text-xs text-muted">{lb.total_score}pts</div>
                            </div>
                          )}
                          <ExternalLink size={12} className="text-muted group-hover:text-accent transition-colors" />
                        </Link>
                      );
                    })}
                  </div>
                )
              }
            </div>

            {/* Multi-track subs */}
            {multiSubs.length > 0 && (
              <div className="glass rounded-2xl p-5 md:col-span-2">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <Layers size={15} className="text-accent2" /> Multi-Track Submissions
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {multiSubs.slice(0, 6).map((s: any) => {
                    const cat = s.competition_categories;
                    const Icon = (CAT_ICONS[cat?.type] ?? Layers) as React.ElementType;
                    const pct = cat?.max_score > 0 && s.ai_score != null
                      ? Math.round((s.ai_score / cat.max_score) * 100) : null;
                    return (
                      <div key={s.id} className={`p-3 rounded-xl border border-border ${CAT_BG[cat?.type] ?? "bg-surface/30"}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Icon size={13} className={CAT_COLORS[cat?.type] ?? "text-muted"} />
                          <span className="text-xs font-medium truncate">{cat?.name}</span>
                        </div>
                        <p className="text-xs text-muted truncate mb-1">{s.hackathons?.title}</p>
                        {pct !== null ? (
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted">Score</span>
                              <span className="font-mono text-accent">{s.ai_score}/{cat?.max_score}</span>
                            </div>
                            <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                              <div className="h-full bg-accent/60 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        ) : <span className="text-xs text-muted">{s.ai_status}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Community activity */}
            {posts.length > 0 && (
              <div className="glass rounded-2xl p-5 md:col-span-2">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <MessageSquare size={15} className="text-violet-400" /> Community Activity
                </h3>
                <div className="space-y-2">
                  {posts.slice(0, 4).map((p: any) => {
                    const meta = POST_COLORS[p.post_type] ?? POST_COLORS.discussion;
                    return (
                      <Link key={p.id} href={`/community/${p.id}`}
                        className="flex items-start gap-3 p-3 bg-surface/30 rounded-xl hover:bg-surface/60 transition-all group">
                        <div className="w-1 self-stretch bg-accent/30 rounded-full shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                            <span className="text-xs text-muted">
                              {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm font-medium group-hover:text-accent transition-colors truncate">{p.title}</p>
                          <p className="text-xs text-muted truncate mt-0.5">{p.content?.slice(0, 80)}…</p>
                        </div>
                        <div className="text-xs text-muted shrink-0">▲ {p.upvotes}</div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Coding ── */}
        {tab === "coding" && (
          <div className="glass rounded-2xl overflow-hidden">
            {codingSubs.length === 0
              ? <div className="p-12 text-center"><Code2 size={40} className="text-muted/30 mx-auto mb-3" /><p className="text-muted">No coding submissions yet.</p></div>
              : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-xs text-muted uppercase tracking-wider">
                      <th className="text-left px-5 py-3 font-medium">Problem</th>
                      <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Language</th>
                      <th className="text-left px-5 py-3 font-medium">Verdict</th>
                      <th className="text-left px-5 py-3 font-medium hidden md:table-cell">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codingSubs.map((s: any, i: number) => {
                      const v = VERDICT_META[s.verdict] ?? VERDICT_META.pending;
                      const VIcon = v.icon;
                      return (
                        <tr key={s.id} className={`border-b border-border/30 hover:bg-white/2 transition-colors ${i % 2 === 0 ? "" : "bg-surface/10"}`}>
                          <td className="px-5 py-3">
                            <div className="font-medium">{s.problems?.title ?? "—"}</div>
                            <div className={`text-xs capitalize ${s.problems?.difficulty === "easy" ? "text-green-400"
                                : s.problems?.difficulty === "medium" ? "text-amber-400"
                                  : "text-red-400"}`}>{s.problems?.difficulty}</div>
                          </td>
                          <td className="px-5 py-3 hidden sm:table-cell">
                            <span className="font-mono text-xs text-muted capitalize">{s.language}</span>
                          </td>
                          <td className="px-5 py-3">
                            <div className={`flex items-center gap-1.5 text-xs font-medium ${v.color}`}>
                              <VIcon size={12} />{v.label}
                            </div>
                          </td>
                          <td className="px-5 py-3 hidden md:table-cell">
                            <span className="text-xs text-muted">
                              {formatDistanceToNow(new Date(s.submitted_at), { addSuffix: true })}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            }
          </div>
        )}

        {/* ── Events ── */}
        {tab === "events" && (
          <div className="space-y-3">
            {hackathons.length === 0
              ? (
                <div className="glass rounded-2xl p-12 text-center">
                  <Trophy size={40} className="text-muted/30 mx-auto mb-3" />
                  <p className="text-muted">No events joined yet.</p>
                </div>
              )
              : hackathons.map((reg: any) => {
                const h = reg.hackathons; const lb = reg.lb;
                return (
                  <Link key={reg.id} href={`/hackathons/${h?.id}`}
                    className="glass rounded-2xl p-5 flex flex-col sm:flex-row gap-4 hover:border-accent/20 transition-all group">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${h?.competition_type === "MULTI_TRACK" ? "bg-accent2/10" : "bg-accent/10"}`}>
                        {h?.competition_type === "MULTI_TRACK"
                          ? <Layers size={18} className="text-accent2" />
                          : <Code2 size={18} className="text-accent" />}
                      </div>
                      <div>
                        <div className="font-semibold group-hover:text-accent transition-colors">{h?.title}</div>
                        <div className="text-xs text-muted mt-0.5">
                          {h?.competition_type === "MULTI_TRACK" ? "Multi-Track" : "Coding"} · {format(new Date(reg.registered_at), "MMM d, yyyy")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${h?.status === "active" ? "bg-green-500/15 text-green-400"
                          : h?.status === "upcoming" ? "bg-accent/15 text-accent"
                            : "bg-surface text-muted"}`}>{h?.status}</span>
                      {lb && (
                        <div className="text-right">
                          <div className="text-sm font-bold text-accent3 font-mono">#{lb.rank}</div>
                          <div className="text-xs text-muted">{lb.total_score} pts</div>
                        </div>
                      )}
                      <ExternalLink size={14} className="text-muted group-hover:text-accent transition-colors" />
                    </div>
                  </Link>
                );
              })
            }
          </div>
        )}

        {/* ── Posts ── */}
        {tab === "posts" && (
          <div className="space-y-3">
            {posts.length === 0
              ? (
                <div className="glass rounded-2xl p-12 text-center">
                  <MessageSquare size={40} className="text-muted/30 mx-auto mb-3" />
                  <p className="text-muted">No community posts yet.</p>
                </div>
              )
              : posts.map((p: any) => {
                const meta = POST_COLORS[p.post_type] ?? POST_COLORS.discussion;
                return (
                  <Link key={p.id} href={`/community/${p.id}`}
                    className="glass rounded-2xl p-5 block hover:border-accent/20 transition-all group">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <span className={`text-xs font-medium ${meta.color} mr-2`}>{meta.label}</span>
                        <span className="text-xs text-muted">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>
                      </div>
                      <div className="text-xs text-muted">▲ {p.upvotes}</div>
                    </div>
                    <h3 className="font-semibold group-hover:text-accent transition-colors mb-1">{p.title}</h3>
                    <p className="text-sm text-muted line-clamp-2">{p.content}</p>
                  </Link>
                );
              })
            }
          </div>
        )}

      </div>
    </div>
  );
}
