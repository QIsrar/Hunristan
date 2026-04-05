"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import toast from "react-hot-toast";
import { User, Code2, Trophy, Star, Edit2, Save, Loader2, Github, Linkedin, Shield } from "lucide-react";
import type { Profile } from "@/types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name:"", bio:"", university:"", organization:"", github_url:"", linkedin_url:"" });
  const [pwForm, setPwForm] = useState({ current:"", next:"", confirm:"" });
  const [changingPw, setChangingPw] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return router.push("/auth/signin");
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) { setProfile(data); setForm({ full_name:data.full_name||"", bio:data.bio||"", university:data.university||"", organization:data.organization||"", github_url:data.github_url||"", linkedin_url:data.linkedin_url||"" }); }
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", profile!.id);
    if (error) toast.error("Failed to save");
    else { toast.success("Profile updated!"); setProfile(p => p ? {...p,...form} : p); setEditing(false); }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    if (pwForm.next !== pwForm.confirm) return toast.error("Passwords don't match");
    if (pwForm.next.length < 8) return toast.error("Password too short");
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.next });
    if (error) toast.error(error.message);
    else { toast.success("Password changed!"); setPwForm({ current:"", next:"", confirm:"" }); }
    setChangingPw(false);
  };

  if (!profile) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Loader2 size={32} className="text-accent animate-spin" />
    </div>
  );

  const stats = [
    { icon: Trophy, label: "Best Rank", value: profile.best_rank ? `#${profile.best_rank}` : "—", color: "text-accent3" },
    { icon: Code2, label: "Problems Solved", value: profile.problems_solved, color: "text-accent" },
    { icon: Star, label: "Total Points", value: profile.total_points, color: "text-accent2" },
    { icon: User, label: "Hackathons", value: profile.hackathons_participated, color: "text-green-400" },
  ];

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-4xl mx-auto">

        {/* Avatar + name */}
        <div className="glass rounded-2xl p-8 mb-6 flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-4xl font-bold text-bg font-display shrink-0">
            {profile.full_name?.[0]}
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <h1 className="font-display text-3xl font-bold">{profile.full_name}</h1>
              {profile.role === "admin" && <Shield size={20} className="text-accent2" />}
            </div>
            <p className="text-muted mt-1">{profile.email}</p>
            <p className="text-muted text-sm mt-0.5 capitalize">{profile.role} {profile.university ? `· ${profile.university}` : ""}{profile.organization ? `· ${profile.organization}` : ""}</p>
            {profile.bio && <p className="text-sm mt-3 max-w-lg">{profile.bio}</p>}
            <div className="flex items-center gap-4 mt-4 justify-center md:justify-start">
              {profile.github_url && <a href={profile.github_url} target="_blank" rel="noopener" className="text-muted hover:text-accent transition-colors"><Github size={18} /></a>}
              {profile.linkedin_url && <a href={profile.linkedin_url} target="_blank" rel="noopener" className="text-muted hover:text-accent transition-colors"><Linkedin size={18} /></a>}
            </div>
          </div>
          <button onClick={() => setEditing(!editing)} className="btn-secondary !py-2 !px-4 flex items-center gap-2 text-sm shrink-0">
            <Edit2 size={14} /> {editing ? "Cancel" : "Edit Profile"}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map(s => (
            <div key={s.label} className="glass rounded-xl p-4 text-center">
              <s.icon size={18} className={`${s.color} mx-auto mb-2`} />
              <div className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-muted text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Edit form */}
        {editing && (
          <div className="glass rounded-2xl p-6 mb-6">
            <h2 className="font-display font-semibold mb-5">Edit Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted mb-2 block">Full Name</label>
                <input value={form.full_name} onChange={e => setForm(f => ({...f,full_name:e.target.value}))} className="input-glass" />
              </div>
              <div>
                <label className="text-sm text-muted mb-2 block">Bio</label>
                <textarea value={form.bio} onChange={e => setForm(f => ({...f,bio:e.target.value}))} rows={3} className="input-glass resize-none" placeholder="Tell others about yourself..." />
              </div>
              {profile.role === "participant" && (
                <div>
                  <label className="text-sm text-muted mb-2 block">University</label>
                  <input value={form.university} onChange={e => setForm(f => ({...f,university:e.target.value}))} className="input-glass" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted mb-2 block">GitHub URL</label>
                  <input value={form.github_url} onChange={e => setForm(f => ({...f,github_url:e.target.value}))} className="input-glass" placeholder="https://github.com/..." />
                </div>
                <div>
                  <label className="text-sm text-muted mb-2 block">LinkedIn URL</label>
                  <input value={form.linkedin_url} onChange={e => setForm(f => ({...f,linkedin_url:e.target.value}))} className="input-glass" placeholder="https://linkedin.com/in/..." />
                </div>
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Change password */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display font-semibold mb-5">Change Password</h2>
          <div className="space-y-4 max-w-sm">
            <div>
              <label className="text-sm text-muted mb-2 block">New Password</label>
              <input type="password" value={pwForm.next} onChange={e => setPwForm(f => ({...f,next:e.target.value}))} className="input-glass" placeholder="Min. 8 characters" />
            </div>
            <div>
              <label className="text-sm text-muted mb-2 block">Confirm New Password</label>
              <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({...f,confirm:e.target.value}))} className="input-glass" />
            </div>
            <button onClick={handlePasswordChange} disabled={changingPw} className="btn-secondary flex items-center gap-2">
              {changingPw ? <Loader2 size={16} className="animate-spin" /> : null} Update Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
