"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/Navbar";
import {
  Search, ExternalLink, Github, Trophy, Star, X, Filter,
  Code2, Layers
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────── */
interface Project {
  id: string;
  team_name: string;
  project_title: string;
  description: string | null;
  demo_url: string | null;
  github_url: string | null;
  technologies: string[];
  rank_achieved: number | null;
  is_featured: boolean;
  hackathon_id: string | null;
  hackathons?: { title: string } | null;
}

/* ─── Derived visuals (no DB column needed) ──────────────────── */
const PALETTE = [
  { gradient: "from-cyan-500 to-violet-600",    text: "text-cyan-400"   },
  { gradient: "from-violet-500 to-pink-600",     text: "text-violet-400" },
  { gradient: "from-emerald-500 to-cyan-600",    text: "text-emerald-400"},
  { gradient: "from-amber-500 to-rose-600",      text: "text-amber-400"  },
  { gradient: "from-pink-500 to-purple-600",     text: "text-pink-400"   },
  { gradient: "from-blue-500 to-indigo-600",     text: "text-blue-400"   },
  { gradient: "from-teal-500 to-green-600",      text: "text-teal-400"   },
  { gradient: "from-orange-500 to-amber-600",    text: "text-orange-400" },
];

function paletteFor(title: string) {
  return PALETTE[(title.charCodeAt(0) || 0) % PALETTE.length];
}

/** Derive a display category from the technologies array */
function deriveCategory(techs: string[]): string {
  const t = techs.map((x) => x.toLowerCase()).join(" ");
  if (t.includes("tensorflow") || t.includes("pytorch") || t.includes("ml") || t.includes("ai"))
    return "AI / ML";
  if (t.includes("react native") || t.includes("flutter") || t.includes("ios") || t.includes("android"))
    return "Mobile";
  if (t.includes("react") || t.includes("next") || t.includes("vue") || t.includes("angular"))
    return "Web Dev";
  if (t.includes("node") || t.includes("django") || t.includes("fastapi") || t.includes("express"))
    return "Backend";
  if (t.includes("solidity") || t.includes("web3") || t.includes("blockchain"))
    return "Blockchain";
  if (t.includes("kubernetes") || t.includes("docker") || t.includes("terraform") || t.includes("devops"))
    return "DevOps";
  if (t.includes("iot") || t.includes("mqtt") || t.includes("arduino"))
    return "IoT";
  if (t.includes("python") || t.includes("r ") || t.includes("pandas"))
    return "Data Science";
  return "Software";
}

/** Initials avatar for a project (max 2 words) */
function ProjectAvatar({ title, gradient }: { title: string; gradient: string }) {
  const initials = title
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className={`h-44 relative overflow-hidden bg-gradient-to-br ${gradient} flex items-center justify-center`}
    >
      {/* Grid watermark */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.35) 1px,transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />
      {/* Giant faded initials */}
      <span className="absolute font-display font-extrabold text-white/15 text-[8rem] leading-none select-none tracking-widest">
        {initials}
      </span>
      {/* Foreground initials */}
      <span className="relative z-10 font-display font-extrabold text-white text-5xl tracking-widest drop-shadow-xl select-none">
        {initials}
      </span>
    </div>
  );
}

