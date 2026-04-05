"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { Search, Filter, Users, Clock, Trophy, Tag, ArrowRight } from "lucide-react";
import type { Hackathon } from "@/types";
import { formatDistanceToNow, format } from "date-fns";

const FILTERS = ["all", "active", "upcoming", "ended"] as const;
type Filter = typeof FILTERS[number];

export default function HackathonsPage() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [filtered, setFiltered] = useState<Hackathon[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("hackathons")
      .select("*,profiles(full_name,organization)")
      .neq("status","draft").eq("is_approved", true)
      .order("start_time", { ascending: false })
      .then(({ data }) => {
        setHackathons(data || []);
        setFiltered(data || []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let result = hackathons;
    if (filter !== "all") result = result.filter(h => h.status === filter);
    if (search) result = result.filter(h =>
      h.title.toLowerCase().includes(search.toLowerCase()) ||
      h.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    );
    setFiltered(result);
  }, [search, filter, hackathons]);

  const statusColor = (s: string) => {
    if (s === "active") return "badge-active";
    if (s === "upcoming") return "badge-upcoming";
    return "badge-ended";
  };

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">
            Hackathons <span className="gradient-text">Arena</span>
          </h1>
          <p className="text-muted text-lg">Compete, learn, and showcase your skills</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              className="input-glass pl-10" placeholder="       Search hackathons by name or tag..."
            />
          </div>
          <div className="flex gap-2">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${filter === f ? "bg-accent text-bg" : "glass text-muted hover:text-text"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <p className="text-muted text-sm mb-6">{filtered.length} hackathon{filtered.length !== 1 ? "s" : ""} found</p>

        {/* Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Trophy size={48} className="text-muted mx-auto mb-4" />
            <p className="text-muted text-lg">No hackathons match your search</p>
            <button onClick={() => { setSearch(""); setFilter("all"); }} className="btn-secondary mt-4 text-sm !py-2 !px-4">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(h => (
              <Link key={h.id} href={`/hackathons/${h.id}`}
                className="glass glass-hover rounded-2xl overflow-hidden group flex flex-col">
                {/* Banner */}
                <div className="h-36 bg-gradient-to-br from-accent/10 via-surface to-accent2/10 relative overflow-hidden">
                  {h.banner_url ? (
                    <img src={h.banner_url} alt={h.title} className="w-full h-full object-cover opacity-60" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Trophy size={48} className="text-accent/20" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(h.status)}`}>{h.status}</span>
                  </div>
                  {h.registration_fee > 0 && (
                    <div className="absolute bottom-3 left-3 text-xs bg-accent3/20 text-accent3 border border-accent3/30 px-2 py-0.5 rounded-full">
                      PKR {h.registration_fee}
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-display font-semibold text-base mb-1 group-hover:text-accent transition-colors line-clamp-2">{h.title}</h3>
                  <p className="text-muted text-xs mb-3 line-clamp-2">{h.description}</p>

                  {/* Tags */}
                  {h.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {h.tags.slice(0,3).map(tag => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-surface border border-border text-muted flex items-center gap-1">
                          <Tag size={8} /> {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span className="flex items-center gap-1"><Users size={10} /> {h.participant_count} participants</span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {h.status === "active"
                          ? `Ends ${formatDistanceToNow(new Date(h.end_time), { addSuffix: true })}`
                          : h.status === "upcoming"
                          ? `Starts ${formatDistanceToNow(new Date(h.start_time), { addSuffix: true })}`
                          : format(new Date(h.end_time), "MMM d, yyyy")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted">by {(h as any).profiles?.organization || (h as any).profiles?.full_name}</span>
                      <ArrowRight size={14} className="text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
