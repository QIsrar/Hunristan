"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { safeGetUser } from "@/lib/supabase/getUser";
import { Trophy, RefreshCw, Snowflake, Filter, ArrowLeft, Code2, Layers } from "lucide-react";
import type { LeaderboardEntry, Hackathon, CompetitionCategory } from "@/types";
import { formatDistanceToNow } from "date-fns";

export default function LeaderboardPage() {
  const params = useParams();
  const router = useRouter();
  const hackathonId = params.id as string;

  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [uniFilter, setUniFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [firstProblemId, setFirstProblemId] = useState<string | null>(null);

  // Multi-track
  const [categories, setCategories] = useState<CompetitionCategory[]>([]);
  const [activeTab, setActiveTab] = useState<string>("overall");
  const [multiTrackEntries, setMultiTrackEntries] = useState<any[]>([]);

  const supabase = createClient();

  const fetchLeaderboard = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("leaderboard")
        .select("*,profiles(id,full_name,university,avatar_url)")
        .eq("hackathon_id", hackathonId)
        .order("total_score", { ascending: false })
        .order("last_submission_at", { ascending: true });

      if (err) throw err;

      const enriched = await Promise.all((data || []).map(async (e: any) => {
        if ((e as any).profiles?.university) return e;
        const { data: prof } = await supabase.from("profiles")
          .select("full_name,university,avatar_url").eq("id", e.user_id).single();
        return { ...e, profiles: prof || (e as any).profiles };
      }));

      const ranked = enriched.map((e: any, i: number) => ({ ...e, rank: i + 1 }));
      setEntries(ranked);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e?.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hackathonId]);

  useEffect(() => {
    (async () => {
      const user = await safeGetUser();
      if (user) setMyId(user.id);
    })();

    supabase.from("hackathons").select("*, competition_categories(*)").eq("id", hackathonId).single()
      .then(({ data }) => {
        setHackathon(data);
        if (data?.competition_type === "MULTI_TRACK") {
          const cats = (data as any).competition_categories || [];
          setCategories(cats);
          supabase.from("submissions_v2")
            .select("participant_id, category_id, final_score, ai_score, ai_status, profiles(full_name, university)")
            .eq("hackathon_id", hackathonId)
            .then(({ data: subs }) => {
              setMultiTrackEntries(subs || []);
              setLoading(false);
            });
          return;
        }
        fetchLeaderboard();
      });

    supabase.from("problems").select("id").eq("hackathon_id", hackathonId)
      .order("order_index").limit(1)
      .then(({ data }) => { if (data?.[0]) setFirstProblemId(data[0].id); });

    const channel = supabase
      .channel(`leaderboard:${hackathonId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "leaderboard",
        filter: `hackathon_id=eq.${hackathonId}`,
      }, () => fetchLeaderboard())
      .subscribe();

    const iv = setInterval(() => fetchLeaderboard(), 30000);
    return () => { supabase.removeChannel(channel); clearInterval(iv); };
  }, [hackathonId]);

  // Coding leaderboard filter
  const filtered = uniFilter
    ? entries.filter(e => (e as any).profiles?.university?.toLowerCase().includes(uniFilter.toLowerCase()))
    : entries;
  const unis = Array.from(new Set(entries.map(e => (e as any).profiles?.university).filter(Boolean)));

  // Multi-track computed rankings
  const isMultiTrack = (hackathon as any)?.competition_type === "MULTI_TRACK";

  const multiTrackRanked = (() => {
    if (!isMultiTrack) return [];
    const perParticipant: Record<string, { name: string; university: string; scores: Record<string, number>; total: number }> = {};
    for (const sub of multiTrackEntries) {
      const pid = sub.participant_id;
      const score = sub.final_score ?? sub.ai_score ?? 0;
      if (!perParticipant[pid]) {
        perParticipant[pid] = { name: sub.profiles?.full_name || "Unknown", university: sub.profiles?.university || "", scores: {}, total: 0 };
      }
      perParticipant[pid].scores[sub.category_id] = score;
      perParticipant[pid].total += score;
    }
    return Object.entries(perParticipant)
      .map(([pid, d]) => ({ pid, ...d }))
      .sort((a, b) => b.total - a.total)
      .map((e, i) => ({ ...e, rank: i + 1 }));
  })();

  const multiTrackFiltered = activeTab === "overall"
    ? multiTrackRanked
    : [...multiTrackRanked]
        .sort((a, b) => (b.scores[activeTab] ?? 0) - (a.scores[activeTab] ?? 0))
        .map((e, i) => ({ ...e, rank: i + 1 }));

  const rankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const participantCount = isMultiTrack ? multiTrackRanked.length : entries.length;

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => router.push(`/hackathons/${hackathonId}`)}
                className="flex items-center gap-1.5 text-muted hover:text-text transition-colors text-sm">
                <ArrowLeft size={15} /> Back
              </button>
              {hackathon?.status === "active" && firstProblemId && !isMultiTrack && (
                <button onClick={() => router.push(`/arena/${hackathonId}/${firstProblemId}`)}
                  className="flex items-center gap-1.5 text-accent hover:text-accent/80 transition-colors text-sm font-medium">
                  <Code2 size={15} /> Back to Arena
                </button>
              )}
            </div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <Trophy size={28} className="text-accent3" />
              Leaderboard
              {isMultiTrack && <span className="text-sm font-normal text-accent glass px-3 py-1 rounded-full flex items-center gap-1"><Layers size={13} /> Multi-Track</span>}
              {hackathon?.leaderboard_frozen && (
                <span className="flex items-center gap-1 text-accent text-sm font-normal glass px-3 py-1 rounded-full">
                  <Snowflake size={14} /> Frozen
                </span>
              )}
            </h1>
            {hackathon && <p className="text-muted mt-1">{hackathon.title}</p>}
          </div>

          <div className="flex items-center gap-3">
            {!isMultiTrack && unis.length > 0 && (
              <div className="relative">
                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <select value={uniFilter} onChange={e => setUniFilter(e.target.value)}
                  className="input-glass !py-2 pl-8 text-sm">
                  <option value="">All Universities</option>
                  {unis.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            )}
            {!isMultiTrack && (
              <button onClick={() => fetchLeaderboard(true)} disabled={refreshing}
                className="flex items-center gap-2 px-3 py-2 glass rounded-lg hover:text-accent transition-colors text-sm disabled:opacity-50">
                <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            )}
          </div>
        </div>

        <p className="text-muted text-xs mb-6">
          Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })} · {participantCount} participant{participantCount !== 1 ? "s" : ""}
        </p>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-6 text-sm flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => fetchLeaderboard(true)} className="text-xs underline">Retry</button>
          </div>
        )}

        {/* ── MULTI_TRACK leaderboard ─────────────────────────────────────── */}
        {isMultiTrack && (
          <>
            {/* Category tabs */}
            <div className="flex gap-2 flex-wrap mb-5">
              <button onClick={() => setActiveTab("overall")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === "overall" ? "bg-accent text-bg" : "glass text-muted hover:text-text"}`}>
                <Trophy size={13} /> Overall
              </button>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setActiveTab(cat.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm transition-all ${activeTab === cat.id ? "bg-accent text-bg" : "glass text-muted hover:text-text"}`}>
                  <Layers size={13} /> {cat.name}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-20 text-muted animate-pulse">Loading rankings...</div>
            ) : multiTrackFiltered.length === 0 ? (
              <div className="text-center py-20 glass rounded-2xl">
                <Trophy size={48} className="text-muted mx-auto mb-3" />
                <p className="text-muted">No submissions yet. Be the first!</p>
              </div>
            ) : (
              <div className="glass rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted text-xs uppercase tracking-wider border-b border-border">
                      <th className="text-left p-4 w-16">Rank</th>
                      <th className="text-left p-4">Participant</th>
                      <th className="text-left p-4 hidden md:table-cell">University</th>
                      {activeTab === "overall" && categories.map(cat => (
                        <th key={cat.id} className="text-right p-3 hidden lg:table-cell text-xs">
                          {cat.name.length > 12 ? cat.name.slice(0, 12) + "…" : cat.name}
                        </th>
                      ))}
                      <th className="text-right p-4 text-accent">
                        {activeTab === "overall" ? "Total" : (categories.find(c => c.id === activeTab)?.name ?? "Score")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {multiTrackFiltered.map(entry => {
                      const isMe = entry.pid === myId;
                      return (
                        <tr key={entry.pid}
                          className={`transition-colors ${isMe ? "bg-accent/5 border-l-2 border-accent" : "hover:bg-white/2"}`}>
                          <td className="p-4">
                            <span className={`font-display font-bold ${entry.rank === 1 ? "text-accent3 text-lg" : entry.rank === 2 ? "text-slate-300 text-base" : entry.rank === 3 ? "text-amber-700 text-base" : "text-muted text-sm"}`}>
                              {rankIcon(entry.rank)}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-bg shrink-0 ${isMe ? "bg-accent" : "bg-gradient-to-br from-accent/60 to-accent2/60"}`}>
                                {entry.name?.[0] || "?"}
                              </div>
                              <span className={`font-medium ${isMe ? "text-accent" : ""}`}>
                                {entry.name}{isMe && <span className="text-xs text-accent ml-2">(you)</span>}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-muted text-xs hidden md:table-cell">{entry.university || "—"}</td>
                          {activeTab === "overall" && categories.map(cat => (
                            <td key={cat.id} className="p-4 text-right text-xs font-mono hidden lg:table-cell">
                              {entry.scores[cat.id] !== undefined
                                ? <span className="text-accent">{entry.scores[cat.id]}</span>
                                : <span className="text-muted/40">—</span>}
                            </td>
                          ))}
                          <td className="p-4 text-right font-mono font-bold">
                            <span className={isMe ? "text-accent" : ""}>
                              {activeTab === "overall" ? entry.total : (entry.scores[activeTab] ?? "—")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── CODING leaderboard ─────────────────────────────────────────── */}
        {!isMultiTrack && (
          <div className="glass rounded-2xl overflow-hidden">
            {loading ? (
              <div className="text-center py-20 text-muted animate-pulse">Loading rankings...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <Trophy size={48} className="text-muted mx-auto mb-3" />
                <p className="text-muted">No submissions yet. Be the first!</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted text-xs uppercase tracking-wider border-b border-border">
                    <th className="text-left p-4 w-16">Rank</th>
                    <th className="text-left p-4">Participant</th>
                    <th className="text-left p-4 hidden md:table-cell">University</th>
                    <th className="text-right p-4">Solved</th>
                    <th className="text-right p-4">Score</th>
                    <th className="text-right p-4 hidden lg:table-cell">Last Submission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.map(entry => {
                    const isMe = entry.user_id === myId;
                    return (
                      <tr key={entry.id}
                        className={`transition-colors ${isMe ? "bg-accent/5 border-l-2 border-accent" : "hover:bg-white/2"}`}>
                        <td className="p-4">
                          <span className={`font-display font-bold ${entry.rank === 1 ? "text-accent3 text-lg" : entry.rank === 2 ? "text-slate-300 text-base" : entry.rank === 3 ? "text-amber-700 text-base" : "text-muted text-sm"}`}>
                            {rankIcon(entry.rank || 0)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-bg shrink-0 ${isMe ? "bg-accent" : "bg-gradient-to-br from-accent/60 to-accent2/60"}`}>
                              {(entry as any).profiles?.full_name?.[0] || "?"}
                            </div>
                            <div>
                              {!isMe && (entry as any).profiles?.id ? (
                                <a href={`/users/${(entry as any).profiles.id}`}
                                  className="font-medium hover:text-accent transition-colors">
                                  {(entry as any).profiles?.full_name || "Unknown"}
                                </a>
                              ) : (
                                <div className={`font-medium ${isMe ? "text-accent" : ""}`}>
                                  {(entry as any).profiles?.full_name || "Unknown"}
                                  {isMe && <span className="text-xs text-accent ml-2">(you)</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-muted text-xs hidden md:table-cell">
                          {(entry as any).profiles?.university || "—"}
                        </td>
                        <td className="p-4 text-right font-mono">
                          <span className="text-green-400">{entry.problems_solved}</span>
                        </td>
                        <td className="p-4 text-right font-mono font-bold">
                          <span className={isMe ? "text-accent" : ""}>{entry.total_score}</span>
                        </td>
                        <td className="p-4 text-right text-muted text-xs hidden lg:table-cell">
                          {entry.last_submission_at
                            ? formatDistanceToNow(new Date(entry.last_submission_at), { addSuffix: true })
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}