/* ─── Sample fallback ────────────────────────────────────────── */
const SAMPLE: Project[] = [
  {
    id: "1", team_name: "AlphaCoders", project_title: "MedAI – Smart Diagnosis",
    description: "AI-powered web app that helps rural doctors diagnose diseases using symptoms and patient history. Won 1st place at HealthTech Hackathon 2024.",
    demo_url: "https://example.com", github_url: "https://github.com",
    technologies: ["Python", "FastAPI", "React", "TensorFlow"],
    rank_achieved: 1, is_featured: true, hackathon_id: null,
    hackathons: { title: "HealthTech Hackathon 2024" },
  },
  {
    id: "2", team_name: "ByteBuilders", project_title: "EduSync – Collaborative Learning",
    description: "Real-time collaborative coding for students and teachers with AI pair programming and automatic grading.",
    demo_url: "https://example.com", github_url: "https://github.com",
    technologies: ["Next.js", "WebSockets", "MongoDB", "OpenAI"],
    rank_achieved: 1, is_featured: true, hackathon_id: null,
    hackathons: { title: "EdTech Challenge 2024" },
  },
  {
    id: "3", team_name: "DevSquad", project_title: "GreenRoute – Carbon Navigation",
    description: "Navigation app that calculates the most eco-friendly routes, tracking real-time CO₂ savings with Pakistan's public transport data.",
    demo_url: null, github_url: "https://github.com",
    technologies: ["React Native", "Node.js", "Google Maps API"],
    rank_achieved: 2, is_featured: false, hackathon_id: null,
    hackathons: { title: "ClimateHack 2023" },
  },
  {
    id: "4", team_name: "CodeCraft", project_title: "FarmBot – Agricultural IoT",
    description: "IoT platform for small farmers to monitor soil, weather, and automate irrigation using cheap sensors and SMS alerts.",
    demo_url: "https://example.com", github_url: "https://github.com",
    technologies: ["Vue.js", "Node.js", "MQTT", "PostgreSQL"],
    rank_achieved: 3, is_featured: false, hackathon_id: null,
    hackathons: { title: "AgriTech Pakistan 2023" },
  },
  {
    id: "5", team_name: "NeuralNinjas", project_title: "SafeCity – Crime Prediction",
    description: "ML model trained on historical crime data to predict hotspots and help law enforcement. 87% accuracy.",
    demo_url: null, github_url: "https://github.com",
    technologies: ["Python", "scikit-learn", "Django", "D3.js"],
    rank_achieved: 1, is_featured: true, hackathon_id: null,
    hackathons: { title: "CivicTech Hackathon 2023" },
  },
  {
    id: "6", team_name: "WebWarriors", project_title: "LangBridge – Urdu Translator",
    description: "Browser extension that translates web pages to Urdu in real-time using a fine-tuned NLP model optimized for Pakistani dialects.",
    demo_url: "https://example.com", github_url: "https://github.com",
    technologies: ["JavaScript", "Python", "HuggingFace", "FastAPI"],
    rank_achieved: 2, is_featured: false, hackathon_id: null,
    hackathons: { title: "NLP Challenge 2024" },
  },
];

