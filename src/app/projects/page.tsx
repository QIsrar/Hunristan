"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/Navbar";
import { Search, ExternalLink, Github, Trophy, Star } from "lucide-react";

const SAMPLE_PROJECTS = [
  { id:"1", team_name:"AlphaCoders", project_title:"MedAI - Smart Diagnosis Assistant", description:"An AI-powered web app that helps rural doctors diagnose common diseases using symptoms and patient history. Won 1st place at HealthTech Hackathon 2024.", demo_url:"https://example.com", github_url:"https://github.com", technologies:["Python","FastAPI","React","TensorFlow"], rank_achieved:1, is_featured:true, hackathons:{title:"HealthTech Hackathon 2024"}, category:"AI", emoji:"🤖", color:"from-blue-500 to-cyan-500" },
  { id:"2", team_name:"ByteBuilders", project_title:"EduSync - Collaborative Learning Platform", description:"Real-time collaborative coding environment for students and teachers. Features AI pair programming, automatic grading, and progress tracking.", demo_url:"https://example.com", github_url:"https://github.com", technologies:["Next.js","WebSockets","MongoDB","OpenAI"], rank_achieved:1, is_featured:true, hackathons:{title:"EdTech Challenge 2024"}, category:"Education", emoji:"📚", color:"from-green-500 to-emerald-500" },
  { id:"3", team_name:"DevSquad", project_title:"GreenRoute - Carbon-Optimized Navigation", description:"Navigation app that calculates the most eco-friendly routes, tracking real-time CO2 savings. Integrated with Pakistan's public transport data.", demo_url:null, github_url:"https://github.com", technologies:["React Native","Node.js","Google Maps API"], rank_achieved:2, is_featured:false, hackathons:{title:"ClimateHack 2023"}, category:"Environment", emoji:"🌱", color:"from-emerald-500 to-green-600" },
  { id:"4", team_name:"CodeCraft", project_title:"FarmBot - Agricultural IoT Dashboard", description:"IoT platform for small farmers to monitor soil conditions, weather, and automate irrigation using cheap sensors and SMS alerts.", demo_url:"https://example.com", github_url:"https://github.com", technologies:["Vue.js","Node.js","MQTT","PostgreSQL"], rank_achieved:3, is_featured:false, hackathons:{title:"AgriTech Pakistan 2023"}, category:"Agriculture", emoji:"🌾", color:"from-yellow-500 to-orange-500" },
  { id:"5", team_name:"NeuralNinjas", project_title:"SafeCity - Crime Prediction & Prevention", description:"ML model trained on historical crime data to predict hotspots and help law enforcement with resource allocation. 87% accuracy.", demo_url:null, github_url:"https://github.com", technologies:["Python","scikit-learn","Django","D3.js"], rank_achieved:1, is_featured:true, hackathons:{title:"CivicTech Hackathon 2023"}, category:"Safety", emoji:"🛡️", color:"from-red-500 to-pink-500" },
  { id:"6", team_name:"WebWarriors", project_title:"LangBridge - Real-Time Urdu Translator", description:"Browser extension that translates web pages to Urdu in real-time using a fine-tuned NLP model optimized for Pakistani context and dialects.", demo_url:"https://example.com", github_url:"https://github.com", technologies:["JavaScript","Python","HuggingFace","FastAPI"], rank_achieved:2, is_featured:false, hackathons:{title:"NLP Challenge 2024"}, category:"Language", emoji:"🗣️", color:"from-purple-500 to-indigo-500" },
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

        {/* Header with Border */}
        <div className="border-4 border-accent/50 rounded-2xl bg-card dark:bg-surface p-8 mb-12">
          <div className="text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Hall of <span className="gradient-text">Innovation</span>
            </h1>
            <p className="text-text dark:text-slate-300 text-lg max-w-2xl mx-auto">
              Winning projects from Smart Hunristan competitions. Real problems. Real solutions. Real talent from Pakistan and beyond.
            </p>
          </div>
        </div>

        {/* Filters with Border */}
        <div className="border-4 border-accent/40 rounded-2xl bg-card dark:bg-surface p-8 mb-12">
          <div className="flex flex-col gap-4">
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
        </div>

        <p className="text-muted text-xs font-medium mb-8 uppercase tracking-wider">{filtered.length} Project{filtered.length !== 1 ? "s" : ""}</p>

        {/* Grid with Border */}
        {filtered.length > 0 && (
          <div className="border-4 border-accent/40 rounded-2xl bg-card dark:bg-surface p-8 mb-12">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((project: any) => {
                const rank = rankBadge(project.rank_achieved);
                return (
                  <div key={project.id} className={`group rounded-xl overflow-hidden flex flex-col border-4 transition-all duration-300 ${project.is_featured ? "border-accent3 bg-surface shadow-2xl shadow-accent3/30" : "border-accent/20 bg-surface/80 dark:border-accent/10"} hover:border-accent hover:shadow-2xl hover:shadow-accent/20`}>
                    {/* Image Section with Gradient and Emoji */}
                    <div className={`relative h-48 bg-gradient-to-br ${project.color} overflow-hidden flex items-center justify-center`}>
                      {/* Featured Badge - LEFT SIDE */}
                      {project.is_featured && (
                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-accent3 to-accent via-accent3 z-10"></div>
                      )}
                      
                      {/* Large Emoji Icon */}
                      <div className="text-7xl opacity-80 group-hover:scale-110 transition-transform duration-300">
                        {project.emoji}
                      </div>

                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors"></div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col">
                      {/* Category & Title */}
                      <div className="mb-3">
                        <div className="inline-block px-2.5 py-1 rounded-md bg-accent/15 border border-accent/50 mb-2.5">
                          <span className="text-xs font-bold text-accent uppercase tracking-widest dark:text-cyan-400">{project.category}</span>
                        </div>
                        <h3 className="font-display font-bold text-base leading-tight text-text dark:text-slate-100">{project.project_title}</h3>
                      </div>
                      
                      {/* Description */}
                      <p className="text-muted text-xs leading-relaxed mb-4 flex-1 line-clamp-3 dark:text-slate-400">{project.description}</p>

                      {/* Rank Badge */}
                      {rank && (
                        <div className={`inline-block w-fit mb-4 bg-gradient-to-r ${rank.color} text-white px-3 py-1.5 rounded-lg text-xs font-bold`}>
                          {rank.label}
                        </div>
                      )}

                      {/* Technologies */}
                      <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b-2 border-border/50 dark:border-border/30">
                        {project.technologies.slice(0, 3).map((t: string) => (
                          <span key={t} className="text-xs px-2.5 py-1 rounded-md bg-card border border-border/80 text-text font-mono hover:border-accent/60 transition-colors dark:bg-surface/80 dark:border-border/40 dark:text-slate-300">{t}</span>
                        ))}
                        {project.technologies.length > 3 && (
                          <span className="text-xs px-2.5 py-1 rounded-md bg-card border border-border/80 text-text font-mono dark:bg-surface/80 dark:border-border/40 dark:text-slate-300">+{project.technologies.length - 3}</span>
                        )}
                      </div>

                      {/* Hackathon */}
                      <div className="text-xs text-muted mb-5 dark:text-slate-400">
                        <span className="block font-medium">🏆 {project.hackathons?.title}</span>
                      </div>

                      {/* Links */}
                      <div className="flex items-center gap-5 mt-auto pt-3 border-t-2 border-border/50 dark:border-border/30">
                        {project.demo_url && (
                          <a href={project.demo_url} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-sm font-bold text-accent hover:text-accent3 transition-colors dark:text-cyan-400">
                            <ExternalLink size={16} /> Demo
                          </a>
                        )}
                        {project.github_url && (
                          <a href={project.github_url} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-sm font-bold text-muted hover:text-text transition-colors dark:text-slate-300 dark:hover:text-slate-100">
                            <Github size={16} /> Code
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State with Border */}
        {filtered.length === 0 && (
          <div className="border-4 border-accent/40 rounded-2xl bg-card dark:bg-surface p-12">
            <div className="text-center py-8">
              <Trophy size={48} className="text-muted/20 mx-auto mb-4" />
              <p className="text-text dark:text-slate-300 text-lg font-medium">No projects match your filters</p>
              <p className="text-muted dark:text-slate-400 text-sm mt-2">Try adjusting your search or filters</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
