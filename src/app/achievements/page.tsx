"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { Trophy, Star, Code2, Zap, Shield, Award, Lock } from "lucide-react";

const ALL_BADGES = [
  // Beginner
  { id:"first_blood", icon:"🩸", title:"First Blood", desc:"Submit your first solution", category:"Beginner", points:50, gradient:"from-red-400 to-rose-600" },
  { id:"accepted_1", icon:"✅", title:"Accepted!", desc:"Get your first Accepted verdict", category:"Beginner", points:100, gradient:"from-green-400 to-emerald-600" },
  { id:"registered_1", icon:"🎟️", title:"In the Arena", desc:"Register for your first hackathon", category:"Beginner", points:50, gradient:"from-blue-400 to-cyan-600" },
  // Solver
  { id:"solved_5", icon:"⚡", title:"Spark", desc:"Solve 5 problems", category:"Solver", points:200, gradient:"from-yellow-400 to-amber-600" },
  { id:"solved_25", icon:"🔥", title:"On Fire", desc:"Solve 25 problems", category:"Solver", points:500, gradient:"from-orange-400 to-red-600" },
  { id:"solved_100", icon:"💯", title:"Century", desc:"Solve 100 problems", category:"Solver", points:2000, gradient:"from-purple-400 to-pink-600" },
  // Speed
  { id:"speed_demon", icon:"🚀", title:"Speed Demon", desc:"Submit within 5 minutes of a hackathon starting", category:"Speed", points:300, gradient:"from-cyan-400 to-blue-600" },
  { id:"first_solver", icon:"🥇", title:"First Solver", desc:"Be the first to solve a problem in a hackathon", category:"Speed", points:500, gradient:"from-amber-300 to-yellow-600" },
  // Difficulty
  { id:"hard_first", icon:"💎", title:"Diamond Coder", desc:"Solve your first Hard problem", category:"Difficulty", points:400, gradient:"from-blue-300 to-indigo-700" },
  { id:"perfectionist", icon:"🏆", title:"Perfectionist", desc:"Get 100% score on a submission", category:"Difficulty", points:300, gradient:"from-accent3 to-yellow-600" },
  // Community
  { id:"mentor_connect", icon:"🤝", title:"Connected", desc:"Connect with a mentor", category:"Community", points:100, gradient:"from-teal-400 to-cyan-600" },
  { id:"top_10", icon:"🌟", title:"Top 10", desc:"Finish in top 10 of any hackathon", category:"Community", points:750, gradient:"from-violet-400 to-purple-700" },
  // Security
  { id:"clean_record", icon:"🛡️", title:"Clean Record", desc:"Complete 3 hackathons with zero security violations", category:"Security", points:200, gradient:"from-green-500 to-teal-700" },
];

export default function AchievementsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [earnedIds, setEarnedIds] = useState<string[]>(["first_blood","accepted_1","registered_1","solved_5"]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return router.push("/auth/signin");
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
      // In production: fetch from achievements table
      setLoading(false);
    });
  }, []);

  const categories = [...new Set(ALL_BADGES.map(b => b.category))];
  const totalPoints = earnedIds.reduce((sum, id) => {
    const badge = ALL_BADGES.find(b => b.id === id);
    return sum + (badge?.points || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <Trophy size={28} className="text-accent3" /> Achievements
            </h1>
            <p className="text-muted text-sm mt-1">Earn badges, collect points, prove your skills</p>
          </div>
          <div className="glass rounded-xl px-5 py-3 text-center">
            <div className="font-display text-2xl font-bold gradient-text-amber">{totalPoints}</div>
            <div className="text-muted text-xs">Badge Points</div>
          </div>
        </div>

        {/* Progress */}
        <div className="glass rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Collection Progress</span>
            <span className="text-sm text-muted">{earnedIds.length}/{ALL_BADGES.length} badges</span>
          </div>
          <div className="h-3 bg-surface rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent2 transition-all duration-700"
              style={{ width: `${(earnedIds.length / ALL_BADGES.length) * 100}%` }} />
          </div>
        </div>

        {/* Badges by category */}
        {categories.map(cat => (
          <div key={cat} className="mb-10">
            <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <Star size={16} className="text-accent3" /> {cat}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {ALL_BADGES.filter(b => b.category === cat).map(badge => {
                const earned = earnedIds.includes(badge.id);
                return (
                  <div key={badge.id} className={`glass rounded-2xl p-5 text-center transition-all ${earned ? "border-white/10 hover:border-accent/20" : "opacity-40 grayscale"}`}>
                    {earned ? (
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${badge.gradient} flex items-center justify-center text-3xl mx-auto mb-3`}>
                        {badge.icon}
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-3">
                        <Lock size={20} className="text-muted" />
                      </div>
                    )}
                    <div className="font-display font-semibold text-sm">{badge.title}</div>
                    <div className="text-muted text-xs mt-1 leading-relaxed">{badge.desc}</div>
                    <div className={`text-xs mt-2 font-mono ${earned ? "text-accent3" : "text-muted"}`}>+{badge.points} pts</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
