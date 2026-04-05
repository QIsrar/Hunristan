"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Code2, Zap, Trophy, Users, Shield, Brain,
  ChevronRight, Star, Globe, Clock, ArrowRight
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";

const FEATURES = [
  { icon: Code2, title: "Multi-Language Arena", desc: "Python, C++, JavaScript, Java, Go, Rust and 10+ more. Monaco Editor with syntax highlighting and autocomplete.", color: "cyan" },
  { icon: Brain, title: "AI-Powered Grading", desc: "Gemini AI reviews your code quality, complexity, and innovation — beyond just correctness.", color: "purple" },
  { icon: Trophy, title: "Live Leaderboards", desc: "Real-time rankings update as you and competitors submit solutions. ICPC-style freeze in final minutes.", color: "amber" },
  { icon: Shield, title: "Anti-Cheat Security", desc: "DevTools blocking, copy-paste prevention, submission fingerprinting, and plagiarism detection.", color: "cyan" },
  { icon: Users, title: "Organizer Tools", desc: "Full hackathon management: create problems, set test cases, manage participants, export results.", color: "purple" },
  { icon: Globe, title: "Open to All", desc: "Universities, companies, bootcamps — anyone can organize or participate. From Pakistan, for the world.", color: "amber" },
];

const STATS = [
  { value: "2,400+", label: "Participants" },
  { value: "180+", label: "Problems" },
  { value: "48", label: "Hackathons" },
  { value: "15+", label: "Languages" },
];

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => setActiveFeature(i => (i + 1) % FEATURES.length), 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-bg grid-bg relative overflow-hidden">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-accent2/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-accent3/5 rounded-full blur-3xl" />
      </div>

      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className={`text-center transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-8 text-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-muted">Competitive Coding Platform</span>
              <ChevronRight size={14} className="text-accent" />
            </div>

            {/* Headline */}
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-800 leading-none mb-6 tracking-tight">
              <span className="block text-text">Compete.</span>
              <span className="block gradient-text text-glow">Code.</span>
              <span className="block text-text">Conquer.</span>
            </h1>

            <p className="text-muted text-lg md:text-xl max-w-2xl mx-auto mb-10 font-body leading-relaxed">
              Pakistan&apos;s premier hackathon platform with AI-powered grading, 
              real-time leaderboards, and multi-language code execution.
              Built for serious coders.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link href="/auth/signup" className="btn-primary flex items-center gap-2 text-lg">
                Start Competing <ArrowRight size={18} />
              </Link>
              <Link href="/hackathons" className="btn-secondary flex items-center gap-2 text-lg">
                Browse Hackathons
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {STATS.map((s) => (
                <div key={s.label} className="glass rounded-xl p-4">
                  <div className="font-display text-2xl font-bold gradient-text">{s.value}</div>
                  <div className="text-muted text-sm mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero visual: floating code window */}
          <div className={`mt-20 max-w-4xl mx-auto transition-all duration-1000 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
            <div className="glass rounded-2xl overflow-hidden border border-accent/10">
              {/* Window header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-surface/50">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
                <span className="ml-3 text-muted text-sm font-mono">solution.py — Problem #42: Maximum Subarray</span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-green-400 font-mono">● Accepted</span>
                  <span className="text-xs text-muted font-mono">100/100 pts</span>
                </div>
              </div>
              {/* Code */}
              <div className="p-6 font-mono text-sm leading-relaxed bg-[#0a0f1a]">
                <div className="flex gap-6">
                  <div className="text-muted/40 select-none text-right leading-7">
                    {Array.from({length: 12}, (_, i) => <div key={i}>{i+1}</div>)}
                  </div>
                  <div className="flex-1 overflow-auto">
                    <pre className="text-sm leading-7">
<span className="text-purple-400">def</span> <span className="text-cyan-400">max_subarray</span><span className="text-white">(</span><span className="text-orange-300">nums</span><span className="text-white">: list[int]) -&gt; int:</span>
{`
`}  <span className="text-gray-400"># Kadane&apos;s Algorithm — O(n) time, O(1) space</span>
{`
`}  <span className="text-purple-400">if</span> <span className="text-purple-400">not</span> <span className="text-orange-300">nums</span><span className="text-white">:</span>
{`
`}    <span className="text-purple-400">return</span> <span className="text-cyan-300">0</span>
{`
`}
{`
`}  <span className="text-orange-300">max_sum</span> <span className="text-white">=</span> <span className="text-orange-300">curr_sum</span> <span className="text-white">=</span> <span className="text-orange-300">nums</span><span className="text-white">[</span><span className="text-cyan-300">0</span><span className="text-white">]</span>
{`
`}
{`
`}  <span className="text-purple-400">for</span> <span className="text-orange-300">num</span> <span className="text-purple-400">in</span> <span className="text-orange-300">nums</span><span className="text-white">[</span><span className="text-cyan-300">1</span><span className="text-white">:]:</span>
{`
`}    <span className="text-orange-300">curr_sum</span> <span className="text-white">=</span> <span className="text-cyan-400">max</span><span className="text-white">(</span><span className="text-orange-300">num</span><span className="text-white">,</span> <span className="text-orange-300">curr_sum</span> <span className="text-white">+</span> <span className="text-orange-300">num</span><span className="text-white">)</span>
{`
`}    <span className="text-orange-300">max_sum</span>  <span className="text-white">=</span> <span className="text-cyan-400">max</span><span className="text-white">(</span><span className="text-orange-300">max_sum</span><span className="text-white">,</span> <span className="text-orange-300">curr_sum</span><span className="text-white">)</span>
{`
`}
{`
`}  <span className="text-purple-400">return</span> <span className="text-orange-300">max_sum</span>
                    </pre>
                  </div>
                  {/* Test results sidebar */}
                  <div className="w-48 border-l border-white/5 pl-4 space-y-2">
                    <div className="text-muted text-xs mb-3 uppercase tracking-wider">Test Cases</div>
                    {["Sample 1","Sample 2","Hidden 1","Hidden 2","Hidden 3"].map((tc, i) => (
                      <div key={tc} className="flex items-center justify-between text-xs">
                        <span className="text-muted">{tc}</span>
                        <span className={i < 4 ? "text-green-400" : "text-green-400"}>✓</span>
                      </div>
                    ))}
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <div className="text-xs text-muted">Time: <span className="text-accent">142ms</span></div>
                      <div className="text-xs text-muted mt-1">Memory: <span className="text-accent">18.4 MB</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Everything you need to <span className="gradient-text">compete at scale</span>
            </h2>
            <p className="text-muted text-lg max-w-xl mx-auto">Built from the ground up for serious competitive programmers and professional hackathon organizers.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`glass glass-hover rounded-2xl p-6 cursor-pointer ${activeFeature === i ? "border-accent/30 bg-accent/5" : ""}`}
                onMouseEnter={() => setActiveFeature(i)}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  f.color === "cyan" ? "bg-accent/10" : f.color === "purple" ? "bg-accent2/10" : "bg-accent3/10"
                }`}>
                  <f.icon size={24} className={
                    f.color === "cyan" ? "text-accent" : f.color === "purple" ? "text-accent2" : "text-accent3"
                  } />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent2/5" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} size={16} className="text-accent3 fill-accent3" />)}
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
                Ready to prove your skills?
              </h2>
              <p className="text-muted text-lg mb-8 max-w-xl mx-auto">
                Join thousands of developers competing, learning, and building careers through code.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/signup" className="btn-primary flex items-center justify-center gap-2">
                  Create Free Account <ArrowRight size={18} />
                </Link>
                <Link href="/auth/signup?role=organizer" className="btn-secondary flex items-center justify-center gap-2">
                  <Clock size={18} /> Organize a Hackathon
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <span className="font-display font-bold text-xl gradient-text">SMART HUNRISTAN</span>
              <p className="text-muted text-sm mt-1">© 2024 Smart Hunristan. All rights reserved.</p>
            </div>
            <div className="flex gap-8 text-sm text-muted">
              <Link href="/about" className="hover:text-accent transition-colors">About</Link>
              <Link href="/hackathons" className="hover:text-accent transition-colors">Hackathons</Link>
              <Link href="/mentors" className="hover:text-accent transition-colors">Mentors</Link>
              <Link href="/projects" className="hover:text-accent transition-colors">Projects</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}