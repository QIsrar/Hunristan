"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/Navbar";
import { Search, Linkedin, Github, Star, X, Loader2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import type { Mentor } from "@/types";
import toast from "react-hot-toast";
import Link from "next/link";

const ALL_EXPERTISE = ["AI/ML","Web Dev","Algorithms","Cybersecurity","Data Science","Mobile","DevOps","Blockchain","C++","Python","Flutter","React","Node.js","Rust","Go","Java","Cloud","System Design","Other"];

const GRADIENTS = ["from-cyan-400 to-blue-600","from-purple-400 to-pink-600","from-amber-400 to-orange-600","from-green-400 to-teal-600","from-red-400 to-rose-600","from-indigo-400 to-violet-600"];

type FormData = {
  full_name: string; email: string; phone: string; job_title: string;
  organization: string; years_experience: string; expertise: string[];
  bio: string; linkedin_url: string; github_url: string;
  why_mentor: string; availability_hours: string;
};

const EMPTY_FORM: FormData = {
  full_name: "", email: "", phone: "", job_title: "", organization: "",
  years_experience: "", expertise: [], bio: "", linkedin_url: "",
  github_url: "", why_mentor: "", availability_hours: "2",
};

export default function MentorsPage() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [filtered, setFiltered] = useState<Mentor[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [otherExpertise, setOtherExpertise] = useState("");
  const supabase = createClient();

  useEffect(() => {
    Promise.all([
      supabase.from("mentors").select("*").eq("is_active", true),
      supabase.from("mentor_stats").select("*"),
    ]).then(([{ data }, { data: statsData }]) => {
      const statsMap = Object.fromEntries((statsData || []).map((s: any) => [s.id, s]));
      if (data) data.forEach((m: any) => { const s = statsMap[m.id]; if (s) { m.avg_rating = s.avg_rating; m.total_ratings = s.total_ratings; } });
      const sampleMentors: Mentor[] = data && data.length > 0 ? data : [
        { id:"1", name:"Dr. Ahmed Khan", bio:"AI researcher with 10+ years experience. Former Google engineer. Passionate about making AI accessible.", expertise:["AI/ML","Python","Algorithms"], avatar_url:undefined, linkedin_url:"https://linkedin.com", github_url:"https://github.com", is_active:true },
        { id:"2", name:"Sara Malik", bio:"Full-stack engineer and open source contributor. Built 3 successful startups. Loves teaching.", expertise:["Web Dev","React","Node.js"], avatar_url:undefined, linkedin_url:"https://linkedin.com", github_url:"https://github.com", is_active:true },
        { id:"3", name:"Usman Tariq", bio:"Security expert, CTF champion, OWASP contributor. Has trained 500+ students in cybersecurity.", expertise:["Cybersecurity","C++","Networks"], avatar_url:undefined, linkedin_url:"https://linkedin.com", github_url:"https://github.com", is_active:true },
        { id:"4", name:"Zainab Hussain", bio:"Data scientist at a Fortune 500. PhD in Computer Science. Specializes in NLP and computer vision.", expertise:["Data Science","Python","AI/ML"], avatar_url:undefined, linkedin_url:"https://linkedin.com", github_url:undefined, is_active:true },
        { id:"5", name:"Kamran Aziz", bio:"Mobile development lead with apps in 40+ countries. Expert in React Native and Flutter.", expertise:["Mobile","React","Flutter"], avatar_url:undefined, linkedin_url:"https://linkedin.com", github_url:"https://github.com", is_active:true },
        { id:"6", name:"Nadia Sheikh", bio:"DevOps architect at a top cloud company. Kubernetes expert, conference speaker.", expertise:["DevOps","Cloud","Go"], avatar_url:undefined, linkedin_url:"https://linkedin.com", github_url:"https://github.com", is_active:true },
      ];
      setMentors(sampleMentors);
      setFiltered(sampleMentors);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    let result = mentors;
    if (search) result = result.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.bio?.toLowerCase().includes(search.toLowerCase()));
    if (selected.length > 0) result = result.filter(m => selected.some(s => m.expertise.includes(s)));
    setFiltered(result);
  }, [search, selected, mentors]);

  const toggleExpertise = (e: string) => setSelected(s => s.includes(e) ? s.filter(x => x !== e) : [...s, e]);
  const toggleFormExpertise = (e: string) => setForm(f => ({
    ...f, expertise: f.expertise.includes(e) ? f.expertise.filter(x => x !== e) : [...f.expertise, e]
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.phone || !form.job_title || !form.organization || !form.bio || !form.why_mentor) {
      return toast.error("Please fill all required fields");
    }
    if (form.phone.length !== 11) return toast.error("Phone number must be exactly 11 digits");
    // Merge "Other" custom text into expertise list
    let finalExpertise = form.expertise.filter(e => e !== "Other");
    if (form.expertise.includes("Other")) {
      if (!otherExpertise.trim()) return toast.error("Please specify your other expertise area");
      finalExpertise.push(otherExpertise.trim());
    }
    if (finalExpertise.length === 0) return toast.error("Select at least one area of expertise");
    if (form.bio.length < 50) return toast.error("Bio must be at least 50 characters");
    if (form.why_mentor.length < 30) return toast.error("Please elaborate on why you want to mentor");

    setSubmitting(true);
    try {
      const res = await fetch("/api/mentor-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, expertise: finalExpertise }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitted(true);
      setShowForm(false);
      setForm(EMPTY_FORM);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Learn from the <span className="gradient-text">Best</span>
          </h1>
          <p className="text-muted text-lg max-w-xl mx-auto">
            Our mentors are industry veterans, researchers, and competitive programming champions — here to help you grow.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input-glass pl-10" placeholder="Search mentors..." />
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_EXPERTISE.slice(0,10).map(e => (
              <button key={e} onClick={() => toggleExpertise(e)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selected.includes(e) ? "bg-accent text-bg" : "glass text-muted hover:text-text"}`}>
                {e}
              </button>
            ))}
            {selected.length > 0 && (
              <button onClick={() => setSelected([])} className="px-3 py-1.5 rounded-full text-xs text-red-400 glass hover:bg-red-500/10 transition-colors">
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <div key={i} className="glass rounded-2xl h-64 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((mentor, i) => (
              <div key={mentor.id} className="glass glass-hover rounded-2xl p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center text-2xl font-bold text-white font-display shrink-0`}>
                    {mentor.name.split(" ").map((n: string) => n[0]).join("").slice(0,2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold">{mentor.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      {mentor.linkedin_url && <a href={mentor.linkedin_url} target="_blank" rel="noopener" className="text-muted hover:text-accent transition-colors"><Linkedin size={14} /></a>}
                      {mentor.github_url && <a href={mentor.github_url} target="_blank" rel="noopener" className="text-muted hover:text-accent transition-colors"><Github size={14} /></a>}
                    </div>
                  </div>
                </div>
                <p className="text-muted text-sm leading-relaxed mb-4 line-clamp-3">{mentor.bio}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {mentor.expertise.map((tag: string) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">{tag}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  {(mentor as any).avg_rating ? (
                    <div className="flex items-center gap-1 text-xs text-amber-400">
                      <Star size={12} className="fill-amber-400" />
                      <span className="font-bold">{(mentor as any).avg_rating}</span>
                      <span className="text-muted">({(mentor as any).total_ratings})</span>
                    </div>
                  ) : <span className="text-xs text-muted">No ratings yet</span>}
                  <Link href={`/mentors/${mentor.id}`} className="text-xs text-accent hover:underline font-medium">
                    View Profile →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 glass rounded-2xl p-10 text-center">
          <Star size={32} className="text-accent3 mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-3">Want to become a mentor?</h2>
          <p className="text-muted mb-6 max-w-md mx-auto">
            Share your expertise with the next generation of Pakistani developers. Applications are reviewed by our team within 3–5 days.
          </p>
          {submitted ? (
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-500/10 border border-green-500/25 text-green-400 font-semibold">
              <CheckCircle2 size={18} /> Application submitted! We'll be in touch.
            </div>
          ) : (
            <button onClick={() => setShowForm(v => !v)} className="btn-primary inline-flex items-center gap-2">
              {showForm ? <><ChevronUp size={16} /> Hide Form</> : <><Star size={16} /> Apply to Mentor</>}
            </button>
          )}
        </div>

        {/* Application Form */}
        {showForm && !submitted && (
          <div className="mt-6 glass rounded-2xl p-8 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-xl font-bold">Mentor Application</h3>
                <p className="text-muted text-sm mt-1">All fields marked * are required</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-text transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Info */}
              <div>
                <h4 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Personal Information</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted mb-1.5 block">Full Name *</label>
                    <input value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))}
                      className="input-glass" placeholder="Dr. Ahmed Khan" required />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1.5 block">Email Address *</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                      className="input-glass" placeholder="ahmed@example.com" required />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1.5 block">Phone * <span className="text-muted/60">(11 digits)</span></label>
                    <input value={form.phone} onChange={e => { const v = e.target.value.replace(/\D/g,""); if(v.length<=11) setForm(f => ({...f, phone: v})); }}
                      className="input-glass" placeholder="03001234567" maxLength={11} required />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1.5 block">Current Role *</label>
                    <input value={form.job_title} onChange={e => setForm(f => ({...f, job_title: e.target.value}))}
                      className="input-glass" placeholder="Senior Software Engineer" required />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1.5 block">Organization / Company *</label>
                    <input value={form.organization} onChange={e => setForm(f => ({...f, organization: e.target.value}))}
                      className="input-glass" placeholder="Google, NUST, etc." required />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1.5 block">Years of Experience *</label>
                    <input type="number" min="1" max="40" value={form.years_experience}
                      onChange={e => setForm(f => ({...f, years_experience: e.target.value}))}
                      className="input-glass" placeholder="5" required />
                  </div>
                </div>
              </div>

              {/* Expertise */}
              <div>
                <h4 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
                  Areas of Expertise * <span className="normal-case text-xs font-normal">(select all that apply)</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {ALL_EXPERTISE.map(e => (
                    <button type="button" key={e} onClick={() => toggleFormExpertise(e)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${form.expertise.includes(e) ? "bg-accent text-bg" : "glass text-muted hover:text-text"}`}>
                      {e}
                    </button>
                  ))}
                </div>
                {form.expertise.includes("Other") && (
                  <div className="mt-3">
                    <label className="text-xs text-muted mb-1.5 block">Specify your expertise *</label>
                    <input
                      value={otherExpertise}
                      onChange={e => setOtherExpertise(e.target.value)}
                      className="input-glass max-w-xs"
                      placeholder="e.g. Competitive Programming, Embedded Systems..."
                    />
                  </div>
                )}
                {form.expertise.length > 0 && (
                  <p className="text-xs text-accent mt-2">
                    Selected: {form.expertise.filter(e => e !== "Other").concat(form.expertise.includes("Other") && otherExpertise ? [otherExpertise] : form.expertise.includes("Other") ? ["Other (specify above)"] : []).join(", ")}
                  </p>
                )}
              </div>

              {/* Profile */}
              <div>
                <h4 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Profile & Links</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted mb-1.5 block">Short Bio * <span className="text-muted/60">(min 50 chars — shown publicly on mentor card)</span></label>
                    <textarea value={form.bio} onChange={e => setForm(f => ({...f, bio: e.target.value}))}
                      rows={3} className="input-glass resize-none" placeholder="Describe your background, achievements, and what you bring to mentees..." required />
                    <p className="text-xs text-muted mt-1">{form.bio.length} / 300 chars</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted mb-1.5 block">LinkedIn URL</label>
                      <input value={form.linkedin_url} onChange={e => setForm(f => ({...f, linkedin_url: e.target.value}))}
                        className="input-glass" placeholder="https://linkedin.com/in/..." />
                    </div>
                    <div>
                      <label className="text-xs text-muted mb-1.5 block">GitHub URL</label>
                      <input value={form.github_url} onChange={e => setForm(f => ({...f, github_url: e.target.value}))}
                        className="input-glass" placeholder="https://github.com/..." />
                    </div>
                  </div>
                </div>
              </div>

              {/* Motivation */}
              <div>
                <h4 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Motivation</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted mb-1.5 block">Why do you want to mentor? * <span className="text-muted/60">(min 30 chars)</span></label>
                    <textarea value={form.why_mentor} onChange={e => setForm(f => ({...f, why_mentor: e.target.value}))}
                      rows={4} className="input-glass resize-none" placeholder="What motivates you to share your knowledge? What impact do you hope to have on participants?" required />
                  </div>
                  <div className="max-w-xs">
                    <label className="text-xs text-muted mb-1.5 block">Available hours per week *</label>
                    <select value={form.availability_hours} onChange={e => setForm(f => ({...f, availability_hours: e.target.value}))} className="input-glass">
                      <option value="1">~1 hour / week</option>
                      <option value="2">~2 hours / week</option>
                      <option value="4">~4 hours / week</option>
                      <option value="8">8+ hours / week</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Star size={16} />}
                  {submitting ? "Submitting..." : "Submit Application"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}