/* ─── Rank badge helper ──────────────────────────────────────── */
function rankBadge(rank?: number | null) {
  if (rank === 1) return { label: "🥇 1st Place", cls: "bg-amber-500/20 text-amber-400 border border-amber-500/40" };
  if (rank === 2) return { label: "🥈 2nd Place", cls: "bg-slate-400/15 text-slate-300 border border-slate-400/30" };
  if (rank === 3) return { label: "🥉 3rd Place", cls: "bg-orange-500/20 text-orange-400 border border-orange-500/40" };
  return null;
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function ProjectsPage() {
  const supabase = createClient();
  const [projects, setProjects]       = useState<Project[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [selectedTechs, setTechs]     = useState<string[]>([]);
  const [featuredOnly, setFeatured]   = useState(false);

  /* ─── Fetch ─── */
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("projects")
        .select("*, hackathons(title)")
        .order("rank_achieved", { ascending: true, nullsFirst: false });

      if (!error && data && data.length > 0) {
        setProjects(data as Project[]);
      } else {
        setProjects(SAMPLE);
      }
      setLoading(false);
    }
    load();
  }, []);

  /* ─── Derived tech list from actual data ─── */
  const allTechs = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => (p.technologies || []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [projects]);

  /* ─── Filter ─── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return projects.filter((p) => {
      const matchSearch =
        !q ||
        p.project_title.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        p.team_name.toLowerCase().includes(q) ||
        (p.technologies || []).some((t) => t.toLowerCase().includes(q));
      const matchTech =
        selectedTechs.length === 0 ||
        selectedTechs.every((t) => (p.technologies || []).includes(t));
      const matchFeatured = !featuredOnly || p.is_featured;
      return matchSearch && matchTech && matchFeatured;
    });
  }, [projects, search, selectedTechs, featuredOnly]);

  const hasFilters = search || selectedTechs.length > 0 || featuredOnly;
  const clearFilters = () => { setSearch(""); setTechs([]); setFeatured(false); };

  const toggleTech = (t: string) =>
    setTechs((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  /* ─── Stats ─── */
  const featuredCount = projects.filter((p) => p.is_featured).length;
  const firstPlaceCount = projects.filter((p) => p.rank_achieved === 1).length;

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />

      <div className="pt-24 pb-20 px-6 max-w-7xl mx-auto">

        {/* ── Hero header ── */}
        <div className="relative mb-12 text-center">
          {/* Ambient glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />
            <div className="absolute top-0 right-1/4 w-64 h-64 bg-accent2/5 rounded-full blur-3xl" />
          </div>
          <div className="relative">
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-6 text-sm text-muted">
              <Trophy size={14} className="text-accent3" />
              Hall of Innovation
            </div>
            <h1 className="font-display text-5xl md:text-6xl font-bold mb-4 leading-tight">
              Winning <span className="gradient-text">Projects</span>
            </h1>
            <p className="text-muted text-lg max-w-2xl mx-auto leading-relaxed">
              Real problems. Real solutions. Showcasing the best work built during
              Smart Hunristan competitions.
            </p>

            {/* Stats row */}
            {!loading && (
              <div className="flex items-center justify-center gap-6 mt-8">
                <div className="glass rounded-xl px-5 py-3 text-center">
                  <div className="font-display text-2xl font-bold gradient-text">{projects.length}</div>
                  <div className="text-muted text-xs mt-0.5">Total Projects</div>
                </div>
                <div className="glass rounded-xl px-5 py-3 text-center">
                  <div className="font-display text-2xl font-bold text-accent3">{featuredCount}</div>
                  <div className="text-muted text-xs mt-0.5">Featured</div>
                </div>
                <div className="glass rounded-xl px-5 py-3 text-center">
                  <div className="font-display text-2xl font-bold text-amber-400">{firstPlaceCount}</div>
                  <div className="text-muted text-xs mt-0.5">1st Place Wins</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="glass rounded-2xl p-5 mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                id="project-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-glass pl-10 py-3"
                placeholder="Search projects, teams, technologies…"
              />
            </div>

            {/* Featured toggle */}
            <button
              id="filter-featured"
              onClick={() => setFeatured(!featuredOnly)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border transition-all whitespace-nowrap ${
                featuredOnly
                  ? "border-accent3/60 bg-accent3/10 text-accent3"
                  : "border-border text-muted hover:border-accent3/30 hover:text-text"
              }`}
            >
              <Star size={14} className={featuredOnly ? "fill-accent3" : ""} />
              Featured Only
            </button>

            {/* Clear */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm text-muted hover:text-accent border border-border hover:border-accent/30 transition-all"
              >
                <X size={14} /> Clear
              </button>
            )}
          </div>

          {/* Tech chips */}
          {allTechs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1 text-xs text-muted mr-1 self-center">
                <Filter size={11} /> Tech:
              </span>
              {allTechs.map((t) => (
                <button
                  key={t}
                  id={`tech-filter-${t.replace(/\s+/g, "-").toLowerCase()}`}
                  onClick={() => toggleTech(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all border ${
                    selectedTechs.includes(t)
                      ? "border-accent/60 bg-accent/10 text-accent"
                      : "border-border text-muted hover:border-accent/30 hover:text-text"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Result count */}
        <p className="text-muted text-sm mb-6">
          <span className="text-text font-semibold">{loading ? "—" : filtered.length}</span>{" "}
          project{filtered.length !== 1 ? "s" : ""} found
        </p>

        {/* ── Cards grid ── */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl overflow-hidden animate-pulse">
                <div className="h-44 bg-surface" />
                <div className="p-5 space-y-3">
                  <div className="h-3 bg-surface rounded w-1/3" />
                  <div className="h-4 bg-surface rounded w-4/5" />
                  <div className="h-3 bg-surface rounded w-full" />
                  <div className="h-3 bg-surface rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <Layers size={44} className="mx-auto text-muted/30 mb-4" />
            <p className="text-lg font-medium text-text mb-2">No projects match your filters</p>
            <p className="text-muted text-sm mb-6">Try broadening your search or clearing filters</p>
            <button onClick={clearFilters} className="btn-secondary px-6 py-2 text-sm">
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((project) => {
              const { gradient, text } = paletteFor(project.project_title);
              const rank = rankBadge(project.rank_achieved);
              const category = deriveCategory(project.technologies || []);

              return (
                <div
                  key={project.id}
                  id={`project-card-${project.id}`}
                  className={`group glass glass-hover rounded-2xl overflow-hidden flex flex-col relative transition-all duration-300 ${
                    project.is_featured ? "ring-1 ring-accent3/40 shadow-lg shadow-accent3/10" : ""
                  }`}
                >
                  {/* Featured ribbon */}
                  {project.is_featured && (
                    <div className="absolute top-0 right-0 z-20">
                      <div className="bg-gradient-to-l from-accent3 to-amber-500 text-bg text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1">
                        <Star size={9} className="fill-bg" /> Featured
                      </div>
                    </div>
                  )}

                  {/* Avatar */}
                  <ProjectAvatar title={project.project_title} gradient={gradient} />

                  {/* Content */}
                  <div className="p-5 flex-1 flex flex-col">
                    {/* Category + rank */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md bg-white/5 border border-white/10 ${text}`}>
                        {category}
                      </span>
                      {rank && (
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${rank.cls}`}>
                          {rank.label}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-display font-bold text-base leading-snug mb-2 group-hover:text-accent transition-colors">
                      {project.project_title}
                    </h3>

                    {/* Team */}
                    <p className="text-xs text-muted mb-2 font-medium">by {project.team_name}</p>

                    {/* Description */}
                    <p className="text-muted text-xs leading-relaxed mb-4 flex-1 line-clamp-3">
                      {project.description}
                    </p>

                    {/* Tech stack */}
                    <div className="flex flex-wrap gap-1.5 mb-4 pb-4 border-b border-border/40">
                      {(project.technologies || []).slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className={`text-xs px-2 py-0.5 rounded-md font-mono border border-border/60 transition-colors ${
                            selectedTechs.includes(t)
                              ? "bg-accent/10 border-accent/30 text-accent"
                              : "bg-surface/60 text-muted"
                          }`}
                        >
                          {t}
                        </span>
                      ))}
                      {(project.technologies || []).length > 4 && (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-surface/60 border border-border/60 text-muted font-mono">
                          +{(project.technologies || []).length - 4}
                        </span>
                      )}
                    </div>

                    {/* Hackathon */}
                    {project.hackathons?.title && (
                      <div className="flex items-center gap-1.5 text-xs text-muted mb-4">
                        <Trophy size={10} className="text-accent3 shrink-0" />
                        <span className="truncate">{project.hackathons.title}</span>
                      </div>
                    )}

                    {/* Links */}
                    <div className="flex items-center gap-4 mt-auto pt-3 border-t border-border/40">
                      {project.demo_url && (
                        <a
                          href={project.demo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent/70 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={14} /> Demo
                        </a>
                      )}
                      {project.github_url && (
                        <a
                          href={project.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Github size={14} /> Code
                        </a>
                      )}
                      {!project.demo_url && !project.github_url && (
                        <span className="text-xs text-muted/50 italic">No links yet</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
