"use client";

import { useEffect, useState } from "react";
import { safeGetUser } from "@/lib/supabase/getUser";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Users, UserPlus, Copy, CheckCircle2, Loader2,
  Crown, LogOut, ChevronLeft, Shield,
} from "lucide-react";

interface Team {
  id: string;
  hackathon_id: string;
  name: string;
  leader_id: string;
  invite_code: string;
  max_size: number;
  created_at: string;
}

interface TeamMemberWithProfile {
  id: string;
  team_id: string;
  user_id: string;
  joined_at: string;
  profiles: { full_name: string; email: string; university?: string; avatar_url?: string };
}

interface Hackathon {
  id: string;
  title: string;
  allow_teams: boolean;
  max_team_size: number;
  status: string;
}

export default function TeamsPage() {
  const params = useParams();
  const hackathonId = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithProfile[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<"my-team" | "create" | "join" | "browse">("my-team");

  useEffect(() => {
    async function load() {
      const user = await safeGetUser();
      if (!user) return router.push("/auth/signin");
      setUserId(user.id);

      const { data: hack } = await supabase
        .from("hackathons")
        .select("id, title, allow_teams, max_team_size, status")
        .eq("id", hackathonId)
        .single();

      if (!hack) { toast.error("Hackathon not found"); return router.push("/hackathons"); }
      if (!hack.allow_teams) { toast.error("This hackathon does not support teams"); return router.push(`/hackathons/${hackathonId}`); }
      setHackathon(hack);

      await loadTeamData(user.id);
    }
    load();
  }, [hackathonId]);

  const loadTeamData = async (uid: string) => {
    // Find if user is in any team for this hackathon
    const { data: membership } = await supabase
      .from("team_members")
      .select("team_id, teams(*)")
      .eq("user_id", uid)
      .eq("teams.hackathon_id", hackathonId)
      .maybeSingle();

    if (membership?.teams) {
      const team = membership.teams as unknown as Team;
      setMyTeam(team);

      // Load team members
      const { data: members } = await supabase
        .from("team_members")
        .select("*, profiles(full_name, email, university, avatar_url)")
        .eq("team_id", team.id);
      setTeamMembers((members || []) as TeamMemberWithProfile[]);
    }

    // Load all teams for browsing
    const { data: teams } = await supabase
      .from("teams")
      .select("*")
      .eq("hackathon_id", hackathonId)
      .order("created_at");
    setAllTeams(teams || []);
    setLoading(false);
  };

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !userId || creating) return;
    setCreating(true);
    try {
      const { data: team, error } = await supabase
        .from("teams")
        .insert({
          hackathon_id: hackathonId,
          name: teamName.trim(),
          leader_id: userId,
          max_size: hackathon?.max_team_size || 3,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as first member
      await supabase.from("team_members").insert({ team_id: team.id, user_id: userId });
      toast.success("Team created!");
      await loadTeamData(userId);
      setView("my-team");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      if (msg.includes("duplicate") || msg.includes("unique")) {
        toast.error("Team name already taken. Choose a different name.");
      } else {
        toast.error(msg);
      }
    } finally {
      setCreating(false);
    }
  };

  const joinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !userId || joining) return;
    setJoining(true);
    try {
      const { data: team, error: findErr } = await supabase
        .from("teams")
        .select("*")
        .eq("invite_code", inviteCode.trim().toLowerCase())
        .eq("hackathon_id", hackathonId)
        .single();

      if (findErr || !team) { toast.error("Invalid invite code"); return; }

      // Check capacity
      const { count } = await supabase
        .from("team_members")
        .select("*", { count: "exact", head: true })
        .eq("team_id", team.id);

      if (count !== null && count >= team.max_size) { toast.error("Team is full"); return; }

      const { error: joinErr } = await supabase
        .from("team_members")
        .insert({ team_id: team.id, user_id: userId });

      if (joinErr) {
        if (joinErr.message.includes("unique")) { toast.error("You are already in this team"); }
        else { throw joinErr; }
        return;
      }

      toast.success(`Joined team "${team.name}"!`);
      await loadTeamData(userId);
      setView("my-team");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setJoining(false);
    }
  };

  const leaveTeam = async () => {
    if (!myTeam || !userId) return;
    if (myTeam.leader_id === userId) {
      toast.error("Team leader cannot leave. Transfer leadership or disband the team first.");
      return;
    }
    const { error } = await supabase.from("team_members").delete().eq("team_id", myTeam.id).eq("user_id", userId);
    if (error) { toast.error("Failed to leave team"); return; }
    setMyTeam(null);
    setTeamMembers([]);
    toast.success("Left the team");
    await loadTeamData(userId);
  };

  const copyInviteCode = () => {
    if (!myTeam) return;
    navigator.clipboard.writeText(myTeam.invite_code);
    setCopied(true);
    toast.success("Invite code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Loader2 size={28} className="text-accent animate-spin" />
    </div>
  );

  if (!hackathon) return null;

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />
      <div className="pt-20 px-4 pb-12 max-w-3xl mx-auto">
        <div className="mt-6 mb-6">
          <Link href={`/hackathons/${hackathonId}`} className="flex items-center gap-1.5 text-muted hover:text-text text-sm mb-4 transition-colors">
            <ChevronLeft size={16} /> Back to {hackathon.title}
          </Link>
          <h1 className="font-display text-2xl font-bold mb-1">Team Management</h1>
          <p className="text-muted text-sm">Max {hackathon.max_team_size} members per team</p>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 mb-6">
          {(["my-team", "create", "join", "browse"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${view === v ? "bg-accent text-bg" : "glass text-muted hover:text-text"}`}>
              {v === "my-team" ? "My Team" : v === "create" ? "+ Create" : v === "join" ? "Join" : "Browse"}
            </button>
          ))}
        </div>

        {/* MY TEAM */}
        {view === "my-team" && (
          <div>
            {!myTeam ? (
              <div className="glass rounded-2xl p-12 text-center">
                <Users size={48} className="text-muted/20 mx-auto mb-4" />
                <h2 className="font-display font-bold text-xl mb-2">Not in a team yet</h2>
                <p className="text-muted text-sm mb-6">Create a new team or join one with an invite code</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setView("create")} className="btn-primary">Create Team</button>
                  <button onClick={() => setView("join")} className="btn-secondary">Join with Code</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="glass rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h2 className="font-display text-xl font-bold">{myTeam.name}</h2>
                      <p className="text-muted text-sm mt-1">{teamMembers.length}/{myTeam.max_size} members</p>
                    </div>
                    {myTeam.leader_id !== userId && (
                      <button onClick={leaveTeam} className="flex items-center gap-1.5 text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg text-xs transition-colors">
                        <LogOut size={13} /> Leave
                      </button>
                    )}
                  </div>

                  {/* Invite code */}
                  <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl mb-5">
                    <p className="text-xs text-muted mb-2">Share this invite code with teammates:</p>
                    <div className="flex items-center gap-3">
                      <code className="font-mono text-lg font-bold text-accent tracking-widest">{myTeam.invite_code}</code>
                      <button onClick={copyInviteCode} className="flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors">
                        {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Members */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Members</h3>
                    <div className="space-y-2">
                      {teamMembers.map(member => (
                        <div key={member.id} className="flex items-center gap-3 p-3 bg-surface rounded-xl">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-xs font-bold text-bg">
                            {member.profiles.full_name?.[0] || "?"}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{member.profiles.full_name}</div>
                            <div className="text-xs text-muted">{member.profiles.university || member.profiles.email}</div>
                          </div>
                          {myTeam.leader_id === member.user_id && (
                            <span className="flex items-center gap-1 text-xs text-amber-400">
                              <Crown size={12} /> Leader
                            </span>
                          )}
                          {member.user_id === userId && myTeam.leader_id !== userId && (
                            <span className="text-xs text-muted">(you)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CREATE TEAM */}
        {view === "create" && (
          <div className="glass rounded-2xl p-6">
            {myTeam ? (
              <div className="text-center py-8">
                <Shield size={36} className="text-amber-400/40 mx-auto mb-3" />
                <p className="text-muted">You are already in a team. Leave your current team first.</p>
              </div>
            ) : (
              <>
                <h2 className="font-display font-bold text-xl mb-5">Create New Team</h2>
                <form onSubmit={createTeam} className="space-y-4">
                  <div>
                    <label className="text-xs text-muted mb-1.5 block">Team Name *</label>
                    <input
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="input-glass"
                      placeholder="e.g. AlgoWizards, ByteForce, NullPointers..."
                      required maxLength={40}
                    />
                    <p className="text-xs text-muted mt-1">Up to {hackathon.max_team_size} members can join with your invite code</p>
                  </div>
                  <button type="submit" disabled={creating || !teamName.trim()} className="btn-primary w-full flex items-center justify-center gap-2">
                    {creating ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                    {creating ? "Creating..." : "Create Team"}
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {/* JOIN TEAM */}
        {view === "join" && (
          <div className="glass rounded-2xl p-6">
            {myTeam ? (
              <div className="text-center py-8">
                <Shield size={36} className="text-amber-400/40 mx-auto mb-3" />
                <p className="text-muted">You are already in a team. Leave your current team first.</p>
              </div>
            ) : (
              <>
                <h2 className="font-display font-bold text-xl mb-5">Join with Invite Code</h2>
                <form onSubmit={joinTeam} className="space-y-4">
                  <div>
                    <label className="text-xs text-muted mb-1.5 block">Invite Code *</label>
                    <input
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toLowerCase())}
                      className="input-glass font-mono tracking-widest text-center text-lg uppercase"
                      placeholder="8-char code"
                      required maxLength={8}
                    />
                    <p className="text-xs text-muted mt-1">Get the invite code from your team leader</p>
                  </div>
                  <button type="submit" disabled={joining || inviteCode.trim().length < 6} className="btn-primary w-full flex items-center justify-center gap-2">
                    {joining ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                    {joining ? "Joining..." : "Join Team"}
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {/* BROWSE TEAMS */}
        {view === "browse" && (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/5">
              <h2 className="font-display font-bold">All Teams ({allTeams.length})</h2>
            </div>
            {allTeams.length === 0 ? (
              <div className="p-12 text-center">
                <Users size={36} className="text-muted/20 mx-auto mb-3" />
                <p className="text-muted text-sm">No teams yet — be the first to create one!</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {allTeams.map(team => (
                  <div key={team.id} className="p-4 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-accent2/10 flex items-center justify-center text-sm font-bold text-accent2">
                      {team.name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{team.name}</div>
                      <div className="text-xs text-muted">Max {team.max_size} members</div>
                    </div>
                    {myTeam?.id === team.id && (
                      <span className="text-xs text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">Your team</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}