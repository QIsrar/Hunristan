"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/Navbar";
import { Search, ExternalLink, Github, Trophy, Tag, Filter, Star, Zap, Leaf, Brain, Users, MapPin } from "lucide-react";

const SAMPLE_PROJECTS = [
  { id:"1", team_name:"AlphaCoders", project_title:"MedAI - Smart Diagnosis Assistant", description:"An AI-powered web app that helps rural doctors diagnose common diseases using symptoms and patient history. Won 1st place at HealthTech Hackathon 2024.", demo_url:"https://example.com", github_url:"https://github.com", technologies:["Python","FastAPI","React","TensorFlow"], rank_achieved:1, is_featured:true, hackathons:{title:"HealthTech Hackathon 2024"}, category:"AI", icon:"🏥" },
  { id:"2", team_name:"ByteBuilders", project_title:"EduSync - Collaborative Learning Platform", description:"Real-time collaborative coding environment for students and teachers. Features AI pair programming, automatic grading, and progress tracking.", demo_url:"https://example.com", github_url:"https://github.com", technologies:["Next.js","WebSockets","MongoDB","OpenAI"], rank_achieved:1, is_featured:true, hackathons:{title:"EdTech Challenge 2024"}, category:"Education", icon:"📚" },
  { id:"3", team_name:"DevSquad", project_title:"GreenRoute - Carbon-Optimized Navigation", description:"Navigation app that calculates the most eco-friendly routes, tracking real-time CO2 savings. Integrated with Pakistan's public transport data.", demo_url:null, github_url:"https://github.com", technologies:["React Native","Node.js","Google Maps API"], rank_achieved:2, is_featured:false, hackathons:{title:"ClimateHack 2023"}, category:"Environment", icon:"🌱" },
  { id:"4", team_name:"CodeCraft", project_title:"FarmBot - Agricultural IoT Dashboard", description:"IoT platform for small farmers to monitor soil conditions, weather, and automate irrigation using cheap sensors and SMS alerts.", demo_url:"https://example.com", github_url:"https://github.com", technologies:["Vue.js","Node.js","MQTT","PostgreSQL"], rank_achieved:3, is_featured:false, hackathons:{title:"AgriTech Pakistan 2023"}, category:"Agriculture", icon:"🌾" },
  { id:"5", team_name:"NeuralNinjas", project_title:"SafeCity - Crime Prediction & Prevention", description:"ML model trained on historical crime data to predict hotspots and help law enforcement with resource allocation. 87% accuracy.", demo_url:null, github_url:"https://github.com", technologies:["Python","scikit-learn","Django","D3.js"], rank_achieved:1, is_featured:true, hackathons:{title:"CivicTech Hackathon 2023"}, category:"Safety", icon:"🛡️" },
  { id:"6", team_name:"WebWarriors", project_title:"LangBridge - Real-Time Urdu Translator", description:"Browser extension that translates web pages to Urdu in real-time using a fine-tuned NLP model optimized for Pakistani context and dialects.", demo_url:"https://example.com", github_url:"https://github.com", technologies:["JavaScript","Python","HuggingFace","FastAPI"], rank_achieved:2, is_featured:false, hackathons:{title:"NLP Challenge 2024"}, category:"Language", icon:"🗣️" },
];

const ALL_TECH = ["Python","JavaScript","React","Next.js","Node.js","TensorFlow","FastAPI","MongoDB","PostgreSQL","React Native","Vue.js"];

