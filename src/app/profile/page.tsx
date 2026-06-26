"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { safeGetUser } from "@/lib/supabase/getUser";
import toast from "react-hot-toast";
import { User, Code2, Trophy, Star, Edit2, Save, Loader2, Github, Linkedin, Shield, Eye, EyeOff, Check, X, Lock, CheckCircle2, ShieldCheck } from "lucide-react";
import type { Profile } from "@/types";

// ─── Password strength helpers ───────────────────────────────────────────────
const PW_RULES = [
  { id: "len", label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { id: "upper", label: "One uppercase letter (A–Z)", test: (v: string) => /[A-Z]/.test(v) },
  { id: "lower", label: "One lowercase letter (a–z)", test: (v: string) => /[a-z]/.test(v) },
  { id: "digit", label: "One digit (0–9)", test: (v: string) => /[0-9]/.test(v) },
  { id: "special", label: "One special character (!@#$…)", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

function strengthScore(pw: string) { return PW_RULES.filter(r => r.test(pw)).length; }
function strengthLabel(s: number) {
  if (s <= 1) return { label: "Very Weak", color: "bg-red-500", width: "w-1/5" };
  if (s === 2) return { label: "Weak", color: "bg-orange-500", width: "w-2/5" };
  if (s === 3) return { label: "Fair", color: "bg-yellow-500", width: "w-3/5" };
  if (s === 4) return { label: "Strong", color: "bg-blue-500", width: "w-4/5" };
  return { label: "Very Strong", color: "bg-green-500", width: "w-full" };
}

// ─── Eye-toggle password input ────────────────────────────────────────────────
function PwInput({ value, onChange, placeholder, id, disabled, blockPaste }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; id: string;
  disabled?: boolean; blockPaste?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        onPaste={blockPaste ? e => { e.preventDefault(); toast.error("Paste is disabled — please type your password manually."); } : undefined}
        className={`input-glass pr-10 w-full transition-all duration-200 ${disabled ? "opacity-40 cursor-not-allowed bg-surface/20" : ""
          }`}
        placeholder={placeholder}
        autoComplete="new-password"
        disabled={disabled}
      />
      {!disabled && (
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
      {disabled && (
        <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted/30" />
      )}
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", bio: "", university: "", organization: "", github_url: "", linkedin_url: "" });

  // Password form state
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [changingPw, setChangingPw] = useState(false);
  const [pwTouched, setPwTouched] = useState(false);
  // Verify-before-unlock flow
  const [verifyingPw, setVerifyingPw] = useState(false);
  const [currentVerified, setCurrentVerified] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    safeGetUser().then(async (user) => {
      if (!user) return router.push("/auth/signin");
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setProfile(data);
        setForm({ full_name: data.full_name || "", bio: data.bio || "", university: data.university || "", organization: data.organization || "", github_url: data.github_url || "", linkedin_url: data.linkedin_url || "" });
      }
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", profile!.id);
    if (error) toast.error("Failed to save");
    else { toast.success("Profile updated!"); setProfile(p => p ? { ...p, ...form } : p); setEditing(false); }
    setSaving(false);
  };

  // Step 1 — Verify current password before unlocking new/confirm fields
  const verifyCurrentPassword = async () => {
    if (!pwForm.current.trim()) return toast.error("Enter your current password first.");
    setVerifyingPw(true);
    try {
      const user = await safeGetUser();
      if (!user?.email) throw new Error("Session expired. Please sign in again.");
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: pwForm.current,
      });
      if (error) {
        setCurrentVerified(false);
        toast.error("Incorrect current password. Please try again.");
      } else {
        setCurrentVerified(true);
        toast.success("Identity verified! You can now set a new password.", { icon: "🔓" });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setVerifyingPw(false);
    }
  };

  // Step 2 — Update password (identity already verified above)
  const handlePasswordChange = async () => {
    const { next, confirm } = pwForm;
    const score = strengthScore(next);

    if (!currentVerified)
      return toast.error("Please verify your current password first.");
    if (!next)
      return toast.error("Please enter a new password.");
    if (score < 5) {
      const failed = PW_RULES.filter(r => !r.test(next)).map(r => r.label);
      return toast.error(`Password requirements not met:\n• ${failed.join("\n• ")}`, { duration: 5000 });
    }
    if (next === pwForm.current)
      return toast.error("New password must be different from your current password.");
    if (next !== confirm)
      return toast.error("New password and confirmation do not match.");

    setChangingPw(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password: next });
      if (updateErr) throw updateErr;
      toast.success("Password updated successfully! 🔒");
      setPwForm({ current: "", next: "", confirm: "" });
      setPwTouched(false);
      setCurrentVerified(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setChangingPw(false);
    }
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

  // Live derived state for real-time UI feedback
  const score = strengthScore(pwForm.next);
  const strength = strengthLabel(score);
  const allRules = PW_RULES.map(r => ({ ...r, passed: r.test(pwForm.next) }));
  const sameAsCurrent = pwTouched && pwForm.next.length > 0 && pwForm.next === pwForm.current;
  const confirmMismatch = pwTouched && pwForm.confirm.length > 0 && pwForm.next !== pwForm.confirm;
  const confirmMatch = pwTouched && pwForm.confirm.length > 0 && pwForm.next === pwForm.confirm;
  const canSubmit = currentVerified && !changingPw && !sameAsCurrent && !(pwTouched && confirmMismatch);

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
            <p className="text-muted text-sm mt-0.5 capitalize">
              {profile.role}
              {profile.university ? ` · ${profile.university}` : ""}
              {profile.organization ? ` · ${profile.organization}` : ""}
            </p>
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
                <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="input-glass" />
              </div>
              <div>
                <label className="text-sm text-muted mb-2 block">Bio</label>
                <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} className="input-glass resize-none" placeholder="Tell others about yourself..." />
              </div>
              {profile.role === "participant" && (
                <div>
                  <label className="text-sm text-muted mb-2 block">University</label>
                  <input value={form.university} onChange={e => setForm(f => ({ ...f, university: e.target.value }))} className="input-glass" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted mb-2 block">GitHub URL</label>
                  <input value={form.github_url} onChange={e => setForm(f => ({ ...f, github_url: e.target.value }))} className="input-glass" placeholder="https://github.com/..." />
                </div>
                <div>
                  <label className="text-sm text-muted mb-2 block">LinkedIn URL</label>
                  <input value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))} className="input-glass" placeholder="https://linkedin.com/in/..." />
                </div>
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* ── Change Password ──────────────────────────────────────────────── */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
              <Lock size={16} className="text-accent" />
            </div>
            <div>
              <h2 className="font-display font-semibold">Change Password</h2>
              <p className="text-xs text-muted mt-0.5">Verify your identity first, then set a new password.</p>
            </div>
          </div>

          {/* Security notice */}
          <div className="mt-4 mb-5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
            <Shield size={13} className="shrink-0 mt-0.5" />
            <span>For your security, verify your current password before making any changes. New and confirm fields unlock only after successful verification.</span>
          </div>

          <div className="space-y-5 max-w-sm">

            {/* ── Step 1: Current password + Verify ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="pw-current" className="text-sm text-muted">
                  Current Password <span className="text-red-400">*</span>
                </label>
                {currentVerified && (
                  <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                    <ShieldCheck size={13} /> Identity Verified
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <div className={`flex-1 transition-all duration-200 ${currentVerified ? "opacity-60 pointer-events-none" : ""}`}>
                  <PwInput
                    id="pw-current"
                    value={pwForm.current}
                    onChange={v => {
                      // Re-lock the lower fields if user edits current password after verifying
                      if (currentVerified) {
                        setCurrentVerified(false);
                        setPwForm({ current: v, next: "", confirm: "" });
                        setPwTouched(false);
                      } else {
                        setPwForm(f => ({ ...f, current: v }));
                      }
                    }}
                    placeholder="Enter your current password"
                    disabled={currentVerified}
                  />
                </div>
                {!currentVerified ? (
                  <button
                    type="button"
                    onClick={verifyCurrentPassword}
                    disabled={verifyingPw || !pwForm.current.trim()}
                    className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                  >
                    {verifyingPw
                      ? <><Loader2 size={13} className="animate-spin" /> Checking…</>
                      : <><ShieldCheck size={13} /> Verify</>}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentVerified(false);
                      setPwForm({ current: "", next: "", confirm: "" });
                      setPwTouched(false);
                    }}
                    className="shrink-0 px-3 py-2.5 rounded-xl text-xs text-muted border border-border hover:text-text hover:border-border/80 transition-all"
                  >
                    Change
                  </button>
                )}
              </div>
              {currentVerified && (
                <p className="text-xs text-green-400/80 mt-1.5 flex items-center gap-1">
                  <CheckCircle2 size={11} /> Current password confirmed. You may now set a new password below.
                </p>
              )}
            </div>

            {/* ── Divider with unlock indicator ── */}
            <div className="relative flex items-center gap-3">
              <div className="flex-1 border-t border-border/50" />
              <span className={`text-xs px-2 py-0.5 rounded-full border transition-all duration-300 shrink-0 ${currentVerified
                  ? "text-green-400 border-green-500/30 bg-green-500/10"
                  : "text-muted/40 border-border/40"
                }`}>
                {currentVerified ? "🔓 Unlocked" : "🔒 Locked"}
              </span>
              <div className="flex-1 border-t border-border/50" />
            </div>

            {/* ── Step 2: New password (disabled until verified) ── */}
            <div className={`transition-all duration-300 ${!currentVerified ? "opacity-50 select-none" : ""}`}>
              <label htmlFor="pw-next" className="text-sm text-muted mb-2 block">
                New Password <span className="text-red-400">*</span>
                {!currentVerified && <span className="ml-2 text-xs text-muted/40">(verify identity first)</span>}
              </label>
              <PwInput
                id="pw-next"
                value={pwForm.next}
                onChange={v => { setPwTouched(true); setPwForm(f => ({ ...f, next: v })); }}
                placeholder="Min. 8 chars · uppercase · digit · symbol"
                disabled={!currentVerified}
              />

              {/* Same-as-current warning */}
              {sameAsCurrent && (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1.5">
                  <X size={11} className="shrink-0" />
                  New password must differ from your current password.
                </p>
              )}

              {/* Strength meter + checklist */}
              {currentVerified && pwForm.next.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted">Strength</span>
                    <span className={`font-semibold ${score === 5 ? "text-green-400" : score >= 3 ? "text-yellow-400" : "text-red-400"}`}>
                      {strength.label}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-border rounded-full overflow-hidden mb-3">
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                  </div>
                  {/* Requirements checklist */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-surface/40 border border-border/50">
                    {allRules.map(r => (
                      <div key={r.id} className={`flex items-center gap-2 text-xs transition-colors duration-200 ${r.passed ? "text-green-400" : "text-muted/60"}`}>
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${r.passed ? "bg-green-500/20" : "bg-border/50"}`}>
                          {r.passed ? <Check size={9} /> : <X size={9} className="text-muted/40" />}
                        </span>
                        {r.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Step 3: Confirm password (disabled until verified, paste blocked) ── */}
            <div className={`transition-all duration-300 ${!currentVerified ? "opacity-50 select-none" : ""}`}>
              <label htmlFor="pw-confirm" className="text-sm text-muted mb-2 flex items-center gap-2">
                Confirm New Password <span className="text-red-400">*</span>
                {currentVerified && (
                  <span className="text-xs text-muted/50 font-normal">(typing only — paste disabled)</span>
                )}
              </label>
              <PwInput
                id="pw-confirm"
                value={pwForm.confirm}
                onChange={v => { setPwTouched(true); setPwForm(f => ({ ...f, confirm: v })); }}
                placeholder="Type your new password again"
                disabled={!currentVerified}
                blockPaste={true}
              />
              {confirmMismatch && (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1.5">
                  <X size={11} className="shrink-0" /> Passwords do not match.
                </p>
              )}
              {confirmMatch && (
                <p className="text-xs text-green-400 mt-1.5 flex items-center gap-1.5">
                  <Check size={11} className="shrink-0" /> Passwords match.
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handlePasswordChange}
              disabled={!canSubmit}
              className="btn-primary flex items-center gap-2 w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {changingPw
                ? <><Loader2 size={16} className="animate-spin" /> Updating Password…</>
                : <><Lock size={16} /> Update Password</>}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
