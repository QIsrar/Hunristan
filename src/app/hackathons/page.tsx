"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { Users, Clock, Trophy, Tag, Search, Filter, X } from "lucide-react";
import type { Hackathon } from "@/types";
import { formatDistanceToNow, format } from "date-fns";
import { createClient } from "@/lib/supabase/client";

/* ─── Helpers ─── */

/** Generate a deterministic gradient + initials for a hackathon title */
function HackathonAvatar({ title, className = "" }: { title: string; className?: string }) {
  // Take initials: first letter of each word (max 3)
  const words = title.trim().split(/\s+/);
  const initials = words
    .slice(0, 3)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  // Pick a gradient based on the first char code so it's stable
  const gradients = [
    "from-cyan-500/80 to-violet-600/80",
    "from-violet-500/80 to-pink-600/80",
    "from-emerald-500/80 to-cyan-600/80",
    "from-amber-500/80 to-rose-600/80",
    "from-pink-500/80 to-purple-600/80",
    "from-blue-500/80 to-indigo-600/80",
    "from-teal-500/80 to-green-600/80",
    "from-orange-500/80 to-amber-600/80",
  ];
  const idx = (title.charCodeAt(0) || 0) % gradients.length;
  const gradient = gradients[idx];

  return (
    <div
      className={`h-36 flex items-center justify-center bg-gradient-to-br ${gradient} relative overflow-hidden ${className}`}
    >
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
      <span className="relative z-10 font-display font-extrabold text-white text-4xl tracking-widest drop-shadow-lg select-none">
        {initials}
      </span>
    </div>
  );
}

const STATUS_OPTIONS = ["all", "active", "upcoming", "ended"] as const;
const FEE_OPTIONS = ["all", "free", "paid"] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number];
type FeeFilter = (typeof FEE_OPTIONS)[number];

