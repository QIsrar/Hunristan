"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import {
  Search, Users, Code2, Trophy, Zap, MapPin, TrendingUp, Loader2,
  SlidersHorizontal, X, ChevronDown,
} from "lucide-react";

const EXP_LEVELS = ["beginner", "intermediate", "advanced"];

interface Participant {
  id: string;
  full_name: string;
  university: string | null;
  degree_program: string | null;
  experience_level: string | null;
  bio: string | null;
  total_points: number;
  problems_solved: number;
  hackathons_participated: number;
  best_rank: number | null;
  elo_rating: number;
  github_url: string | null;
  linkedin_url: string | null;
  created_at: string;
}

function AvatarMini({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const dims = { sm: "w-9 h-9 text-sm", md: "w-12 h-12 text-base", lg: "w-16 h-16 text-xl" };
  return (
    <div className={`${dims[size]} rounded-2xl bg-gradient-to-br from-accent via-accent2 to-accent3 flex items-center justify-center font-bold text-bg font-display shrink-0 shadow-md shadow-accent/15 select-none`}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

const EXP_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  beginner:     { label: "Beginner",     color: "text-green-400",  bg: "bg-green-400/10 border-green-400/20" },
  intermediate: { label: "Intermediate", color: "text-amber-400",  bg: "bg-amber-400/10 border-amber-400/20" },
  advanced:     { label: "Advanced",     color: "text-accent",     bg: "bg-accent/10    border-accent/20" },
};

export default function ParticipantsPage() {
  const supabase = createClient();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filtered,     setFiltered]     = useState<Participant[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [filterExp,    setFilterExp]    = useState("");
  const [filterUni,    setFilterUni]    = useState("");
  const [showFilters,  setShowFilters]  = useState(false);
  const [sortBy,       setSortBy]       = useState<"points" | "solved" | "events" | "elo">("points");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("profiles")
        .select("id,full_name,university,degree_program,experience_level,bio,total_points,problems_solved,hackathons_participated,best_rank,elo_rating,github_url,linkedin_url,created_at")
        .eq("role", "participant")
        .eq("is_banned", false)
        .order("total_points", { ascending: false })
        .limit(200);
      setParticipants((data as Participant[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  // Unique universities for filter dropdown
  const universities = Array.from(
    new Set(participants.map(p => p.university).filter(Boolean))
  ).sort() as string[];

  // Apply filters + search + sort
  useEffect(() => {
    let list = [...participants];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.full_name.toLowerCase().includes(q) ||
        (p.university ?? "").toLowerCase().includes(q) ||
        (p.degree_program ?? "").toLowerCase().includes(q)
      );
    }
    if (filterExp) list = list.filter(p => p.experience_level === filterExp);
    if (filterUni) list = list.filter(p => p.university === filterUni);
    list.sort((a, b) => {
      if (sortBy === "points")  return (b.total_points ?? 0) - (a.total_points ?? 0);
      if (sortBy === "solved")  return (b.problems_solved ?? 0) - (a.problems_solved ?? 0);
      if (sortBy === "events")  return (b.hackathons_participated ?? 0) - (a.hackathons_participated ?? 0);
      return (b.elo_rating ?? 1200) - (a.elo_rating ?? 1200);
    });
    setFiltered(list);
  }, [participants, search, filterExp, filterUni, sortBy]);

  const hasFilters = filterExp || filterUni;
  const clearFilters = () => { setFilterExp(""); setFilterUni(""); };

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />
      <div className="pt-20 pb-16 px-4 md:px-6 max-w-7xl mx-auto">

        {/* ── Page header ── */}
        <div className="mt-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Users size={20} className="text-accent"/>
                </div>
                <h1 className="font-display text-3xl font-bold">Participants</h1>
              </div>
              <p className="text-muted text-sm">
                {loading ? "Loading..." : `${filtered.length} participant${filtered.length !== 1 ? "s" : ""} · Browse profiles, find teammates, connect with peers`}
              </p>
            </div>

            {/* Sort control */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Sort by</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="input-glass !py-1.5 !px-3 text-sm pr-7 appearance-none cursor-pointer">
                  <option value="points">Total Points</option>
                  <option value="solved">Problems Solved</option>
                  <option value="events">Events Joined</option>
                  <option value="elo">ELO Rating</option>
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none"/>
              </div>
            </div>
          </div>
        </div>

        {/* ── Search + filter bar ── */}
        <div className="mb-6 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none"/>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, university, or program…"
                className="input-glass w-full pl-10"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text">
                  <X size={14}/>
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-2 px-4 py-2.5 glass rounded-xl text-sm transition-colors ${showFilters || hasFilters ? "text-accent border-accent/30" : "text-muted hover:text-text"}`}>
              <SlidersHorizontal size={15}/>
              Filters {hasFilters && <span className="w-5 h-5 rounded-full bg-accent text-bg text-xs flex items-center justify-center font-bold">{[filterExp,filterUni].filter(Boolean).length}</span>}
            </button>
          </div>

          {showFilters && (
            <div className="glass rounded-xl p-4 flex flex-wrap gap-4 items-end animate-in fade-in slide-in-from-top-1 duration-150">
              <div>
                <label className="text-xs text-muted mb-1.5 block">Experience Level</label>
                <div className="flex items-center gap-2">
                  {EXP_LEVELS.map(lvl => (
                    <button key={lvl}
                      onClick={() => setFilterExp(f => f === lvl ? "" : lvl)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filterExp === lvl ? "bg-accent text-bg" : "glass text-muted hover:text-text"}`}>
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-w-48">
                <label className="text-xs text-muted mb-1.5 block">University</label>
                <div className="relative">
                  <select
                    value={filterUni}
                    onChange={e => setFilterUni(e.target.value)}
                    className="input-glass !py-1.5 !px-3 text-sm w-full appearance-none cursor-pointer pr-7">
                    <option value="">All Universities</option>
                    {universities.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none"/>
                </div>
              </div>
              {hasFilters && (
                <button onClick={clearFilters}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 glass rounded-lg border border-red-400/20">
                  <X size={12}/> Clear Filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Leaderboard top 3 ── */}
        {!search && !hasFilters && sortBy === "points" && !loading && filtered.slice(0, 3).length === 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { p: filtered[1], rank: 2, medal: "🥈", border: "border-slate-400/30", glow: "shadow-slate-400/10", badge: "bg-slate-400/10 text-slate-300" },
              { p: filtered[0], rank: 1, medal: "🥇", border: "border-amber-400/30", glow: "shadow-amber-400/20 shadow-lg", badge: "bg-amber-400/10 text-amber-300" },
              { p: filtered[2], rank: 3, medal: "🥉", border: "border-orange-400/30", glow: "shadow-orange-400/10", badge: "bg-orange-400/10 text-orange-300" },
            ].map(({ p, rank, medal, border, glow, badge }) => (
              <Link key={p.id} href={`/users/${p.id}`}
                className={`glass rounded-2xl p-5 flex flex-col items-center text-center hover:scale-105 transition-all cursor-pointer border ${border} ${glow} ${rank === 1 ? "md:-mt-4 md:pb-6" : ""}`}>
                <div className="text-2xl mb-2">{medal}</div>
                <AvatarMini name={p.full_name} size={rank === 1 ? "lg" : "md"}/>
                <div className="mt-3 font-semibold text-sm truncate w-full">{p.full_name}</div>
                <div className="text-xs text-muted truncate w-full mb-2">{p.university ?? "Independent"}</div>
                <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${badge}`}>
                  {(p.total_points ?? 0).toLocaleString()} pts
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ── Participant grid ── */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={32} className="text-accent animate-spin"/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <Users size={48} className="text-muted/20 mx-auto mb-4"/>
            <h3 className="font-display text-xl font-bold mb-2">No participants found</h3>
            <p className="text-muted text-sm">Try a different search or clear the filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((p, idx) => {
              const expMeta = p.experience_level ? EXP_BADGE[p.experience_level] : null;
              const globalRank = (!search && !hasFilters && sortBy === "points") ? idx + 1 : null;
              return (
                <Link key={p.id} href={`/users/${p.id}`}
                  className="glass rounded-2xl p-5 hover:border-accent/25 hover:shadow-lg hover:shadow-accent/5 hover:-translate-y-0.5 transition-all group cursor-pointer block">

                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <AvatarMini name={p.full_name}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-semibold text-sm group-hover:text-accent transition-colors truncate">
                          {p.full_name}
                        </p>
                        {globalRank && globalRank <= 10 && (
                          <span className="text-xs text-accent3 font-mono font-bold shrink-0">#{globalRank}</span>
                        )}
                      </div>
                      {p.university && (
                        <p className="text-xs text-muted flex items-center gap-1 truncate mt-0.5">
                          <MapPin size={10}/>{p.university}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Exp badge */}
                  {expMeta && (
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border mb-3 ${expMeta.bg} ${expMeta.color}`}>
                      <TrendingUp size={10}/>{expMeta.label}
                    </div>
                  )}

                  {/* Bio */}
                  {p.bio && (
                    <p className="text-xs text-muted line-clamp-2 mb-3 leading-relaxed">{p.bio}</p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-0.5 text-accent font-mono font-bold text-sm">
                        <Zap size={11}/> {(p.total_points ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted mt-0.5">pts</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-0.5 text-green-400 font-mono font-bold text-sm">
                        <Code2 size={11}/> {p.problems_solved ?? 0}
                      </div>
                      <div className="text-xs text-muted mt-0.5">solved</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-0.5 text-accent2 font-mono font-bold text-sm">
                        <Trophy size={11}/> {p.hackathons_participated ?? 0}
                      </div>
                      <div className="text-xs text-muted mt-0.5">events</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