export default function ProjectsPage() {
  const [projects, setProjects] = useState(SAMPLE_PROJECTS);
  const [filtered, setFiltered] = useState(SAMPLE_PROJECTS);
  const [search, setSearch] = useState("");
  const [techFilter, setTechFilter] = useState<string[]>([]);
  const [showFeatured, setShowFeatured] = useState(false);

  useEffect(() => {
    let result = projects;
    if (search) result = result.filter(p => p.project_title.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()) || p.team_name.toLowerCase().includes(search.toLowerCase()));
    if (techFilter.length > 0) result = result.filter(p => techFilter.some(t => p.technologies.includes(t)));
    if (showFeatured) result = result.filter(p => p.is_featured);
    setFiltered(result);
  }, [search, techFilter, showFeatured, projects]);

  const rankBadge = (rank?: number) => {
    if (rank === 1) return { label: "🥇 1st Place", color: "from-yellow-400 to-amber-500" };
    if (rank === 2) return { label: "🥈 2nd Place", color: "from-gray-300 to-gray-400" };
    if (rank === 3) return { label: "🥉 3rd Place", color: "from-orange-300 to-red-400" };
    return null;
  };

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Hall of <span className="gradient-text">Innovation</span>
          </h1>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Winning projects from Smart Hunristan competitions. Real problems. Real solutions. Real talent from Pakistan and beyond.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 mb-10">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input value={search} onChange={e => setSearch(e.target.value)} className="input-glass pl-10" placeholder="Search projects, teams, technologies..." />
            </div>
            <button onClick={() => setShowFeatured(!showFeatured)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${showFeatured ? "bg-accent text-bg" : "glass text-muted hover:text-text"}`}>
              <Star size={14} /> Featured Only
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_TECH.map(t => (
              <button key={t} onClick={() => setTechFilter(f => f.includes(t) ? f.filter(x => x !== t) : [...f, t])}
                className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all ${techFilter.includes(t) ? "bg-accent text-bg" : "glass text-muted hover:text-text"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <p className="text-muted text-xs font-medium mb-8 uppercase tracking-wider">{filtered.length} Project{filtered.length !== 1 ? "s" : ""}</p>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((project) => {
            const rank = rankBadge(project.rank_achieved);
            return (
              <div key={project.id} className={`glass glass-hover rounded-2xl overflow-hidden flex flex-col group border ${project.is_featured ? "border-accent3/30 shadow-lg shadow-accent3/10" : "border-border/30"}`}>
                {/* Banner with Icon */}
                <div className="h-40 bg-gradient-to-br from-surface to-card relative flex items-center justify-center overflow-hidden">
                  {/* Background decoration */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-2 right-2 text-6xl group-hover:scale-110 transition-transform duration-300">{project.icon}</div>
                  </div>
                  
                  {/* Large icon in center */}
                  <div className="text-7xl group-hover:scale-105 transition-transform duration-300">{project.icon}</div>
                  
                  {/* Badges - Top right */}
                  <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                    {project.is_featured && (
                      <div className="flex items-center gap-1 bg-accent/90 text-bg px-2.5 py-1 rounded-full text-xs font-semibold">
                        <Star size={12} fill="currentColor" /> Featured
                      </div>
                    )}
                    {rank && (
                      <div className={`bg-gradient-to-r ${rank.color} text-white px-2.5 py-1 rounded-full text-xs font-semibold`}>
                        {rank.label}
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="mb-3">
                    <div className="text-xs text-accent font-semibold uppercase tracking-widest mb-1">{project.category}</div>
                    <h3 className="font-display font-bold text-sm leading-snug text-text">{project.project_title}</h3>
                  </div>
                  
                  <p className="text-muted text-xs leading-relaxed mb-4 flex-1 line-clamp-3">{project.description}</p>

                  {/* Technologies */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {project.technologies.slice(0, 3).map(t => (
                      <span key={t} className="text-xs px-2 py-1 rounded-md bg-surface border border-border text-muted font-mono hover:border-accent/50 transition-colors">{t}</span>
                    ))}
                    {project.technologies.length > 3 && (
                      <span className="text-xs px-2 py-1 rounded-md bg-surface border border-border text-muted font-mono">+{project.technologies.length - 3}</span>
                    )}
                  </div>

                  {/* Hackathon */}
                  <div className="text-xs text-muted mb-4 pb-4 border-t border-border/50">
                    <span className="block mt-3">📊 {project.hackathons?.title}</span>
                  </div>

                  {/* Links */}
                  <div className="flex items-center gap-3 mt-auto pt-2 border-t border-border/30">
                    {project.demo_url && (
                      <a href={project.demo_url} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-xs text-accent hover:text-accent2 font-semibold transition-colors">
                        <ExternalLink size={13} /> Demo
                      </a>
                    )}
                    {project.github_url && (
                      <a href={project.github_url} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-xs text-muted hover:text-text font-semibold transition-colors">
                        <Github size={13} /> Code
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <Trophy size={48} className="text-muted/20 mx-auto mb-4" />
            <p className="text-muted text-lg">No projects match your filters</p>
            <p className="text-muted text-sm mt-2">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {project.technologies.slice(0, 4).map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-surface border border-border text-muted font-mono">{t}</span>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-auto">
                  {project.demo_url && (
                    <a href={project.demo_url} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-xs text-accent hover:underline">
                      <ExternalLink size={12} /> Live Demo
                    </a>
                  )}
                  {project.github_url && (
                    <a href={project.github_url} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors">
                      <Github size={12} /> Source
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <Trophy size={48} className="text-muted/20 mx-auto mb-3" />
            <p className="text-muted">No projects match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
