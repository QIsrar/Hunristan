"use client";
import { useEffect, useState } from "react";
import { safeGetUser } from "@/lib/supabase/getUser";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, Clock, Code2, Trophy, AlertTriangle, ChevronRight, Loader2, BookOpen, Zap } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ArenaLobbyPage() {
  const { hackathonId } = useParams() as { hackathonId: string };
  const router = useRouter();
  const supabase = createClient();

  const [hackathon, setHackathon] = useState<any>(null);
  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    async function load() {
      const user = await safeGetUser();
      if (!user) return router.push("/auth/signin?redirect=/hackathons/" + hackathonId);

      const [{ data: hack }, { data: probs }] = await Promise.all([
        supabase.from("hackathons").select("*").eq("id", hackathonId).single(),
        supabase.from("problems").select("id, title, difficulty, points, time_limit_ms, order_index")
          .eq("hackathon_id", hackathonId).order("order_index"),
      ]);

      if (!hack) return router.push("/hackathons");
      if (hack.status !== "active") {
        toast.error("This hackathon is not currently active");
        return router.push(`/hackathons/${hackathonId}`);
      }

      // Check registration
      const { data: reg } = await supabase.from("registrations")
        .select("id,payment_status").eq("hackathon_id", hackathonId).eq("user_id", user.id).maybeSingle();
      if (!reg) {
        toast.error("You must register before entering the arena");
        return router.push(`/hackathons/${hackathonId}`);
      }
      if (reg.payment_status === "pending" || reg.payment_status === "rejected") {
        toast.error("Payment verification required before you can compete");
        return router.push(`/hackathons/${hackathonId}`);
      }

      setHackathon(hack);
      const problemList = probs || [];
      setProblems(problemList);
      if (problemList.length === 0) {
        toast.error("No problems found. The organizer may not have added problems yet.");
      }
      setLoading(false);
    }
    load();
  }, [hackathonId]);

  const handleEnter = async () => {
    if (!agreed || !problems.length) return;
    setEntering(true);
    router.push(`/arena/${hackathonId}/${problems[0].id}`);
  };

  const difficultyCount = (d: string) => problems.filter((p: any) => p.difficulty === d).length;

  const totalPoints = problems.reduce((sum: any, p: any) => sum + (p.points || 0), 0);

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Loader2 size={32} className="text-accent animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg grid-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent text-xs px-3 py-1.5 rounded-full mb-4">
            <Zap size={12} /> Arena Lobby
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">{hackathon.title}</h1>
          <p className="text-muted text-sm max-w-md mx-auto">{hackathon.description?.slice(0, 120)}...</p>
        </div>

        {/* Event Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="glass rounded-xl p-4 text-center">
            <BookOpen size={20} className="text-accent mx-auto mb-2" />
            <div className="text-2xl font-bold font-display">{problems.length}</div>
            <div className="text-xs text-muted mt-1">Problems</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <Trophy size={20} className="text-accent3 mx-auto mb-2" />
            <div className="text-2xl font-bold font-display">{totalPoints}</div>
            <div className="text-xs text-muted mt-1">Total Points</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <Clock size={20} className="text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold font-display">
              {Math.round((new Date(hackathon.end_time).getTime() - Date.now()) / 60000)}m
            </div>
            <div className="text-xs text-muted mt-1">Remaining</div>
          </div>
        </div>

        {/* Problem Overview */}
        <div className="glass rounded-xl p-5 mb-5">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Code2 size={15} className="text-accent" /> Problem Set
          </h3>
          <div className="space-y-2">
            {problems.map((p: any, i: number) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted w-5">{i + 1}.</span>
                  <span className="text-sm font-medium">{p.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">
                    {p.time_limit_ms >= 60000 ? `${Math.round(p.time_limit_ms/60000)}m` : `${p.time_limit_ms/1000}s`}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full badge-${p.difficulty}`}>{p.difficulty}</span>
                  <span className="text-xs font-mono text-accent">{p.points}pts</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-4 pt-3 border-t border-border/50 text-xs text-muted">
            {difficultyCount("easy") > 0 && <span className="text-green-400">{difficultyCount("easy")} Easy</span>}
            {difficultyCount("medium") > 0 && <span className="text-yellow-400">{difficultyCount("medium")} Medium</span>}
            {difficultyCount("hard") > 0 && <span className="text-red-400">{difficultyCount("hard")} Hard</span>}
          </div>
        </div>

        {/* Rules */}
        <div className="glass rounded-xl p-5 mb-5">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Shield size={15} className="text-accent" /> Competition Rules
          </h3>
          <ul className="space-y-2.5 text-sm text-muted">
            <li className="flex items-start gap-2.5"><span className="text-green-400 mt-0.5">✓</span> You may attempt problems in any order and skip freely.</li>
            <li className="flex items-start gap-2.5"><span className="text-green-400 mt-0.5">✓</span> Each problem has its own time limit. The timer resets when you move to the next.</li>
            <li className="flex items-start gap-2.5"><span className="text-green-400 mt-0.5">✓</span> Partial scoring: points awarded proportional to test cases passed.</li>
            <li className="flex items-start gap-2.5"><span className="text-amber-400 mt-0.5">⚠</span> Tab switching is detected. Each switch deducts <strong className="text-text">10% of your score</strong> (max 50%).</li>
            <li className="flex items-start gap-2.5"><span className="text-amber-400 mt-0.5">⚠</span> Code will be auto-submitted when your time runs out.</li>
            <li className="flex items-start gap-2.5"><span className="text-red-400 mt-0.5">✗</span> Plagiarism detection is active. Matching submissions will be flagged.</li>
            {hackathon.rules && <li className="flex items-start gap-2.5"><span className="text-accent mt-0.5">→</span> {hackathon.rules}</li>}
          </ul>
        </div>

        {/* Allowed Languages */}
        {hackathon.allowed_languages?.length > 0 && (
          <div className="glass rounded-xl p-4 mb-5">
            <h3 className="font-semibold text-xs text-muted uppercase tracking-wider mb-3">Allowed Languages</h3>
            <div className="flex flex-wrap gap-2">
              {hackathon.allowed_languages.map((l: string) => (
                <span key={l} className="text-xs px-3 py-1 bg-accent/10 border border-accent/20 text-accent rounded-full">{l}</span>
              ))}
            </div>
          </div>
        )}

        {/* Agreement + Enter */}
        <div className="glass rounded-xl p-5">
          <label className="flex items-start gap-3 cursor-pointer mb-5">
            <input type="checkbox" checked={agreed} onChange={(e: any) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-cyan-400" />
            <span className="text-sm text-muted">
              I have read and agree to the competition rules. I understand that tab switching will reduce my score
              and that plagiarism may result in disqualification.
            </span>
          </label>

          <button
            onClick={handleEnter}
            disabled={!agreed || entering}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-bg font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent/90"
          >
            {entering ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
            {entering ? "Entering Arena..." : "Enter Arena"}
          </button>
        </div>

        <div className="text-center mt-4">
          <Link href={`/hackathons/${hackathonId}`} className="text-xs text-muted hover:text-text transition-colors">
            ← Back to hackathon page
          </Link>
        </div>
      </div>
    </div>
  );
}