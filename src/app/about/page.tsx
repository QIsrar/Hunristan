"use client";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import { Code2, Brain, Shield, Globe, Users, Zap, Trophy, Heart, Mail, Github, Twitter } from "lucide-react";

const TEAM = [
  { name: "Qazi Israr", role: "Founder & CEO", initials: "QI", gradient: "from-cyan-400 to-blue-600", bio: "CS grad from COMSATS. Former competitive programmer with 5+ years of hackathon organizing experience." },
  { name: "Talha Jehangiri", role: "CTO", initials: "TJ", gradient: "from-purple-400 to-pink-600", bio: "Full-stack engineer. Built infrastructure serving 100k+ users at previous startup." },
  { name: "Abdul Wasay", role: "Head of AI", initials: "AW", gradient: "from-amber-400 to-orange-600", bio: "ML researcher, MS candidate at LUMS. Specializes in code analysis and automated grading systems." },
  { name: "Abdullah Zaheer", role: "Product Designer", initials: "AZ", gradient: "from-green-400 to-teal-600", bio: "UX/UI specialist with a passion for making complex developer tools feel effortless." },
];

const STACK = [
  { name: "Next.js 14", desc: "React framework" },
  { name: "Supabase", desc: "Database & Auth" },
  { name: "Piston API", desc: "Code execution" },
  { name: "Gemini AI", desc: "Code review" },
  { name: "TypeScript", desc: "Type safety" },
  { name: "Tailwind CSS", desc: "Styling" },
  { name: "Monaco Editor", desc: "Code editor" },
  { name: "Recharts", desc: "Analytics" },
];

const TIMELINE = [
  { year: "2022", event: "Platform idea born from frustration with clunky hackathon tools at NUST" },
  { year: "2023 Q1", event: "First version launched with 3 universities, 400 participants" },
  { year: "2023 Q3", event: "Crossed 1,000 registered users. Added real-time leaderboards" },
  { year: "2024 Q1", event: "AI-powered code review integrated. Gemini partnership" },
  { year: "2024 Q4", event: "2,400+ participants, 48 hackathons hosted, custom AI model R&D begins" },
  { year: "2025", event: "Custom AI grading model launching. Global expansion phase" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 text-center relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/3 w-72 h-72 bg-accent2/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto relative">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-sm text-muted mb-8">
            <Heart size={14} className="text-red-400" /> Built with passion in Pakistan
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-bold mb-6">
            We&apos;re building the <span className="gradient-text">world&apos;s best</span> hackathon platform
          </h1>
          <p className="text-muted text-lg leading-relaxed">
            Smart Hunristan was born from a simple belief: talent deserves better infrastructure.
            Pakistani developers are world-class — they just needed a world-class stage.
          </p>
        </div>
      </section>

      {/* Mission + Values */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Code2, title: "Meritocracy First", desc: "Code speaks louder than résumés. We built a platform where skill is the only currency that matters.", color: "text-accent" },
              { icon: Brain, title: "AI-Native Grading", desc: "Beyond right-or-wrong. Our custom AI model evaluates code quality, complexity, and elegance — just like a senior engineer would.", color: "text-accent2" },
              { icon: Globe, title: "Open Access", desc: "Free to participate. Affordable to organize. No paywalls on talent discovery.", color: "text-accent3" },
            ].map(v => (
              <div key={v.title} className="glass rounded-2xl p-6">
                <div className={`w-12 h-12 rounded-xl ${v.color.replace("text-","bg-")}/10 flex items-center justify-center mb-4`}>
                  <v.icon size={24} className={v.color} />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{v.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-center mb-12">Our Journey</h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-accent via-accent2 to-transparent" />
            <div className="space-y-8">
              {TIMELINE.map((t, i) => (
                <div key={i} className="flex gap-6 pl-10 relative">
                  <div className="absolute left-0 w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent2 flex items-center justify-center shrink-0 text-xs font-bold text-bg">
                    {i + 1}
                  </div>
                  <div className="glass rounded-xl p-4 flex-1">
                    <div className="text-accent text-xs font-mono mb-1">{t.year}</div>
                    <p className="text-sm leading-relaxed">{t.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-center mb-12">The Team</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM.map(member => (
              <div key={member.name} className="glass glass-hover rounded-2xl p-6 text-center">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${member.gradient} flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4 font-display`}>
                  {member.initials}
                </div>
                <h3 className="font-display font-semibold">{member.name}</h3>
                <p className="text-accent text-xs mb-3">{member.role}</p>
                <p className="text-muted text-xs leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-center mb-4">Built With</h2>
          <p className="text-muted text-center mb-10">Modern, battle-tested technology for performance and reliability</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STACK.map(s => (
              <div key={s.name} className="glass rounded-xl p-4 text-center glass-hover">
                <div className="font-display font-semibold text-sm">{s.name}</div>
                <div className="text-muted text-xs mt-1">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="glass rounded-2xl p-10 text-center">
            <h2 className="font-display text-3xl font-bold mb-4">Get in Touch</h2>
            <p className="text-muted mb-8">Questions, partnerships, or just want to say hi? We&apos;d love to hear from you.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="mailto:hello@smarthunristan.com" className="btn-primary flex items-center justify-center gap-2">
                <Mail size={16} /> hello@smarthunristan.com
              </a>
              <a href="https://github.com/smarthunristan" target="_blank" rel="noopener" className="btn-secondary flex items-center justify-center gap-2">
                <Github size={16} /> GitHub
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}