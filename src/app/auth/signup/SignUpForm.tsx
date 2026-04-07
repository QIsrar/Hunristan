"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import {
  Eye, EyeOff, UserPlus, Loader2, GraduationCap,
  Building2, ChevronRight, CheckCircle2, Clock
} from "lucide-react";
import type { Role } from "@/types";

export default function SignUpForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1); // 1=role select, 2=details, 3=done
  const [role, setRole] = useState<Role>((searchParams.get("role") as Role) || "participant");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Shared
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  // Participant-specific
  const [university, setUniversity] = useState("");
  const [degreeProgram, setDegreeProgram] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("beginner");
  const [githubUrl, setGithubUrl] = useState("");

  // Organizer-specific
  const [organization, setOrganization] = useState("");
  const [orgType, setOrgType] = useState("university");
  const [designation, setDesignation] = useState("");
  const [orgWebsite, setOrgWebsite] = useState("");
  const [whyOrganize, setWhyOrganize] = useState("");

  const strengthLevel = password.length >= 12 ? 3 : password.length >= 8 ? 2 : password.length >= 1 ? 1 : 0;
  const strengthLabels = ["", "Weak", "Fair", "Strong"];
  const strengthColors = ["bg-border", "bg-red-500", "bg-yellow-500", "bg-green-500"];

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (phone && phone.length !== 11) return toast.error("Phone number must be exactly 11 digits (e.g. 03001234567)");
    if (role === "organizer" && !whyOrganize.trim()) return toast.error("Please explain why you want to organize hackathons");
    setLoading(true);
    try {
      const meta: Record<string, string | number | undefined> = {
        full_name: fullName,
        role,
        phone: phone || undefined,
      };
      if (role === "participant") {
        Object.assign(meta, {
          university,
          degree_program: degreeProgram || undefined,
          graduation_year: graduationYear ? parseInt(graduationYear) : undefined,
          experience_level: experienceLevel,
          github_url: githubUrl || undefined,
        });
      } else {
        Object.assign(meta, {
          organization,
          org_type: orgType,
          designation: designation || undefined,
          org_website: orgWebsite || undefined,
          organizer_status: "pending",
          why_organize: whyOrganize,
        });
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: meta },
      });
      if (error) throw error;

      // Update profile with any extra fields not captured in trigger
      const userId = data.user?.id;
      if (userId) {
        const updateData: Record<string, string | number | undefined> = {};
        if (role === "participant" && githubUrl) updateData.github_url = githubUrl;
        if (role === "organizer") {
          updateData.organizer_status = "pending";
          if (orgWebsite) updateData.org_website = orgWebsite;
          updateData.why_organize = whyOrganize;
        }
        if (Object.keys(updateData).length > 0) {
          await supabase.from("profiles").update(updateData).eq("id", userId);
        }

        // Send verification email
        try {
          await fetch("/api/send-verification-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              email,
              fullName,
            }),
          });
        } catch (emailError) {
          console.error("Failed to send verification email:", emailError);
          toast.error("Account created, but verification email failed. Please request it again later.");
        }
      }

      setStep(3);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign up failed";
      if (msg.includes("already registered") || msg.includes("already been registered")) {
        toast.error("This email is already registered. Please sign in instead.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // === STEP 1: Role selection ===
  if (step === 1) {
    return (
      <div className="glass rounded-2xl p-8 animate-slide-up">
        <h1 className="font-display text-2xl font-bold mb-1">Create Account</h1>
        <p className="text-muted text-sm mb-8">Who are you joining as?</p>
        <div className="grid grid-cols-1 gap-4 mb-8">
          {([
            {
              value: "participant" as Role,
              icon: GraduationCap,
              label: "Participant",
              desc: "Compete in hackathons, solve problems, earn badges, climb leaderboards",
              note: "Instant access",
              noteColor: "text-green-400",
            },
            {
              value: "organizer" as Role,
              icon: Building2,
              label: "Organizer",
              desc: "Create and manage hackathons for your university, company or community",
              note: "Requires admin approval",
              noteColor: "text-amber-400",
            },
          ] as const).map(r => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={`p-5 rounded-xl border text-left transition-all ${
                role === r.value
                  ? "border-accent bg-accent/10"
                  : "border-border bg-surface/50 hover:border-accent/40"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  role === r.value ? "bg-accent/20" : "bg-surface"
                }`}>
                  <r.icon size={20} className={role === r.value ? "text-accent" : "text-muted"} />
                </div>
                <div className="flex-1">
                  <div className="font-display font-semibold">{r.label}</div>
                  <div className="text-muted text-xs mt-1 leading-relaxed">{r.desc}</div>
                  <div className={`text-xs mt-2 font-medium ${r.noteColor}`}>{r.note}</div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  role === r.value ? "border-accent" : "border-border"
                }`}>
                  {role === r.value && <div className="w-2.5 h-2.5 rounded-full bg-accent" />}
                </div>
              </div>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setStep(2)}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          Continue as {role === "participant" ? "Participant" : "Organizer"} <ChevronRight size={16} />
        </button>
        <p className="text-center text-muted text-sm mt-6">
          Already have an account?{" "}
          <Link href="/auth/signin" className="text-accent hover:underline">Sign in</Link>
        </p>
      </div>
    );
  }

  // === STEP 3: Success ===
  if (step === 3) {
    return (
      <div className="glass rounded-2xl p-8 text-center animate-slide-up">
        <div className={`w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center ${
          "bg-cyan-500/10"
        }`}>
          <CheckCircle2 size={32} className="text-cyan-400" />
        </div>
        <h1 className="font-display text-2xl font-bold mb-3">
          Check Your Email! ✉️
        </h1>
        {role === "participant" ? (
          <>
            <p className="text-muted text-sm mb-2 leading-relaxed">
              We've sent a verification link to
            </p>
            <p className="text-accent text-sm font-semibold mb-6 break-all">
              {email}
            </p>
            <div className="glass rounded-xl p-4 bg-cyan-500/5 border border-cyan-500/20 text-left mb-6">
              <div className="text-xs text-cyan-400 uppercase tracking-wider mb-3 font-semibold">📋 What to do next:</div>
              {[
                "Open your email inbox",
                "Click the verification link in the email",
                "Your account will be fully activated",
                "Sign in and start competing!",
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-xs text-cyan-400 font-bold">
                    {i + 1}
                  </div>
                  <span className="text-sm text-muted">{s}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted mb-6">
              <strong>Don't see the email?</strong> Check your spam folder or 
              {" "}<button onClick={() => setStep(3)} className="text-accent hover:underline">request a new link</button>
            </p>
            <button onClick={() => router.push("/auth/signin")} className="btn-primary w-full">
              Done - Go to Sign In
            </button>
          </>
        ) : (
          <>
            <p className="text-muted text-sm mb-2 leading-relaxed">
              We've sent a verification link to
            </p>
            <p className="text-accent text-sm font-semibold mb-6 break-all">
              {email}
            </p>
            <p className="text-muted text-sm mb-6 leading-relaxed">
              Please verify your email first, then our admin team will review your organizer application,
              typically within <span className="text-text font-medium">24–48 hours</span>.
              You'll receive an email when approved.
            </p>
            <Link href="/" className="btn-secondary w-full flex items-center justify-center">
              Back to Home
            </Link>
          </>
        )}
      </div>
    );
  }

  // === STEP 2: Details form ===
  return (
    <div className="glass rounded-2xl p-8 animate-slide-up">
      <button
        type="button"
        onClick={() => setStep(1)}
        className="text-muted text-xs hover:text-accent transition-colors mb-5 flex items-center gap-1"
      >
        ← Change role
      </button>
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          role === "participant" ? "bg-accent/10" : "bg-amber-500/10"
        }`}>
          {role === "participant"
            ? <GraduationCap size={20} className="text-accent" />
            : <Building2 size={20} className="text-amber-400" />
          }
        </div>
        <div>
          <h1 className="font-display text-xl font-bold">
            {role === "participant" ? "Participant Registration" : "Organizer Application"}
          </h1>
          <p className="text-muted text-xs">
            {role === "participant" ? "All fields marked * are required" : "Help us verify your organization"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSignUp} className="space-y-4">
        {/* ——— SHARED FIELDS ——— */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 md:col-span-1">
            <label className="text-xs text-muted mb-1.5 block">Full Name *</label>
            <input
              value={fullName} onChange={e => setFullName(e.target.value)}
              className="input-glass" placeholder="Ahmed Khan" required
            />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="text-xs text-muted mb-1.5 block">Phone {role === "organizer" ? "*" : ""}</label>
            <input
              type="tel" value={phone} onChange={e => { const v = e.target.value.replace(/[^0-9]/g,""); if(v.length<=11) setPhone(v); }}
              className="input-glass" placeholder="03001234567"
              maxLength={11}
              required={role === "organizer"}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted mb-1.5 block">Email Address *</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="input-glass" placeholder="you@university.edu.pk" required
          />
        </div>

        {/* ——— PARTICIPANT FIELDS ——— */}
        {role === "participant" && (
          <>
            <div>
              <label className="text-xs text-muted mb-1.5 block">University / Institute *</label>
              <input
                value={university} onChange={e => setUniversity(e.target.value)}
                className="input-glass" placeholder="COMSATS Abbottabad"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted mb-1.5 block">Degree Program</label>
                <input
                  value={degreeProgram} onChange={e => setDegreeProgram(e.target.value)}
                  className="input-glass" placeholder="BS Computer Science"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Graduation Year</label>
                <select
                  value={graduationYear} onChange={e => setGraduationYear(e.target.value)}
                  className="input-glass"
                >
                  <option value="">Select year</option>
                  {[2024,2025,2026,2027,2028,2029,2030].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted mb-1.5 block">Programming Experience *</label>
              <div className="grid grid-cols-3 gap-2">
                {(["beginner","intermediate","advanced"] as const).map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setExperienceLevel(lvl)}
                    className={`py-2 rounded-lg border text-xs font-medium capitalize transition-all ${
                      experienceLevel === lvl
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-surface/50 text-muted hover:border-accent/30"
                    }`}
                  >
                    {lvl === "beginner" ? "🌱 Beginner" : lvl === "intermediate" ? "⚡ Intermediate" : "🔥 Advanced"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted mb-1.5 block">GitHub URL (optional)</label>
              <input
                value={githubUrl} onChange={e => setGithubUrl(e.target.value)}
                className="input-glass" placeholder="https://github.com/username"
              />
            </div>
          </>
        )}

        {/* ——— ORGANIZER FIELDS ——— */}
        {role === "organizer" && (
          <>
            <div>
              <label className="text-xs text-muted mb-1.5 block">Organization Name *</label>
              <input
                value={organization} onChange={e => setOrganization(e.target.value)}
                className="input-glass" placeholder="e.g. NUST, TechHub Pakistan, StartupPak..."
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted mb-1.5 block">Organization Type *</label>
                <select
                  value={orgType} onChange={e => setOrgType(e.target.value)}
                  className="input-glass" required
                >
                  <option value="university">🎓 University</option>
                  <option value="company">🏢 Company</option>
                  <option value="ngo">💚 NGO / Non-profit</option>
                  <option value="government">🏛️ Government</option>
                  <option value="other">📋 Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Your Designation *</label>
                <input
                  value={designation} onChange={e => setDesignation(e.target.value)}
                  className="input-glass" placeholder="e.g. Event Coordinator"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted mb-1.5 block">Organization Website</label>
              <input
                value={orgWebsite} onChange={e => setOrgWebsite(e.target.value)}
                className="input-glass" placeholder="https://yourorg.com"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1.5 block">Why do you want to organize hackathons? *</label>
              <textarea
                value={whyOrganize} onChange={e => setWhyOrganize(e.target.value)}
                className="input-glass resize-none" rows={3}
                placeholder="Briefly explain your goals and what kind of events you plan to host..."
                required
              />
            </div>
          </>
        )}

        {/* ——— PASSWORD ——— */}
        <div>
          <label className="text-xs text-muted mb-1.5 block">Password *</label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={password} onChange={e => setPassword(e.target.value)}
              className="input-glass pr-10" placeholder="Min. 8 characters"
              required minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="flex gap-1 mt-2">
            {[1,2,3].map(i => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  strengthLevel >= i ? strengthColors[i] : "bg-border"
                }`}
              />
            ))}
          </div>
          {password.length > 0 && (
            <p className={`text-xs mt-1 ${strengthColors[strengthLevel].replace("bg-","text-")}`}>
              {strengthLabels[strengthLevel]}
            </p>
          )}
        </div>

        {role === "organizer" && (
          <div className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl text-xs text-muted">
            <span className="text-amber-400 shrink-0 mt-0.5">⚠️</span>
            <span>Your account will be reviewed by our admin team. You'll receive an email once approved (typically 24–48 hours).</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
        >
          {loading
            ? <><Loader2 size={18} className="animate-spin" /> Processing...</>
            : <><UserPlus size={18} /> {role === "participant" ? "Create Account" : "Submit Application"}</>
          }
        </button>
      </form>

      <p className="text-center text-muted text-sm mt-5">
        Already have an account?{" "}
        <Link href="/auth/signin" className="text-accent hover:underline">Sign in</Link>
      </p>
    </div>
  );
}