export default function HackathonsPage() {
  const supabase = createClient();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [feeFilter, setFeeFilter] = useState<FeeFilter>("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("hackathons")
        .select("*")
        .eq("is_approved", true)
        .order("start_time", { ascending: false });

      if (!error && data && data.length > 0) {
        const now = Date.now();
        const mapped = data.map((h: any) => {
          let s = h.status;
          const start = new Date(h.start_time).getTime();
          const end = new Date(h.end_time).getTime();
          if (s === "upcoming" && now >= start && now < end) s = "active";
          if (s !== "ended" && now >= end) s = "ended";
          return { ...h, status: s };
        });
        setHackathons(mapped as Hackathon[]);
      } else {
        // Fallback sample data when DB is empty / unreachable
        setHackathons([
          {
            id: "1",
            title: "AI Innovation Challenge 2026",
            description: "Build AI solutions to solve real-world problems.",
            status: "active",
            start_time: new Date(Date.now() - 86400000).toISOString(),
            end_time: new Date(Date.now() + 432000000).toISOString(),
            tags: ["AI/ML", "Python"],
            participant_count: 245,
            registration_fee: 500,
            is_approved: true,
          } as any,
          {
            id: "2",
            title: "Web Development Marathon",
            description: "48-hour sprint to build amazing web applications.",
            status: "active",
            start_time: new Date(Date.now() - 172800000).toISOString(),
            end_time: new Date(Date.now() + 259200000).toISOString(),
            tags: ["Web Dev", "React"],
            participant_count: 512,
            registration_fee: 0,
            is_approved: true,
          } as any,
          {
            id: "3",
            title: "Mobile App Dev Sprint",
            description: "Create beautiful and performant mobile apps.",
            status: "upcoming",
            start_time: new Date(Date.now() + 604800000).toISOString(),
            end_time: new Date(Date.now() + 1209600000).toISOString(),
            tags: ["Mobile", "Flutter"],
            participant_count: 0,
            registration_fee: 400,
            is_approved: true,
          } as any,
          {
            id: "4",
            title: "Data Science Olympiad",
            description: "Compete in ML modeling and predictive analytics.",
            status: "active",
            start_time: new Date(Date.now() - 345600000).toISOString(),
            end_time: new Date(Date.now() + 86400000).toISOString(),
            tags: ["Data Science", "Python"],
            participant_count: 156,
            registration_fee: 600,
            is_approved: true,
          } as any,
          {
            id: "5",
            title: "Open Source Contribution Fest",
            description: "Contribute to open source projects.",
            status: "upcoming",
            start_time: new Date(Date.now() + 2419200000).toISOString(),
            end_time: new Date(Date.now() + 3024000000).toISOString(),
            tags: ["Open Source"],
            participant_count: 0,
            registration_fee: 0,
            is_approved: true,
          } as any,
          {
            id: "6",
            title: "Backend Systems Design",
            description: "Design scalable backend systems.",
            status: "ended",
            start_time: new Date(Date.now() - 2592000000).toISOString(),
            end_time: new Date(Date.now() - 2073600000).toISOString(),
            tags: ["Backend", "DevOps"],
            participant_count: 89,
            registration_fee: 350,
            is_approved: true,
          } as any,
        ]);
      }
      setLoading(false);
    }
    load();
  }, []);

  /* ─── Filtering ─── */
  const filtered = hackathons.filter((h) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      h.title.toLowerCase().includes(q) ||
      (h.tags || []).some((t) => t.toLowerCase().includes(q)) ||
      (h.description || "").toLowerCase().includes(q);

    const matchesStatus = statusFilter === "all" || h.status === statusFilter;

    const matchesFee =
      feeFilter === "all" ||
      (feeFilter === "free" && (h.registration_fee || 0) === 0) ||
      (feeFilter === "paid" && (h.registration_fee || 0) > 0);

    return matchesSearch && matchesStatus && matchesFee;
  });

  const hasFilters = search || statusFilter !== "all" || feeFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setFeeFilter("all");
  };

  const statusBadge = (s: string) => {
    if (s === "active")
      return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
    if (s === "upcoming")
      return "bg-blue-500/15 text-blue-400 border border-blue-500/30";
    return "bg-gray-500/15 text-gray-400 border border-gray-500/30";
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
          <p className="text-muted text-lg">
            Compete, learn, and showcase your skills
          </p>
        </div>

        {/* ─── Filters ─── */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              id="hackathon-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-glass pl-10"
              placeholder="Search by name, tag or description…"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted shrink-0" />
            <div className="flex gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  id={`filter-status-${s}`}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all capitalize ${
                    statusFilter === s
                      ? "border-accent/60 bg-accent/10 text-accent"
                      : "border-border text-muted hover:border-accent/30 hover:text-text"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Fee filter */}
          <div className="flex gap-1.5">
            {FEE_OPTIONS.map((f) => (
              <button
                key={f}
                id={`filter-fee-${f}`}
                onClick={() => setFeeFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all capitalize ${
                  feeFilter === f
                    ? "border-accent2/60 bg-accent2/10 text-accent2"
                    : "border-border text-muted hover:border-accent2/30 hover:text-text"
                }`}
              >
                {f === "all" ? "Any Fee" : f === "free" ? "Free" : "Paid"}
              </button>
            ))}
          </div>
        </div>

        {/* Result count + clear */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted text-sm">
            {loading ? (
              "Loading…"
            ) : (
              <>
                <span className="text-text font-semibold">{filtered.length}</span>{" "}
                hackathon{filtered.length !== 1 ? "s" : ""} found
              </>
            )}
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors"
            >
              <X size={12} /> Clear filters
            </button>
          )}
        </div>

        {/* ─── Cards ─── */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="glass rounded-2xl overflow-hidden animate-pulse"
              >
                <div className="h-36 bg-surface" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-surface rounded w-3/4" />
                  <div className="h-3 bg-surface rounded w-full" />
                  <div className="h-3 bg-surface rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <Trophy size={40} className="mx-auto text-muted mb-4 opacity-40" />
            <p className="text-muted">No hackathons match your filters.</p>
            <button
              onClick={clearFilters}
              className="mt-4 text-accent text-sm hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((h) => (
              <Link
                key={h.id}
                href={`/hackathons/${h.id}`}
                id={`hackathon-card-${h.id}`}
                className="glass glass-hover rounded-2xl overflow-hidden group flex flex-col"
              >
                {/* ─── Avatar (initials) instead of banner image ─── */}
                <HackathonAvatar title={h.title} />

                <div className="p-5 flex-1 flex flex-col">
                  {/* Status + fee badge row */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${statusBadge(
                        h.status
                      )}`}
                    >
                      {h.status}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                        (h.registration_fee || 0) === 0
                          ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                          : "border-amber-500/30 text-amber-400 bg-amber-500/10"
                      }`}
                    >
                      {(h.registration_fee || 0) === 0
                        ? "Free"
                        : `PKR ${h.registration_fee}`}
                    </span>
                    {(h.tags || []).slice(0, 1).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-2 py-0.5 rounded-full glass text-muted flex items-center gap-1"
                      >
                        <Tag size={8} />
                        {t}
                      </span>
                    ))}
                  </div>

                  <h3 className="font-display font-semibold text-base mb-1 group-hover:text-accent transition-colors">
                    {h.title}
                  </h3>
                  <p className="text-muted text-xs mb-3 line-clamp-2">
                    {h.description}
                  </p>

                  <div className="mt-auto flex items-center justify-between text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Users size={10} /> {h.participant_count} participants
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {h.status === "active"
                        ? `Ends ${formatDistanceToNow(new Date(h.end_time), {
                            addSuffix: true,
                          })}`
                        : h.status === "upcoming"
                        ? `Starts ${formatDistanceToNow(new Date(h.start_time), {
                            addSuffix: true,
                          })}`
                        : format(new Date(h.end_time), "MMM d, yyyy")}
                    </span>
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
