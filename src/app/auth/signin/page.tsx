"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Eye, EyeOff, LogIn, Loader2, Code2, Clock, Ban } from "lucide-react";

function SignInForm() {
  const [email, setEmail] = useState(process.env.NEXT_PUBLIC_ADMIN_EMAIL || "");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingOrganizer, setPendingOrganizer] = useState(false);
  const [rejectedOrganizer, setRejectedOrganizer] = useState<{ reason: string | null } | null>(null);
  const [bannedUser, setBannedUser] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPendingOrganizer(false);
    setBannedUser(false);
    setRejectedOrganizer(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Wrong email or password");
        } else {
          toast.error(error.message);
        }
        return;
      }

      // Fetch profile to check status and route
      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("role, organizer_status, is_banned, full_name, rejection_reason")
        .eq("id", data.user.id)
        .single();

      if (profErr || !profile) {
        // Profile missing — trigger may have failed at signup. Create it now.
        const { data: newProf, error: createErr } = await supabase
          .from("profiles")
          .upsert({
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "User",
            role: data.user.user_metadata?.role || "participant",
            organizer_status: data.user.user_metadata?.role === "organizer" ? "pending" : "approved",
          }, { onConflict: "id" })
          .select("role, organizer_status, is_banned, full_name, rejection_reason")
          .single();

        if (createErr || !newProf) {
          toast.error("Could not load your profile. Please try again.");
          await supabase.auth.signOut();
          return;
        }
        // re-assign profile to the newly created one
        Object.assign(profile || {}, newProf);
        // redirect using new profile
        toast.success(`Welcome, ${newProf.full_name?.split(" ")[0]}! 👋`);
        router.push(`/dashboard/${newProf.role}`);
        return;
      }

      // Check banned
      if (profile.is_banned) {
        await supabase.auth.signOut();
        setBannedUser(true);
        return;
      }

      // Check organizer rejected — redirect to pending page which shows rejection reason
      if (profile.role === "organizer" && profile.organizer_status === "rejected") {
        toast.error("Your organizer application was not approved.");
        router.push("/dashboard/organizer/pending");
        return;
      }

      // Check organizer pending — let them in but show pending page
      if (profile.role === "organizer" && (profile.organizer_status === "pending" || !(profile as any).organizer_status)) {
        toast.success(`Welcome, ${profile.full_name?.split(" ")[0]}! Your application is under review.`);
        router.push("/dashboard/organizer/pending");
        return;
      }

      // Success — route based on role
      toast.success(`Welcome back, ${profile.full_name?.split(" ")[0]}! 👋`);
      // Check if this participant is also an approved mentor
      if (profile.role === "participant") {
        const { data: mentorApp } = await supabase.from("mentor_applications")
          .select("id").eq("email", profile.email || "").eq("status","approved").maybeSingle();
        if (mentorApp) return router.push("/dashboard/mentor");
      }
      router.push(`/dashboard/${profile.role}`);
    } catch {
      toast.error("Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Pending organizer state
  if (pendingOrganizer) {
    return (
      <div className="glass rounded-2xl p-8 text-center animate-slide-up">
        <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Clock size={32} className="text-amber-400" />
        </div>
        <h2 className="font-display text-xl font-bold mb-2">Account Pending Approval</h2>
        <p className="text-muted text-sm mb-6 leading-relaxed">
          Your organizer account is still under review. Our admin team will approve it shortly.
          <br /><br />
          You'll receive an email at <span className="text-text font-medium">{email}</span> once approved.
        </p>
        <button
          onClick={() => { setPendingOrganizer(false); setPassword(""); }}
          className="btn-secondary w-full"
        >
          Back to Sign In
        </button>
        <p className="text-muted text-xs mt-4">
          Questions? Email{" "}
          <a href="mailto:support@smarthunristan.com" className="text-accent hover:underline">
            support@smarthunristan.com
          </a>
        </p>
      </div>
    );
  }

  // Rejected organizer state
  if (rejectedOrganizer) {
    return (
      <div className="glass rounded-2xl p-8 text-center animate-slide-up">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Ban size={32} className="text-red-400" />
        </div>
        <h2 className="font-display text-xl font-bold mb-2">Application Not Approved</h2>
        <p className="text-muted text-sm mb-4 leading-relaxed">
          Your organizer application for <span className="text-text font-medium">{email}</span> was reviewed and could not be approved at this time.
        </p>
        {rejectedOrganizer.reason && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-5 text-left">
            <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1.5">Reason from admin:</p>
            <p className="text-sm text-text leading-relaxed">{rejectedOrganizer.reason}</p>
          </div>
        )}
        <p className="text-muted text-xs mb-5">
          You may reapply with updated information or contact support for clarification.
        </p>
        <div className="flex flex-col gap-2">
          <Link href="/auth/signup" className="btn-primary w-full text-center">
            Reapply as Organizer
          </Link>
          <button
            onClick={() => { setRejectedOrganizer(null); setPassword(""); }}
            className="btn-secondary w-full"
          >
            Back to Sign In
          </button>
        </div>
        <p className="text-muted text-xs mt-4">
          Questions? Email{" "}
          <a href="mailto:support@smarthunristan.com" className="text-accent hover:underline">
            support@smarthunristan.com
          </a>
        </p>
      </div>
    );
  }

  // Banned state
  if (bannedUser) {
    return (
      <div className="glass rounded-2xl p-8 text-center animate-slide-up">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Ban size={32} className="text-red-400" />
        </div>
        <h2 className="font-display text-xl font-bold mb-2">Account Suspended</h2>
        <p className="text-muted text-sm mb-6 leading-relaxed">
          Your account has been suspended due to a violation of our platform rules.
          <br /><br />
          If you believe this is a mistake, please contact{" "}
          <a href="mailto:support@smarthunristan.com" className="text-accent hover:underline">
            support@smarthunristan.com
          </a>
        </p>
        <button onClick={() => setBannedUser(false)} className="btn-secondary w-full">Back</button>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-8 animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <Code2 size={20} className="text-accent" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold">Welcome back</h1>
          <p className="text-muted text-xs">Sign in to your Smart Hunristan account</p>
        </div>
      </div>

      <form onSubmit={handleSignIn} className="space-y-4">
        <div>
          <label className="text-xs text-muted mb-1.5 block">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="input-glass"
            placeholder="you@university.edu.pk"
            required
            autoComplete="email"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-muted">Password</label>
            <Link href="/auth/forgot-password" className="text-xs text-accent hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-glass pr-10"
              placeholder="Your password"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs text-muted bg-transparent">
          <span className="px-3" style={{ background: "rgba(17,24,39,0.9)" }}>
            System auto-detects your role
          </span>
        </div>
      </div>

      <div className="glass rounded-xl p-4 text-xs text-muted space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent inline-block shrink-0"></span>
          <span><span className="text-text">Participants</span> — immediate access after signup</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shrink-0"></span>
          <span><span className="text-text">Organizers</span> — access after admin approval</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent2 inline-block shrink-0"></span>
          <span><span className="text-text">Admins</span> — contact support for access</span>
        </div>
      </div>

      <p className="text-center text-muted text-sm mt-5">
        New to Smart Hunristan?{" "}
        <Link href="/auth/signup" className="text-accent hover:underline">
          Create account
        </Link>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="glass rounded-2xl p-8 animate-pulse h-64" />}>
      <SignInForm />
    </Suspense>
  );
}