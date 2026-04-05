"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { Trophy, RefreshCw, Snowflake, Filter, ArrowLeft, Code2 } from "lucide-react";
import type { LeaderboardEntry, Hackathon } from "@/types";
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
  const supabase = createClient();

  const fetchLeaderboard = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("leaderboard")
        .select("*,profiles(full_name,university,avatar_url)")
        .eq("hackathon_id", hackathonId)
        .order("total_score", { ascending: false })
        .order("last_submission_at", { ascending: true });

      if (err) throw err;

      // Enrich with profiles if university is missing (join may return null)
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
      let user = null;
      try { const { data } = await supabase.auth.getUser(); user = data.user; }
      catch { await new Promise(r => setTimeout(r, 300)); try { const { data } = await supabase.auth.getUser(); user = data.user; } catch {} }
      if (user) setMyId(user.id);
    })();
    supabase.from("hackathons").select("*").eq("id", hackathonId).single()
      .then(({ data }) => setHackathon(data));

    // Get first problem for "Back to Arena" button
    supabase.from("problems").select("id").eq("hackathon_id", hackathonId)
      .order("order_index").limit(1)
      .then(({ data }) => { if (data?.[0]) setFirstProblemId(data[0].id); });

    fetchLeaderboard();

    // Realtime subscription
    const channel = supabase
      .channel(`leaderboard:${hackathonId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "leaderboard",
        filter: `hackathon_id=eq.${hackathonId}`,
      }, () => fetchLeaderboard())
      .subscribe();

    // Fallback poll every 30s
    const iv = setInterval(() => fetchLeaderboard(), 30000);

    return () => { supabase.removeChannel(channel); clearInterval(iv); };
  }, [hackathonId]);

  const filtered = uniFilter
    ? entries.filter(e => (e as any).profiles?.university?.toLowerCase().includes(uniFilter.toLowerCase()))
    : entries;

  const unis = Array.from(new Set(entries.map(e => (e as any).profiles?.university).filter(Boolean)));

  const rankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

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
              {hackathon?.status === "active" && firstProblemId && (
                <button onClick={() => router.push(`/arena/${hackathonId}/${firstProblemId}`)}
                  className="flex items-center gap-1.5 text-accent hover:text-accent/80 transition-colors text-sm font-medium">
                  <Code2 size={15} /> Back to Arena
                </button>
              )}
            </div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <Trophy size={28} className="text-accent3" />
              Leaderboard
              {hackathon?.leaderboard_frozen && (
                <span className="flex items-center gap-1 text-accent text-sm font-normal glass px-3 py-1 rounded-full">
                  <Snowflake size={14} /> Frozen
                </span>
              )}
            </h1>
            {hackathon && <p className="text-muted mt-1">{hackathon.title}</p>}
          </div>

          <div className="flex items-center gap-3">
            {unis.length > 0 && (
              <div className="relative">
                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <select value={uniFilter} onChange={e => setUniFilter(e.target.value)}
                  className="input-glass !py-2 pl-8 text-sm">
                  <option value="">All Universities</option>
                  {unis.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            )}
            <button
              onClick={() => fetchLeaderboard(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 glass rounded-lg hover:text-accent transition-colors text-sm disabled:opacity-50"
              title="Refresh leaderboard"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <p className="text-muted text-xs mb-6">
          Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })} · {entries.length} participant{entries.length !== 1 ? "s" : ""}
        </p>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-6 text-sm flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => fetchLeaderboard(true)} className="text-xs underline">Retry</button>
          </div>
        )}

        {/* Table */}
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
                            <div className={`font-medium ${isMe ? "text-accent" : ""}`}>
                              {(entry as any).profiles?.full_name || "Unknown"}
                              {isMe && <span className="text-xs text-accent ml-2">(you)</span>}
                            </div>
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
      </div>
    </div>
  );
}