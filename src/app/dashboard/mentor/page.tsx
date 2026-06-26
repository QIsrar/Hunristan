"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeGetUser } from "@/lib/supabase/getUser";
import Navbar from "@/components/layout/Navbar";
import { Users, Star, Clock, User, Award, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

export default function MentorDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [mentorData, setMentorData] = useState<any>(null);
  const [mentorStats, setMentorStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  
  // Edit Form state
  const [bio, setBio] = useState("");
  const [expertiseStr, setExpertiseStr] = useState("");
  const [availHours, setAvailHours] = useState(2);
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const user = await safeGetUser();
      if (!user) {
        router.push("/auth/signin");
        return;
      }

      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!prof) {
        router.push("/auth/signin");
        return;
      }

      // We allow either role 'mentor' or if they are a participant who got approved
      if (prof.role !== "mentor") {
        // Double check mentor applications just in case role wasn't updated
        const { data: app } = await supabase.from("mentor_applications")
          .select("*")
          .eq("email", prof.email)
          .eq("status", "approved")
          .maybeSingle();
        
        if (!app) {
          router.push("/unauthorized");
          return;
        }
      }

      setProfile(prof);

      // Load mentor data
      const [{ data: mentor }, { data: stats }] = await Promise.all([
        supabase.from("mentors").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("mentor_stats").select("*").eq("mentor_id", user.id).maybeSingle()
      ]);

      if (mentor) {
        setMentorData(mentor);
        setBio(mentor.bio || "");
        setExpertiseStr(mentor.expertise ? mentor.expertise.join(", ") : "");
        setAvailHours(mentor.availability_hours || 0);
      }
      if (stats) setMentorStats(stats);

      setLoading(false);
    }
    load();
  }, [router, supabase]);

  const handleSaveProfile = async () => {
    setSaving(true);
    const tags = expertiseStr.split(",").map(t => t.trim()).filter(Boolean);
    
    const { error } = await supabase.from("mentors").update({
      bio,
      expertise: tags,
      availability_hours: availHours
    }).eq("id", profile.id);

    if (error) {
      toast.error("Failed to update profile: " + error.message);
    } else {
      toast.success("Profile updated successfully!");
      setMentorData({ ...mentorData, bio, expertise: tags, availability_hours: availHours });
      setEditing(false);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      </div>
    );
  }

  // If the trigger failed and mentor data doesn't exist, handle it gracefully
  if (!mentorData) {
    return (
      <div className="min-h-screen bg-bg">
        <Navbar />
        <main className="max-w-7xl mx-auto px-6 pt-24 pb-12">
          <div className="glass rounded-2xl p-8 text-center">
            <h1 className="text-xl font-bold mb-4">Mentor Profile Syncing</h1>
            <p className="text-muted">Your mentor profile is currently being synced by the system. Please check back in a moment.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-12 animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-2xl font-bold text-bg shadow-lg shadow-accent/20">
            {profile.full_name?.[0] || "M"}
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-text">Welcome, {profile.full_name}</h1>
            <p className="text-muted flex items-center gap-2 mt-1">
              <Award size={16} className="text-accent" />
              Official Platform Mentor
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="glass rounded-2xl p-6 relative overflow-hidden group hover:border-accent/30 transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors" />
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Users size={16} className="text-accent" />
              </div>
              <h3 className="font-medium text-sm text-muted uppercase tracking-wider">Total Sessions</h3>
            </div>
            <p className="text-4xl font-display font-bold">{mentorStats?.total_sessions || 0}</p>
          </div>

          <div className="glass rounded-2xl p-6 relative overflow-hidden group hover:border-accent2/30 transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent2/5 rounded-full blur-2xl group-hover:bg-accent2/10 transition-colors" />
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-accent2/10 flex items-center justify-center">
                <Star size={16} className="text-accent2" />
              </div>
              <h3 className="font-medium text-sm text-muted uppercase tracking-wider">Avg Rating</h3>
            </div>
            <p className="text-4xl font-display font-bold flex items-end gap-2">
              {mentorStats?.avg_rating || "N/A"}
              {mentorStats?.total_ratings > 0 && <span className="text-sm text-muted font-normal pb-1">({mentorStats.total_ratings} ratings)</span>}
            </p>
          </div>

          <div className="glass rounded-2xl p-6 relative overflow-hidden group hover:border-accent3/30 transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent3/5 rounded-full blur-2xl group-hover:bg-accent3/10 transition-colors" />
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-accent3/10 flex items-center justify-center">
                <Clock size={16} className="text-accent3" />
              </div>
              <h3 className="font-medium text-sm text-muted uppercase tracking-wider">Availability</h3>
            </div>
            <p className="text-4xl font-display font-bold flex items-end gap-2">
              {mentorData.availability_hours}
              <span className="text-sm text-muted font-normal pb-1">hrs / week</span>
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="glass rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-bold flex items-center gap-2">
                  <User size={20} className="text-accent" />
                  Public Mentor Profile
                </h2>
                {!editing ? (
                  <button onClick={() => setEditing(true)} className="btn-secondary !py-1.5 !px-4 text-sm">
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditing(false)} className="text-sm text-muted hover:text-text px-3 py-1.5 transition-colors">Cancel</button>
                    <button onClick={handleSaveProfile} disabled={saving} className="btn-primary !py-1.5 !px-4 text-sm disabled:opacity-50">
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                )}
              </div>

              {editing ? (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="text-xs text-muted mb-1.5 block">Short Bio</label>
                    <textarea 
                      value={bio} 
                      onChange={e => setBio(e.target.value)} 
                      className="input-glass h-24 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1.5 block">Expertise Tags (comma separated)</label>
                    <input 
                      value={expertiseStr} 
                      onChange={e => setExpertiseStr(e.target.value)} 
                      className="input-glass"
                      placeholder="e.g. React, Python, Cloud Architecture"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1.5 block">Availability (Hours / Week)</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={availHours} 
                      onChange={e => setAvailHours(parseInt(e.target.value) || 0)} 
                      className="input-glass"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-muted mb-2 font-semibold">Bio</h3>
                    <p className="text-text leading-relaxed bg-surface/50 p-4 rounded-xl border border-white/5">{mentorData.bio || "No bio added yet."}</p>
                  </div>
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-muted mb-2 font-semibold">Expertise</h3>
                    <div className="flex flex-wrap gap-2">
                      {mentorData.expertise && mentorData.expertise.length > 0 ? mentorData.expertise.map((tag: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium border border-accent/20">
                          {tag}
                        </span>
                      )) : <p className="text-sm text-muted">No expertise added.</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="glass rounded-3xl p-6">
              <h2 className="font-display text-xl font-bold mb-4">Pending Requests</h2>
              <div className="bg-surface/50 border border-white/5 rounded-xl p-8 text-center">
                <p className="text-muted text-sm mb-4">No pending requests at this time.</p>
                <button className="btn-secondary !py-2 text-sm pointer-events-none opacity-50">View All Requests</button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass rounded-3xl p-6">
              <h2 className="font-display text-xl font-bold mb-4">Quick Links</h2>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-4 bg-surface/30 hover:bg-surface/60 border border-white/5 rounded-xl transition-colors group">
                  <span className="font-medium">My Active Teams</span>
                  <ArrowRight size={16} className="text-muted group-hover:text-accent transition-colors" />
                </button>
                <button className="w-full flex items-center justify-between p-4 bg-surface/30 hover:bg-surface/60 border border-white/5 rounded-xl transition-colors group">
                  <span className="font-medium">Community Discussions</span>
                  <ArrowRight size={16} className="text-muted group-hover:text-accent transition-colors" />
                </button>
                <button className="w-full flex items-center justify-between p-4 bg-surface/30 hover:bg-surface/60 border border-white/5 rounded-xl transition-colors group">
                  <span className="font-medium">Schedule settings</span>
                  <ArrowRight size={16} className="text-muted group-hover:text-accent transition-colors" />
                </button>
              </div>
            </div>
            
            <div className="p-6 rounded-3xl bg-gradient-to-br from-accent/10 to-accent2/10 border border-accent/20">
              <h3 className="font-bold text-lg mb-2">Mentor Guidelines</h3>
              <p className="text-sm text-muted mb-4 leading-relaxed">Remember to respond to requests within 24 hours. Your expertise helps shape the next generation of engineers!</p>
              <a href="#" className="text-accent hover:underline text-sm font-medium">Read full guidelines &rarr;</a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
