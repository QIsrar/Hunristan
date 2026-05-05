"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell
} from "recharts";
import {
  Shield, Users, Trophy, Code2, AlertTriangle, CheckCircle2,
  XCircle, Ban, Search, TrendingUp, Activity, Bell, Megaphone,
  Loader2, BarChart2, ChevronRight, Building2, Clock, X, Star
} from "lucide-react";
import type { Profile, Hackathon } from "@/types";
import { format, subDays } from "date-fns";
import toast from "react-hot-toast";

type AdminTab = "overview" | "users" | "organizers" | "hackathons" | "mentors" | "security" | "announcements";

function KPICard({ icon: Icon, label, value, sub, color, trend }: any) {
  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden">
      <div className={`absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-8 ${color.replace("text-","bg-")}`} style={{ opacity: 0.08 }} />
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color.replace("text-","bg-")}/10`}>
          <Icon size={20} className={color} />
        </div>
        {trend !== undefined && trend !== null && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${trend > 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
            {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className={`font-display text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-muted text-xs uppercase tracking-wider mt-1">{label}</div>
      {sub && <div className="text-muted text-xs mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [mentorApps, setMentorApps] = useState<any[]>([]);
  const [mentorActionLoading, setMentorActionLoading] = useState<string | null>(null);
  const [mentorRejectModal, setMentorRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [mentorRejectReason, setMentorRejectReason] = useState("");
  const [announcement, setAnnouncement] = useState({ title: "", content: "", type: "info" });
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AdminTab>("overview");
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [expandedHackathon, setExpandedHackathon] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      let user = null;
      try { const { data } = await supabase.auth.getUser(); user = data.user; }
      catch { await new Promise(r => setTimeout(r, 300));
        try { const { data } = await supabase.auth.getUser(); user = data.user; } catch {} }
      if (!user) return router.push("/auth/signin");
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (prof?.role !== "admin") return router.push(`/dashboard/${prof?.role || "participant"}`);
      setProfile(prof);
      const [{ data: u }, { data: h }, { data: logs }, { data: subs }, { data: mapps }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email,role,organization,org_type,designation,org_website,why_organize,organizer_status,university,phone,total_points,problems_solved,best_rank,hackathons_participated,is_banned,avatar_url,created_at").order("created_at", { ascending: false }).limit(100),
        supabase.from("hackathons").select("*,profiles(full_name,organization)").neq("status","draft").order("created_at", { ascending: false }),
        supabase.from("security_logs").select("*,profiles(full_name)").order("created_at", { ascending: false }).limit(100),
        supabase.from("submissions").select("verdict,submitted_at,language").order("submitted_at", { ascending: false }).limit(500),
        supabase.from("mentor_applications").select("*").order("created_at", { ascending: false }),
      ]);
      const allU = u || [];
      console.log("[Admin] profiles loaded:", allU.length,
        "organizers:", allU.filter((x:any) => x.role === "organizer").map((x:any) => ({
          email: x.email, role: x.role, organizer_status: x.organizer_status
        }))
      );
      setUsers(allU);
      setHackathons(h || []);
      setSecurityLogs(logs || []);
      setSubmissions(subs || []);
      setMentorApps(mapps || []);
      setLoading(false);
    }
    load();
  }, []);

  // Approved mentor emails — must be defined before countedUsers
  const approvedMentorEmails = new Set(
    mentorApps.filter((a: any) => a.status === "approved").map((a: any) => a.email)
  );

  // Real trend calculations
  const now = new Date();
  const countedUsers = users.filter(u => u.role !== "admin" && !(u.role === "organizer" && (u as any).organizer_status !== "approved") && !approvedMentorEmails.has(u.email));
  const thisWeekUsers = countedUsers.filter(u => {
    const d = new Date(u.created_at || 0);
    return (now.getTime() - d.getTime()) < 7 * 86400000;
  }).length;
  const lastWeekUsers = countedUsers.filter(u => {
    const d = new Date(u.created_at || 0);
    const age = now.getTime() - d.getTime();
    return age >= 7 * 86400000 && age < 14 * 86400000;
  }).length;
  const userTrend = lastWeekUsers === 0 ? null
    : Math.round(((thisWeekUsers - lastWeekUsers) / lastWeekUsers) * 100);

  const totalSubs = submissions.length;
  const acceptedSubs = submissions.filter((s: any) => s.verdict === "accepted").length;
  const acceptRate = totalSubs === 0 ? null : Math.round((acceptedSubs / totalSubs) * 100);

  // Chart data
  const userGrowth = [...Array(7)].map((_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStr = format(date, "yyyy-MM-dd");
    return { date: format(date, "EEE"), count: users.filter(u => u.created_at?.startsWith(dayStr)).length };
  });

  const submissionTrend = [...Array(7)].map((_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStr = format(date, "yyyy-MM-dd");
    const daysSubs = submissions.filter(s => s.submitted_at?.startsWith(dayStr));
    return {
      date: format(date, "EEE"),
      total: daysSubs.length,
      accepted: daysSubs.filter(s => s.verdict === "accepted").length,
    };
  });

  const hackathonsByStatus = [
    { name: "Active", value: hackathons.filter(h => h.status === "active").length, fill: "#10b981" },
    { name: "Upcoming", value: hackathons.filter(h => h.status === "upcoming").length, fill: "#00e5ff" },
    { name: "Ended", value: hackathons.filter(h => h.status === "ended").length, fill: "#6b7280" },
  ].filter(d => d.value > 0);

  const roleBreakdown = [
    { name: "Participants", value: users.filter(u => u.role === "participant").length, fill: "#00e5ff" },
    { name: "Organizers", value: users.filter(u => u.role === "organizer").length, fill: "#f59e0b" },
    { name: "Admins", value: users.filter(u => u.role === "admin").length, fill: "#7c3aed" },
  ];

  const toggleBan = async (userId: string, banned: boolean) => {
    await supabase.from("profiles").update({ is_banned: !banned }).eq("id", userId);
    setUsers(u => u.map(p => p.id === userId ? { ...p, is_banned: !banned } : p));
    toast.success(banned ? "User unbanned" : "User banned");
  };

  const severityLabel = (vtype: string) => {
    if (["plagiarism_suspected","multiple_accounts"].includes(vtype)) return { label: "High", cls: "text-red-400" };
    if (["devtools_attempt"].includes(vtype)) return { label: "Medium", cls: "text-amber-400" };
    return { label: "Low", cls: "text-muted" };
  };

  const changeRole = async (userId: string, role: string) => {
    if (userId === profile?.id) { toast.error("You cannot change your own role."); return; }
    const target = users.find(u => u.id === userId);
    if (target?.role === "admin") { toast.error("Cannot change another admin's role."); return; }
    await supabase.from("profiles").update({ role }).eq("id", userId);
    setUsers(u => u.map(p => p.id === userId ? { ...p, role: role as any } : p));
    toast.success("Role updated");
  };

  const approveHackathon = async (id: string, approved: boolean) => {
    const { error } = await supabase.from("hackathons")
      .update({ is_approved: approved, status: approved ? "upcoming" : "suspended" })
      .eq("id", id);
    if (error) { toast.error("Failed: " + error.message); return; }
    setHackathons(h => h.map(hk => hk.id === id
      ? { ...hk, is_approved: approved, status: approved ? "upcoming" : "suspended" } : hk));
    toast.success(approved ? "Hackathon approved! 🎉" : "Hackathon suspended.");
  };

  const postAnnouncement = async () => {
    if (!announcement.title || !announcement.content) return toast.error("Fill all fields");
    setPosting(true);
    // Use profile id directly — avoids AbortError from second getUser call
    if (!profile?.id) { setPosting(false); return; }
    await supabase.from("announcements").insert({ admin_id: profile.id, ...announcement, is_active: true });
    setAnnouncement({ title: "", content: "", type: "info" });
    toast.success("Announcement posted!");
    setPosting(false);
  };

  const filteredUsers = users.filter(u =>
    u.role !== "organizer" &&
    !approvedMentorEmails.has(u.email) &&
    (!userSearch || u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()))
  );

  // Deduplicate organizers
  const seenOrgIds = new Set<string>();
  const uniqueOrganizers = users.filter(u => u.role === "organizer").filter(u => {
    if (seenOrgIds.has(u.id)) return false; seenOrgIds.add(u.id); return true;
  });
  const pendingOrganizers = uniqueOrganizers.filter(u =>
    !(u as any).organizer_status || (u as any).organizer_status === "pending"
  );

  const handleOrganizerAction = async (organizerId: string, action: "approve" | "reject", reason?: string) => {
    setActionLoading(organizerId);
    try {
      const res = await fetch("/api/organizer-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizerId, action, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(prev => prev.map(u => u.id === organizerId
        ? { ...u, organizer_status: action === "approve" ? "approved" : "rejected" } as any : u));
      toast.success(data.message);
      setRejectModal(null);
      setRejectReason("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMentorAction = async (appId: string, action: "approve" | "reject", reason?: string) => {
    setMentorActionLoading(appId);
    try {
      const res = await fetch("/api/mentor-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId, action, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMentorApps(prev => prev.map(a => a.id === appId
        ? { ...a, status: action === "approve" ? "approved" : "rejected" } : a));
      toast.success(data.message);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setMentorActionLoading(null);
    }
  };

  const TABS: { id: AdminTab; label: string; icon: any; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: BarChart2 },
    { id: "users", label: `Users (${users.filter(u => u.role !== "organizer" && !approvedMentorEmails.has(u.email)).length})`, icon: Users },
    { id: "organizers", label: `Organizers (${uniqueOrganizers.length})`, icon: Building2, badge: pendingOrganizers.length },
    { id: "hackathons", label: `Hackathons (${hackathons.length})`, icon: Trophy },
    { id: "mentors", label: "Mentors", icon: Star, badge: mentorApps.filter(a => a.status === "pending").length },
    { id: "security", label: `Security (${securityLogs.length})`, icon: Shield },
    { id: "announcements", label: "Announce", icon: Megaphone },
  ];

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Loader2 size={32} className="text-accent animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />
      <div className="pt-20 px-4 md:px-6 pb-12 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mt-6 mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent2/10 flex items-center justify-center">
            <Shield size={24} className="text-accent2" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Admin Control Center</h1>
            <p className="text-muted text-sm">Platform management · {profile?.full_name}</p>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard icon={Users} label="Total Users" value={countedUsers.length} color="text-accent" trend={userTrend} sub={`${countedUsers.filter(u => !u.is_banned).length} active`} />
          <KPICard icon={Trophy} label="Hackathons" value={hackathons.length} color="text-accent3" sub={`${hackathons.filter(h => h.status === "active").length} active now`} />
          <KPICard icon={Code2} label="Submissions" value={submissions.length} color="text-accent2" trend={acceptRate} sub={acceptRate !== null ? `${acceptRate}% accepted` : undefined} />
          <KPICard icon={AlertTriangle} label="Security Alerts" value={securityLogs.length} color="text-red-400" sub={`${securityLogs.filter(l => l.severity === "high").length} high severity`} />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all relative ${tab === t.id ? "bg-accent text-bg" : "glass text-muted hover:text-text"}`}>
              <t.icon size={14} /> {t.label}
              {t.badge && t.badge > 0 ? (
                <span className="ml-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">{t.badge}</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* === OVERVIEW TAB === */}
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="glass rounded-2xl p-6">
                <h2 className="font-display font-semibold mb-5 flex items-center gap-2">
                  <Users size={16} className="text-accent" /> New Users (7 days)
                </h2>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={userGrowth} margin={{ left: -20 }}>
                    <defs>
                      <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#f1f5f9" }} />
                    <Area type="monotone" dataKey="count" stroke="#00e5ff" strokeWidth={2} fill="url(#userGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="glass rounded-2xl p-6">
                <h2 className="font-display font-semibold mb-5 flex items-center gap-2">
                  <Activity size={16} className="text-accent2" /> Submission Trend
                </h2>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={submissionTrend} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#f1f5f9" }} />
                    <Line type="monotone" dataKey="total" stroke="#7c3aed" strokeWidth={2} dot={false} name="Total" />
                    <Line type="monotone" dataKey="accepted" stroke="#10b981" strokeWidth={2} dot={false} name="Accepted" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="glass rounded-2xl p-6">
                <h2 className="font-display font-semibold mb-5 flex items-center gap-2"><Trophy size={16} className="text-accent3" /> Hackathon Status</h2>
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={140}>
                    <PieChart>
                      <Pie data={hackathonsByStatus} innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                        {hackathonsByStatus.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3 flex-1">
                    {hackathonsByStatus.map(d => (
                      <div key={d.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: d.fill }} /><span className="text-muted">{d.name}</span></div>
                        <span className="font-mono font-medium">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="glass rounded-2xl p-6">
                <h2 className="font-display font-semibold mb-5 flex items-center gap-2"><Users size={16} className="text-accent" /> User Role Distribution</h2>
                <div className="space-y-4">
                  {roleBreakdown.map(r => (
                    <div key={r.name}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted">{r.name}</span>
                        <span className="font-mono">{r.value} ({users.length > 0 ? Math.round((r.value / users.length) * 100) : 0}%)</span>
                      </div>
                      <div className="h-2 bg-surface rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${users.length > 0 ? (r.value / users.length) * 100 : 0}%`, background: r.fill }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === USERS TAB === */}
        {tab === "users" && (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <Search size={16} className="text-muted" />
              <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                className="bg-transparent text-sm focus:outline-none flex-1" placeholder="Search by name or email..." />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted text-xs uppercase tracking-wider border-b border-border">
                    <th className="text-left p-4">User</th>
                    <th className="text-left p-4">Role</th>
                    <th className="text-left p-4 hidden md:table-cell">Points</th>
                    <th className="text-left p-4 hidden lg:table-cell">Joined</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className={`hover:bg-white/2 transition-colors ${u.is_banned ? "opacity-40" : ""}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-xs font-bold text-bg shrink-0">
                            {u.full_name?.[0]}
                          </div>
                          <div>
                            <div className="font-medium leading-tight">{u.full_name}</div>
                            <div className="text-muted text-xs">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {u.id === profile?.id ? (
                          <span className="text-xs px-2 py-1 rounded-full border border-accent2/40 text-accent2">Admin (you)</span>
                        ) : (
                          <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-full border bg-transparent cursor-pointer ${u.role === "admin" ? "border-accent2/40 text-accent2" : u.role === "organizer" ? "border-accent3/40 text-accent3" : "border-accent/40 text-accent"}`}>
                            <option value="participant">Participant</option>
                            <option value="organizer">Organizer</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </td>
                      <td className="p-4 font-mono text-muted hidden md:table-cell">{u.total_points}</td>
                      <td className="p-4 text-muted text-xs hidden lg:table-cell">{u.created_at ? format(new Date(u.created_at), "MMM d, yyyy") : "—"}</td>
                      <td className="p-4">
                        {u.is_banned
                          ? <span className="text-red-400 text-xs flex items-center gap-1"><XCircle size={10} /> Banned</span>
                          : <span className="text-green-400 text-xs flex items-center gap-1"><CheckCircle2 size={10} /> Active</span>}
                      </td>
                      <td className="p-4">
                        {u.id !== profile?.id && (
                          <button onClick={() => toggleBan(u.id, u.is_banned)}
                            className={`text-xs px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ml-auto ${u.is_banned ? "text-green-400 hover:bg-green-500/10" : "text-red-400 hover:bg-red-500/10"}`}>
                            <Ban size={10} /> {u.is_banned ? "Unban" : "Ban"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* === ORGANIZERS TAB === */}
        {tab === "organizers" && (
          <div className="space-y-6">
            <div className="glass rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-white/5 flex items-center gap-3">
                <Clock size={16} className="text-amber-400" />
                <h2 className="font-display font-semibold">Pending Organizer Applications</h2>
                {pendingOrganizers.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-xs font-bold">{pendingOrganizers.length} pending</span>
                )}
              </div>
              {pendingOrganizers.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle2 size={36} className="text-green-400/30 mx-auto mb-3" />
                  <p className="text-muted text-sm">No pending applications — all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {pendingOrganizers.map(org => (
                    <div key={org.id} className="p-5 hover:bg-white/2 transition-colors">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-amber-400 shrink-0">
                            {org.full_name?.[0] || "?"}
                          </div>
                          <div className="space-y-1">
                            <div className="font-semibold">{org.full_name}</div>
                            <div className="text-muted text-xs">{org.email}</div>
                            {(org as any).organization && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <Building2 size={11} className="text-accent3" />
                                <span className="text-accent3 font-medium">{(org as any).organization}</span>
                                {(org as any).org_type && <span className="text-muted capitalize">· {(org as any).org_type}</span>}
                              </div>
                            )}
                            {(org as any).designation && <div className="text-xs text-muted">{(org as any).designation}</div>}
                            {(org as any).phone && <div className="text-xs text-muted">📞 {(org as any).phone}</div>}
                            {(org as any).org_website && (
                              <a href={(org as any).org_website} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline block">{(org as any).org_website}</a>
                            )}
                            {(org as any).why_organize && (
                              <div className="mt-2 p-3 bg-surface rounded-xl border border-border max-w-lg">
                                <p className="text-xs text-muted leading-relaxed">
                                  <span className="text-text font-semibold block mb-1">Why they want to organize:</span>
                                  {(org as any).why_organize}
                                </p>
                              </div>
                            )}
                            <div className="text-xs text-muted">Applied {org.created_at ? format(new Date(org.created_at), "MMM d, yyyy 'at' h:mm a") : "—"}</div>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => handleOrganizerAction(org.id, "approve")} disabled={actionLoading === org.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/25 text-green-400 hover:bg-green-500/20 text-xs font-semibold transition-all disabled:opacity-40">
                            {actionLoading === org.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Approve
                          </button>
                          <button onClick={() => setRejectModal({ id: org.id, name: org.full_name })} disabled={actionLoading === org.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all disabled:opacity-40">
                            <XCircle size={12} /> Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-white/5">
                <h2 className="font-display font-semibold flex items-center gap-2"><Building2 size={16} className="text-accent3" /> All Organizers</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-muted text-xs uppercase tracking-wider border-b border-border">
                    <th className="text-left p-4">Name</th><th className="text-left p-4">Organization</th>
                    <th className="text-left p-4">Status</th><th className="text-left p-4 hidden md:table-cell">Applied</th>
                    <th className="text-right p-4">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border/50">
                    {uniqueOrganizers.map(org => (
                      <tr key={org.id} className="hover:bg-white/2 transition-colors">
                        <td className="p-4"><div className="font-medium">{org.full_name}</div><div className="text-muted text-xs">{org.email}</div></td>
                        <td className="p-4 text-muted text-xs">{(org as any).organization || "—"}</td>
                        <td className="p-4">
                          {(org as any).organizer_status === "approved"
                            ? <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 size={10} /> Approved</span>
                            : (org as any).organizer_status === "pending" || !(org as any).organizer_status
                            ? <span className="text-xs text-amber-400 flex items-center gap-1"><Clock size={10} /> Pending</span>
                            : <span className="text-xs text-red-400 flex items-center gap-1"><XCircle size={10} /> Rejected</span>}
                        </td>
                        <td className="p-4 text-muted text-xs hidden md:table-cell">{org.created_at ? format(new Date(org.created_at), "MMM d, yyyy") : "—"}</td>
                        <td className="p-4"><div className="flex justify-end gap-2">
                          {(org as any).organizer_status !== "approved" && (
                            <button onClick={() => handleOrganizerAction(org.id, "approve")} disabled={actionLoading === org.id}
                              className="text-green-400 hover:bg-green-500/10 text-xs px-2 py-1 rounded-lg transition-colors disabled:opacity-40">Approve</button>
                          )}
                          {(org as any).organizer_status !== "rejected" && (
                            <button onClick={() => setRejectModal({ id: org.id, name: org.full_name })} disabled={actionLoading === org.id}
                              className="text-red-400 hover:bg-red-500/10 text-xs px-2 py-1 rounded-lg transition-colors disabled:opacity-40">Reject</button>
                          )}
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* === HACKATHONS TAB === */}
        {tab === "hackathons" && (
          <div className="space-y-3">
            {hackathons.length === 0 && (
              <div className="glass rounded-2xl p-12 text-center">
                <Trophy size={36} className="text-muted/30 mx-auto mb-3" />
                <p className="text-muted text-sm">No submitted hackathons yet</p>
              </div>
            )}
            {hackathons.map(h => (
              <div key={h.id} className="glass rounded-2xl overflow-hidden">
                <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/2 transition-colors"
                  onClick={() => setExpandedHackathon(expandedHackathon === h.id ? null : h.id)}>
                  <ChevronRight size={14} className={`text-muted shrink-0 transition-transform ${expandedHackathon === h.id ? "rotate-90" : ""}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{h.title}</div>
                    <div className="text-muted text-xs mt-0.5 flex flex-wrap gap-1">
                      {h.tags?.slice(0,3).map(t => <span key={t} className="px-1.5 py-0.5 bg-surface rounded">{t}</span>)}
                    </div>
                  </div>
                  <div className="hidden md:block text-xs text-muted shrink-0">
                    by <span className="text-text">{(h as any).profiles?.organization || (h as any).profiles?.full_name}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full badge-${h.status} shrink-0`}>{h.status}</span>
                  <div className="text-xs text-muted shrink-0 hidden lg:block">
                    {format(new Date(h.start_time), "MMM d")} → {format(new Date(h.end_time), "MMM d, yyyy")}
                  </div>
                  <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    {h.status === "ended" ? (
                      <span className="text-xs text-muted px-3 py-1.5 border border-border rounded-lg">Ended</span>
                    ) : !h.is_approved ? (
                      <button onClick={() => approveHackathon(h.id, true)}
                        className="text-green-400 hover:bg-green-500/10 border border-green-500/25 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors font-medium">
                        <CheckCircle2 size={11} /> Approve
                      </button>
                    ) : (
                      <button onClick={() => approveHackathon(h.id, false)}
                        className="text-red-400 hover:bg-red-500/10 border border-red-500/25 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors font-medium">
                        <XCircle size={11} /> Suspend
                      </button>
                    )}
                  </div>
                </div>
                {expandedHackathon === h.id && (
                  <div className="border-t border-white/5 p-5 bg-surface/30 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="glass rounded-xl p-3 text-center">
                        <div className="text-lg font-bold text-accent">{h.participant_count}</div>
                        <div className="text-xs text-muted mt-0.5">Participants</div>
                      </div>
                      <div className="glass rounded-xl p-3 text-center">
                        <div className="text-lg font-bold text-accent3">{h.max_participants || "∞"}</div>
                        <div className="text-xs text-muted mt-0.5">Max Capacity</div>
                      </div>
                      <div className="glass rounded-xl p-3 text-center">
                        <div className="text-lg font-bold text-accent2">{h.registration_fee > 0 ? `PKR ${h.registration_fee}` : "Free"}</div>
                        <div className="text-xs text-muted mt-0.5">Entry Fee</div>
                      </div>
                      <div className="glass rounded-xl p-3 text-center">
                        <div className="text-lg font-bold text-text">{h.allow_teams ? `Teams (≤${h.max_team_size})` : "Solo"}</div>
                        <div className="text-xs text-muted mt-0.5">Format</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Description</div>
                      <p className="text-sm text-muted leading-relaxed">{h.description || "No description provided."}</p>
                    </div>
                    {h.prize_details && (
                      <div>
                        <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Prizes</div>
                        <p className="text-sm text-accent3 leading-relaxed">{h.prize_details}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs text-muted">
                      <span>🌐 Languages: <span className="text-text">{h.allowed_languages?.join(", ")}</span></span>
                      <span>📊 Scoring: <span className="text-text">{h.scoring_method?.replace(/_/g," ")}</span></span>
                      {h.penalty_per_wrong > 0 && <span>⚠️ Penalty: <span className="text-red-400">-{h.penalty_per_wrong} per wrong</span></span>}
                    </div>
                    <div className="flex justify-end pt-2">
                      <a href={`/hackathons/${h.id}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline flex items-center gap-1">View public page ↗</a>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* === MENTORS TAB === */}
        {tab === "mentors" && (
          <div className="space-y-6">
            <div className="glass rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-white/5 flex items-center gap-3">
                <Star size={16} className="text-accent3" />
                <h2 className="font-display font-semibold">Mentor Applications</h2>
                {mentorApps.filter(a => a.status === "pending").length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold">
                    {mentorApps.filter(a => a.status === "pending").length} pending
                  </span>
                )}
              </div>
              {mentorApps.length === 0 ? (
                <div className="p-12 text-center">
                  <Star size={36} className="text-muted/30 mx-auto mb-3" />
                  <p className="text-muted text-sm">No mentor applications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {mentorApps.map(app => (
                    <div key={app.id} className="p-5 hover:bg-white/2 transition-colors">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-accent3/10 border border-accent3/20 flex items-center justify-center font-bold text-accent3 shrink-0">
                            {app.full_name?.[0] || "?"}
                          </div>
                          <div className="space-y-1 min-w-0">
                            <div className="font-semibold">{app.full_name}</div>
                            <div className="text-muted text-xs">{app.email} {app.phone && `· 📞 ${app.phone}`}</div>
                            <div className="text-xs text-accent3">{app.current_role} @ {app.organization}</div>
                            <div className="text-xs text-muted">{app.years_experience} years experience · ~{app.availability_hours}h/week available</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(app.expertise || []).map((e: string) => (
                                <span key={e} className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">{e}</span>
                              ))}
                            </div>
                            {app.bio && (
                              <p className="text-xs text-muted mt-2 max-w-lg leading-relaxed">{app.bio}</p>
                            )}
                            {app.why_mentor && (
                              <div className="mt-2 p-3 bg-surface rounded-xl border border-border max-w-lg">
                                <span className="text-text font-semibold text-xs block mb-1">Why they want to mentor:</span>
                                <p className="text-xs text-muted leading-relaxed">{app.why_mentor}</p>
                              </div>
                            )}
                            <div className="flex gap-3 mt-1">
                              {app.linkedin_url && <a href={app.linkedin_url} target="_blank" rel="noopener" className="text-xs text-accent hover:underline">LinkedIn ↗</a>}
                              {app.github_url && <a href={app.github_url} target="_blank" rel="noopener" className="text-xs text-accent hover:underline">GitHub ↗</a>}
                            </div>
                            <div className="text-xs text-muted">Applied {app.created_at ? new Date(app.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : "—"}</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {app.status === "pending" ? (
                            <div className="flex gap-2">
                              <button onClick={() => handleMentorAction(app.id, "approve")} disabled={mentorActionLoading === app.id}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/25 text-green-400 hover:bg-green-500/20 text-xs font-semibold transition-all disabled:opacity-40">
                                {mentorActionLoading === app.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Approve
                              </button>
                              <button onClick={() => { setMentorRejectModal({ id: app.id, name: app.full_name }); setMentorRejectReason(""); }} disabled={mentorActionLoading === app.id}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all disabled:opacity-40">
                                <XCircle size={12} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${app.status === "approved" ? "bg-green-500/10 border-green-500/25 text-green-400" : "bg-red-500/10 border-red-500/25 text-red-400"}`}>
                              {app.status === "approved" ? "✓ Approved" : "✗ Rejected"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* === SECURITY TAB === */}
        {tab === "security" && (
          <div className="space-y-4">
            <div className="glass rounded-2xl p-6">
              <h2 className="font-display font-semibold mb-5 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-400" /> Security Violations
              </h2>
              {securityLogs.length === 0 ? (
                <p className="text-center text-muted py-10 text-sm">No violations logged ✓</p>
              ) : (
                <div className="divide-y divide-border/50">
                  {securityLogs.map(log => {
                    const sev = severityLabel(log.violation_type || "");
                    return (
                      <div key={log.id} className="flex items-center gap-4 py-3 hover:bg-white/2 transition-colors">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${sev.label === "High" ? "bg-red-500" : sev.label === "Medium" ? "bg-yellow-500" : "bg-blue-500"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{(log as any).profiles?.full_name || "Unknown User"}</div>
                          <div className="text-xs text-muted capitalize">{log.violation_type?.replace(/_/g," ")}</div>
                        </div>
                        <div className="text-xs text-muted shrink-0 hidden md:block">{log.created_at ? format(new Date(log.created_at), "MMM d, HH:mm") : "—"}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${sev.label === "High" ? "bg-red-500/15 text-red-400 border-red-500/20" : sev.label === "Medium" ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" : "bg-blue-500/15 text-blue-400 border-blue-500/20"}`}>
                          {sev.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* === ANNOUNCEMENTS TAB === */}
        {tab === "announcements" && (
          <div className="glass rounded-2xl p-8">
            <h2 className="font-display font-semibold text-lg mb-6 flex items-center gap-2">
              <Megaphone size={18} className="text-accent2" /> Post Platform Announcement
            </h2>
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="text-sm text-muted mb-2 block">Announcement Title</label>
                <input value={announcement.title} onChange={e => setAnnouncement(a => ({ ...a, title: e.target.value }))} className="input-glass" placeholder="Important: Scheduled maintenance..." />
              </div>
              <div>
                <label className="text-sm text-muted mb-2 block">Message</label>
                <textarea value={announcement.content} onChange={e => setAnnouncement(a => ({ ...a, content: e.target.value }))} rows={5} className="input-glass resize-none" placeholder="The platform will be undergoing maintenance on..." />
              </div>
              <div>
                <label className="text-sm text-muted mb-2 block">Type</label>
                <select value={announcement.type} onChange={e => setAnnouncement(a => ({ ...a, type: e.target.value }))} className="input-glass">
                  <option value="info">ℹ️ Info</option>
                  <option value="warning">⚠️ Warning</option>
                  <option value="success">✅ Success</option>
                  <option value="error">🚨 Critical</option>
                </select>
              </div>
              <button onClick={postAnnouncement} disabled={posting} className="btn-primary flex items-center gap-2">
                {posting ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
                {posting ? "Posting..." : "Post to All Users"}
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Mentor Reject Modal */}
      {mentorRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg">Reject Mentor Application</h3>
              <button onClick={() => setMentorRejectModal(null)} className="text-muted hover:text-text"><X size={18} /></button>
            </div>
            <p className="text-muted text-sm mb-4">
              Rejecting <span className="text-text font-semibold">{mentorRejectModal.name}</span>&apos;s mentor application. Please provide a reason:
            </p>
            <textarea
              value={mentorRejectReason}
              onChange={e => setMentorRejectReason(e.target.value)}
              placeholder="e.g. Insufficient experience for our current needs. Please reapply after gaining more industry experience..."
              className="input-glass resize-none w-full mb-4"
              rows={4}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (!mentorRejectReason.trim()) { toast.error("Please provide a rejection reason"); return; }
                  handleMentorAction(mentorRejectModal.id, "reject", mentorRejectReason);
                  setMentorRejectModal(null);
                }}
                disabled={mentorActionLoading === mentorRejectModal.id}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 text-sm font-semibold transition-all disabled:opacity-40">
                {mentorActionLoading === mentorRejectModal.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Confirm Reject
              </button>
              <button onClick={() => setMentorRejectModal(null)}
                className="flex-1 py-2.5 rounded-xl glass text-muted hover:text-text text-sm font-medium transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg">Reject Application</h3>
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }} className="text-muted hover:text-text transition-colors">
                <X size={18} />
              </button>
            </div>
            <p className="text-muted text-sm mb-4">
              Rejecting <span className="text-text font-semibold">{rejectModal.name}</span>&apos;s organizer application. Provide a reason:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Incomplete information provided. Please reapply with your organization's official email..."
              className="input-glass resize-none w-full mb-4"
              rows={4}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (!rejectReason.trim()) { toast.error("Please provide a rejection reason"); return; }
                  handleOrganizerAction(rejectModal.id, "reject", rejectReason);
                }}
                disabled={actionLoading === rejectModal.id}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 text-sm font-semibold transition-all disabled:opacity-40"
              >
                {actionLoading === rejectModal.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Confirm Reject
              </button>
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }}
                className="flex-1 py-2.5 rounded-xl glass text-muted hover:text-text text-sm font-medium transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}