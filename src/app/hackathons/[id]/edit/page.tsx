"use client";
import { useEffect, useState } from "react";
import { safeGetUser } from "@/lib/supabase/getUser";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ChevronRight, ChevronLeft, Plus, Trash2,
  Loader2, Check, Info, Save, ArrowLeft,
} from "lucide-react";

const STEPS = ["Basic Info", "Problems", "Rules", "Review & Save"];
const LANGUAGES = ["python","javascript","typescript","cpp","c","java","go","rust","ruby","kotlin","swift","php","csharp"];

interface TestCase { id?: string; input: string; expected_output: string; is_hidden: boolean; _deleted?: boolean; }
interface Problem {
  id?: string;
  title: string; description: string; difficulty: "easy"|"medium"|"hard";
  time_limit_minutes: number; memory_limit_mb: number; points: number;
  input_format: string; constraints: string;
  sample_input: string; sample_output: string;
  test_cases: TestCase[];
  _deleted?: boolean;
}

function Tip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center ml-1.5 cursor-help">
      <Info size={12} className="text-muted/50 hover:text-accent transition-colors" />
      <span className="absolute left-5 top-0 z-50 w-64 p-2.5 bg-card border border-border rounded-lg text-xs text-muted leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
        {text}
      </span>
    </span>
  );
}

export default function EditHackathon() {
  const { id } = useParams() as { id: string };
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  // Step 1
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("50");
  const [tags, setTags] = useState("");
  const [prizeDetails, setPrizeDetails] = useState("");
  const [registrationFee, setRegistrationFee] = useState("0");
  const [leaderboardFrozen, setLeaderboardFrozen] = useState(false);

  // Step 2
  const [problems, setProblems] = useState<Problem[]>([]);

  // Step 3
  const [allowedLangs, setAllowedLangs] = useState<string[]>(["python","javascript","cpp","java"]);
  const [scoringMethod, setScoringMethod] = useState("best_score");
  const [penaltyPerWrong, setPenaltyPerWrong] = useState("0");
  const [allowTeams, setAllowTeams] = useState(false);
  const [maxTeamSize, setMaxTeamSize] = useState("3");
  const [hackathonStatus, setHackathonStatus] = useState("draft");
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    async function load() {
      const user = await safeGetUser();
      if (!user) return router.push("/auth/signin");

      const { data: h } = await supabase
        .from("hackathons").select("*")
        .eq("id", id).eq("organizer_id", user.id).single();

      if (!h) {
        toast.error("Hackathon not found or access denied");
        return router.push("/dashboard/organizer");
      }

      // Convert UTC timestamp to local datetime-local format (YYYY-MM-DDTHH:mm)
      const toLocalDT = (iso: string) => {
        if (!iso) return "";
        const d = new Date(iso);
        const pad = (n: number) => n.toString().padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };

      // Populate Step 1
      setTitle(h.title || "");
      setDescription(h.description || "");
      setStartTime(toLocalDT(h.start_time));
      setEndTime(toLocalDT(h.end_time));
      setMaxParticipants(h.max_participants?.toString() || "50");
      setTags(Array.isArray(h.tags) ? h.tags.join(", ") : "");
      setPrizeDetails(h.prize_details || "");
      setRegistrationFee(h.registration_fee?.toString() || "0");
      setLeaderboardFrozen(h.leaderboard_frozen || false);
      setHackathonStatus(h.status || "draft");
      setIsApproved(h.is_approved || false);

      // Populate Step 3
      setAllowedLangs(h.allowed_languages || ["python","javascript","cpp","java"]);
      setScoringMethod(h.scoring_method || "best_score");
      setPenaltyPerWrong(h.penalty_per_wrong?.toString() || "0");
      setAllowTeams(h.allow_teams || false);
      setMaxTeamSize(h.max_team_size?.toString() || "3");

      // Load problems + test cases
      const { data: probs } = await supabase
        .from("problems").select("*")
        .eq("hackathon_id", id).order("order_index");

      if (probs && probs.length > 0) {
        const problemsWithTCs: Problem[] = await Promise.all(
          probs.map(async (p) => {
            const { data: tcs } = await supabase
              .from("test_cases").select("*")
              .eq("problem_id", p.id).order("order_index");
            return {
              id: p.id,
              title: p.title,
              description: p.description,
              difficulty: p.difficulty,
              time_limit_minutes: Math.round((p.time_limit_ms || 60000) / 60000 * 10) / 10,
              memory_limit_mb: p.memory_limit_mb || 256,
              points: p.points || 100,
              input_format: p.input_format || "",
              constraints: p.constraints_text || "",
              sample_input: p.sample_input || "",
              sample_output: p.sample_output || "",
              test_cases: (tcs || []).map(tc => ({
                id: tc.id,
                input: tc.input,
                expected_output: tc.expected_output,
                is_hidden: tc.is_hidden,
              })),
            };
          })
        );
        setProblems(problemsWithTCs);
      } else {
        setProblems([{
          title:"", description:"", difficulty:"easy",
          time_limit_minutes:1, memory_limit_mb:256, points:100,
          input_format:"", constraints:"", sample_input:"", sample_output:"",
          test_cases:[{ input:"", expected_output:"", is_hidden:false }],
        }]);
      }

      setLoading(false);
    }
    load();
  }, [id]);

  // Problem helpers
  const addProblem = () => setProblems(p => [...p, {
    title:"", description:"", difficulty:"easy",
    time_limit_minutes:1, memory_limit_mb:256, points:100,
    input_format:"", constraints:"", sample_input:"", sample_output:"",
    test_cases:[{ input:"", expected_output:"", is_hidden:true }],
  }]);

  const updateProblem = (i: number, updates: Partial<Problem>) =>
    setProblems(p => p.map((prob, idx) => idx === i ? { ...prob, ...updates } : prob));

  const removeProblem = (i: number) =>
    setProblems(p => p.map((prob, idx) => idx === i ? { ...prob, _deleted: true } : prob));

  const addTestCase = (pi: number) =>
    setProblems(p => p.map((prob, idx) => idx === pi
      ? { ...prob, test_cases: [...prob.test_cases, { input:"", expected_output:"", is_hidden:true }] }
      : prob));

  const removeTestCase = (pi: number, ti: number) =>
    setProblems(p => p.map((prob, idx) => idx === pi
      ? { ...prob, test_cases: prob.test_cases.map((tc, tIdx) => tIdx === ti ? { ...tc, _deleted: true } : tc) }
      : prob));

  const updateTestCase = (pi: number, ti: number, updates: Partial<TestCase>) =>
    setProblems(p => p.map((prob, idx) => idx === pi
      ? { ...prob, test_cases: prob.test_cases.map((tc, tIdx) => tIdx === ti ? { ...tc, ...updates } : tc) }
      : prob));

  const toggleLang = (lang: string) =>
    setAllowedLangs(l => l.includes(lang) ? l.filter(x => x !== lang) : [...l, lang]);

  // Helpers for datetime-local min value
  const nowLocal = () => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Convert local datetime-local string to proper UTC ISO string for Supabase
  const toUTC = (localDT: string) => localDT ? new Date(localDT).toISOString() : localDT;

  // Per-step validation
  const validateStep = (s: number): boolean => {
    if (s === 0) {
      if (!title.trim()) { toast.error("Title is required"); return false; }
      if (!description.trim()) { toast.error("Description is required"); return false; }
      if (!startTime) { toast.error("Start date & time is required"); return false; }
      if (!endTime) { toast.error("End date & time is required"); return false; }
      if (new Date(endTime) <= new Date(startTime)) { toast.error("End time must be after start time"); return false; }
      if (parseInt(maxParticipants) < 2) { toast.error("Max participants must be at least 2"); return false; }
      return true;
    }
    if (s === 1) {
      const active = problems.filter(p => !p._deleted);
      for (let i = 0; i < active.length; i++) {
        const p = active[i];
        const label = `Problem ${String.fromCharCode(65 + i)}`;
        if (!p.title.trim()) { toast.error(`${label}: Title is required`); return false; }
        if (!p.description.trim()) { toast.error(`${label}: Description is required`); return false; }
        if (!p.sample_input.trim()) { toast.error(`${label}: Sample input is required`); return false; }
        if (!p.sample_output.trim()) { toast.error(`${label}: Sample output is required`); return false; }
        const validTCs = p.test_cases.filter(tc => !tc._deleted && tc.input && tc.expected_output);
        if (validTCs.length === 0) { toast.error(`${label}: At least one complete test case is required`); return false; }
      }
      return true;
    }
    if (s === 2) {
      if (allowedLangs.length === 0) { toast.error("Select at least one language"); return false; }
      return true;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    // If approved, skip problems & rules — jump straight to review
    if (isApproved && step === 0) { setStep(3); return; }
    setStep(s => s + 1);
  };

  const handleSave = async (asDraft = false) => {
    setSaving(true);
    try {
      // Update hackathon
      const { error: hErr, count } = await supabase.from("hackathons").update({
        title, description,
        start_time: toUTC(startTime), end_time: toUTC(endTime),
        max_participants: Math.max(2, parseInt(maxParticipants) || 2),
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        prize_details: prizeDetails || null,
        registration_fee: Math.max(0, parseInt(registrationFee) || 0),
        allowed_languages: allowedLangs,
        scoring_method: scoringMethod,
        penalty_per_wrong: Math.max(0, parseInt(penaltyPerWrong) || 0),
        allow_teams: allowTeams,
        max_team_size: allowTeams ? parseInt(maxTeamSize) : 1,
        leaderboard_frozen: leaderboardFrozen,
        ...(asDraft ? { status: "draft" } : {}),
      }).eq("id", id);
      if (hErr) throw new Error("Hackathon update failed: " + hErr.message);

      // Handle problems
      let orderIndex = 0;
      for (const prob of problems) {
        if (prob._deleted && prob.id) {
          await supabase.from("problems").delete().eq("id", prob.id);
          continue;
        }
        if (prob._deleted) continue;

        const probData = {
          hackathon_id: id,
          title: prob.title,
          slug: prob.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + orderIndex,
          description: prob.description,
          difficulty: prob.difficulty,
          time_limit_ms: Math.round(prob.time_limit_minutes * 60 * 1000),
          memory_limit_mb: prob.memory_limit_mb,
          points: prob.points,
          input_format: prob.input_format,
          constraints_text: prob.constraints,
          sample_input: prob.sample_input,
          sample_output: prob.sample_output,
          order_index: orderIndex++,
        };

        let problemId = prob.id;

        if (prob.id) {
          const { error: upErr } = await supabase.from("problems").update(probData).eq("id", prob.id);
          if (upErr) throw new Error("Problem update failed: " + upErr.message);
        } else {
          const { data: newProb, error: pErr } = await supabase.from("problems").insert(probData).select().single();
          if (pErr) throw pErr;
          problemId = newProb.id;
        }

        // Handle test cases
        for (const tc of prob.test_cases) {
          if (tc._deleted && tc.id) {
            await supabase.from("test_cases").delete().eq("id", tc.id);
            continue;
          }
          if (tc._deleted || (!tc.input && !tc.expected_output)) continue;

          const tcData = {
            problem_id: problemId,
            input: tc.input,
            expected_output: tc.expected_output,
            is_hidden: tc.is_hidden,
          };

          if (tc.id) {
            await supabase.from("test_cases").update(tcData).eq("id", tc.id);
          } else if (tc.input && tc.expected_output) {
            await supabase.from("test_cases").insert(tcData);
          }
        }
      }

      toast.success("Hackathon updated successfully! ✅");
      // Hard navigation so dashboard re-fetches fresh data instead of using router cache
      window.location.href = "/dashboard/organizer";
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Loader2 size={32} className="text-accent animate-spin" />
    </div>
  );

  const activeProblems = problems.filter(p => !p._deleted);

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/organizer" className="p-2 glass rounded-lg hover:text-accent transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold">Edit Hackathon</h1>
            <p className="text-muted text-sm">"{title}"</p>
          </div>
        </div>

        {/* Step progress */}
        {isApproved && (
          <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-sm text-amber-400 flex items-center gap-3">
            <span className="text-lg">🔒</span>
            <div>
              <span className="font-semibold">Approved event — limited editing</span>
              <p className="text-xs text-muted mt-0.5">Problems and rules are locked. You can still edit basic info, dates, prizes and settings.</p>
            </div>
          </div>
        )}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <button
                  onClick={() => { if (i < step && validateStep(step)) setStep(i); }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    isApproved && (i === 1 || i === 2) ? "glass text-muted/30 cursor-not-allowed"
                    : i < step ? "bg-green-500 text-bg cursor-pointer hover:scale-105"
                    : i === step ? "bg-accent text-bg"
                    : "glass text-muted"
                  }`}
                >
                  {i < step ? <Check size={14} /> : i + 1}
                </button>
                <span className={`text-sm hidden md:block ${i === step ? "text-text" : "text-muted"}`}>{s}</span>
                {i < STEPS.length - 1 && (
                  <div className={`h-px flex-1 mx-2 hidden md:block ${i < step ? "bg-green-500" : "bg-border"}`} style={{ width: "40px" }} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-8">

          {/* ── Step 1: Basic Info ── */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="font-display text-2xl font-bold mb-6">Basic Information</h2>
              <div>
                <label className="text-sm text-muted mb-2 block">Hackathon Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} className="input-glass" />
              </div>
              <div>
                <label className="text-sm text-muted mb-2 block">Description *</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  rows={5} className="input-glass resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted mb-2 block">Start Date & Time *</label>
                  <input type="datetime-local" value={startTime} min={nowLocal()} onChange={e => setStartTime(e.target.value)} className="input-glass" />
                </div>
                <div>
                  <label className="text-sm text-muted mb-2 block">End Date & Time *</label>
                  <input type="datetime-local" value={endTime} min={startTime} onChange={e => setEndTime(e.target.value)} className="input-glass" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted mb-2 block">Max Participants <Tip text="Minimum 2." /></label>
                  <input type="number" value={maxParticipants} min="2"
                    onChange={e => setMaxParticipants(String(Math.max(2, parseInt(e.target.value) || 2)))}
                    className="input-glass" />
                </div>
                <div>
                  <label className="text-sm text-muted mb-2 block">Registration Fee (PKR)</label>
                  <input type="number" value={registrationFee} min="0"
                    onChange={e => setRegistrationFee(String(Math.max(0, parseInt(e.target.value) || 0)))}
                    className="input-glass" />
                  {parseInt(registrationFee) === 0 && <p className="text-xs text-green-400 mt-1">✓ Free event</p>}
                </div>
              </div>
              <div>
                <label className="text-sm text-muted mb-2 block">Tags (comma-separated)</label>
                <input value={tags} onChange={e => setTags(e.target.value)} className="input-glass"
                  placeholder="AI, Web Dev, Beginner Friendly" />
              </div>
              <div>
                <label className="text-sm text-muted mb-2 block">Prize Details</label>
                <textarea value={prizeDetails} onChange={e => setPrizeDetails(e.target.value)}
                  rows={3} className="input-glass resize-none"
                  placeholder={"1st: PKR 50,000\n2nd: PKR 25,000"} />
              </div>
              {/* Leaderboard freeze */}
              <div className="flex items-center justify-between p-4 bg-surface/50 rounded-xl border border-border">
                <div>
                  <div className="font-medium text-sm">Freeze Leaderboard</div>
                  <div className="text-muted text-xs mt-0.5">Hide rank changes in final minutes (ICPC-style)</div>
                </div>
                <button onClick={() => setLeaderboardFrozen(f => !f)}
                  className={`w-12 h-6 rounded-full transition-all ${leaderboardFrozen ? "bg-accent" : "bg-border"} relative`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${leaderboardFrozen ? "left-7" : "left-1"}`} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Problems ── */}
          {step === 1 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-2xl font-bold">Problems</h2>
                <button onClick={addProblem} className="btn-secondary !py-2 !px-4 text-sm flex items-center gap-2">
                  <Plus size={14} /> Add Problem
                </button>
              </div>
              <div className="mb-5 p-4 bg-accent/5 border border-accent/15 rounded-xl text-xs text-muted space-y-1.5">
                <p><span className="text-accent font-semibold">Sample Input/Output</span> — Shown to participants as example. Not used for grading.</p>
                <p><span className="text-accent font-semibold">Test Cases</span> — Used to grade submissions. Mark Hidden so participants can't see expected answers.</p>
              </div>

              <div className="space-y-8">
                {problems.map((prob, pi) => {
                  if (prob._deleted) return null;
                  const displayIndex = problems.slice(0, pi).filter(p => !p._deleted).length;
                  return (
                    <div key={pi} className="border border-border rounded-xl p-6 bg-surface/30 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-display font-semibold text-lg">Problem {String.fromCharCode(65 + displayIndex)}</span>
                        {activeProblems.length > 1 && (
                          <button onClick={() => removeProblem(pi)}
                            className="text-red-400 hover:text-red-300 flex items-center gap-1 text-xs">
                            <Trash2 size={13} /> Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted mb-2 block">Title *</label>
                          <input value={prob.title} onChange={e => updateProblem(pi, { title: e.target.value })} className="input-glass" />
                        </div>
                        <div>
                          <label className="text-sm text-muted mb-2 block">Difficulty</label>
                          <select value={prob.difficulty} onChange={e => updateProblem(pi, { difficulty: e.target.value as any })} className="input-glass">
                            <option value="easy">🟢 Easy</option>
                            <option value="medium">🟡 Medium</option>
                            <option value="hard">🔴 Hard</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm text-muted mb-2 block">Description *</label>
                        <textarea value={prob.description} onChange={e => updateProblem(pi, { description: e.target.value })}
                          rows={4} className="input-glass resize-none" />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-sm text-muted mb-2 block">Points</label>
                          <input type="number" value={prob.points} min="1"
                            onChange={e => updateProblem(pi, { points: Math.max(1, +e.target.value) })} className="input-glass" />
                        </div>
                        <div>
                          <label className="text-sm text-muted mb-2 block">Time Limit (min) <Tip text="Max time per test case." /></label>
                          <input type="number" value={prob.time_limit_minutes} min="0.5" step="0.5"
                            onChange={e => updateProblem(pi, { time_limit_minutes: Math.max(0.5, +e.target.value) })} className="input-glass" />
                        </div>
                        <div>
                          <label className="text-sm text-muted mb-2 block">Memory (MB) <Tip text="Max RAM allowed." /></label>
                          <input type="number" value={prob.memory_limit_mb} min="16"
                            onChange={e => updateProblem(pi, { memory_limit_mb: Math.max(16, +e.target.value) })} className="input-glass" />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm text-muted mb-2 block">Input Format (optional)</label>
                        <textarea value={prob.input_format} onChange={e => updateProblem(pi, { input_format: e.target.value })}
                          rows={2} className="input-glass resize-none text-sm" />
                      </div>
                      <div>
                        <label className="text-sm text-muted mb-2 block">Constraints (optional)</label>
                        <textarea value={prob.constraints} onChange={e => updateProblem(pi, { constraints: e.target.value })}
                          rows={2} className="input-glass resize-none font-mono text-xs" />
                      </div>

                      {/* Sample */}
                      <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                        <p className="text-xs text-amber-400 font-semibold mb-3">📋 Sample — shown to participants, does NOT grade</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-muted mb-1.5 block">Sample Input *</label>
                            <textarea value={prob.sample_input} onChange={e => updateProblem(pi, { sample_input: e.target.value })}
                              rows={3} className="input-glass resize-none font-mono text-xs" />
                          </div>
                          <div>
                            <label className="text-xs text-muted mb-1.5 block">Sample Output *</label>
                            <textarea value={prob.sample_output} onChange={e => updateProblem(pi, { sample_output: e.target.value })}
                              rows={3} className="input-glass resize-none font-mono text-xs" />
                          </div>
                        </div>
                      </div>

                      {/* Test cases */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <label className="text-sm text-muted">Test Cases * <Tip text="Used to grade submissions. Hidden = participants can't see expected output." /></label>
                            <p className="text-xs text-muted/60 mt-0.5">Grade every submission automatically</p>
                          </div>
                          <button onClick={() => addTestCase(pi)} className="text-xs text-accent hover:underline flex items-center gap-1">
                            <Plus size={10} /> Add Test Case
                          </button>
                        </div>
                        <div className="space-y-3">
                          {prob.test_cases.map((tc, ti) => {
                            if (tc._deleted) return null;
                            const activeCount = prob.test_cases.filter(t => !t._deleted).length;
                            return (
                              <div key={ti} className="grid grid-cols-2 gap-3 p-3 bg-bg rounded-lg border border-border/50">
                                <div>
                                  <label className="text-xs text-muted mb-1 block">Input</label>
                                  <textarea value={tc.input} onChange={e => updateTestCase(pi, ti, { input: e.target.value })}
                                    rows={2} className="input-glass resize-none font-mono text-xs" />
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs text-muted">Expected Output</label>
                                    <div className="flex items-center gap-2">
                                      <label className="flex items-center gap-1 text-xs cursor-pointer">
                                        <input type="checkbox" checked={tc.is_hidden}
                                          onChange={e => updateTestCase(pi, ti, { is_hidden: e.target.checked })}
                                          className="w-3 h-3 accent-accent" />
                                        <span className={tc.is_hidden ? "text-accent" : "text-muted"}>Hidden</span>
                                      </label>
                                      {activeCount > 1 && (
                                        <button onClick={() => removeTestCase(pi, ti)} className="text-red-400/60 hover:text-red-400">
                                          <Trash2 size={11} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <textarea value={tc.expected_output} onChange={e => updateTestCase(pi, ti, { expected_output: e.target.value })}
                                    rows={2} className="input-glass resize-none font-mono text-xs" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 3: Rules ── */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="font-display text-2xl font-bold mb-6">Rules & Settings</h2>

              <div>
                <label className="text-sm text-muted mb-3 block">Allowed Languages *</label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(lang => (
                    <button key={lang} onClick={() => toggleLang(lang)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-all ${allowedLangs.includes(lang) ? "bg-accent text-bg" : "glass text-muted hover:text-text"}`}>
                      {lang}
                    </button>
                  ))}
                </div>
                {allowedLangs.length === 0 && <p className="text-xs text-red-400 mt-2">⚠ Select at least one language</p>}
              </div>

              <div>
                <label className="text-sm text-muted mb-2 block">Scoring Method <Tip text="How winner ranking is determined." /></label>
                <select value={scoringMethod} onChange={e => setScoringMethod(e.target.value)} className="input-glass">
                  <option value="best_score">Best Score — highest scoring attempt counts (recommended)</option>
                  <option value="first_correct">First Correct — first accepted submission wins (speed-focused)</option>
                  <option value="last_submission">Last Submission — only final attempt before deadline counts</option>
                </select>
                <p className="text-xs text-muted mt-1.5">
                  {scoringMethod === "best_score" && "✓ Participants can retry and improve."}
                  {scoringMethod === "first_correct" && "⚡ Speed matters. First to solve gets maximum points."}
                  {scoringMethod === "last_submission" && "⚠ Only the last submission is graded."}
                </p>
              </div>

              <div>
                <label className="text-sm text-muted mb-2 block">Wrong Submission Penalty (points) <Tip text="Points deducted per wrong answer. 0 = no penalty." /></label>
                <input type="number" value={penaltyPerWrong} min="0"
                  onChange={e => setPenaltyPerWrong(String(Math.max(0, parseInt(e.target.value) || 0)))}
                  className="input-glass" placeholder="0 = no penalty" />
                <p className="text-xs text-muted mt-1.5">
                  {parseInt(penaltyPerWrong) === 0
                    ? "✓ No penalty — participants can submit freely"
                    : `⚠ Each wrong submission deducts ${penaltyPerWrong} points`}
                </p>
              </div>

              <div className="p-4 bg-surface rounded-xl border border-border space-y-4">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={allowTeams} onChange={e => setAllowTeams(e.target.checked)} id="teams" className="w-4 h-4 accent-accent" />
                  <label htmlFor="teams" className="text-sm cursor-pointer font-medium">Allow team participation</label>
                </div>
                {allowTeams && (
                  <div>
                    <label className="text-sm text-muted mb-2 block">Max Team Size</label>
                    <input type="number" value={maxTeamSize} min="2" max="10"
                      onChange={e => setMaxTeamSize(String(Math.min(10, Math.max(2, parseInt(e.target.value) || 2))))}
                      className="input-glass w-32" />
                    <p className="text-xs text-muted mt-1">Between 2 and 10 members per team</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 4: Review ── */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="font-display text-2xl font-bold mb-6">Review & Save</h2>

              <div className="glass rounded-xl p-5 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted">Title</span><span className="font-medium">{title}</span></div>
                <div className="flex justify-between"><span className="text-muted">Start</span><span>{startTime ? new Date(startTime).toLocaleString() : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted">End</span><span>{endTime ? new Date(endTime).toLocaleString() : "—"}</span></div>
                {startTime && endTime && (
                  <div className="flex justify-between"><span className="text-muted">Duration</span>
                    <span>{Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 3600000 * 10) / 10} hours</span>
                  </div>
                )}
                <div className="flex justify-between"><span className="text-muted">Problems</span><span>{activeProblems.length}</span></div>
                <div className="flex justify-between"><span className="text-muted">Max Participants</span><span>{maxParticipants}</span></div>
                <div className="flex justify-between"><span className="text-muted">Languages</span><span className="text-xs text-right max-w-xs">{allowedLangs.join(", ")}</span></div>
                <div className="flex justify-between"><span className="text-muted">Scoring</span><span className="capitalize">{scoringMethod.replace(/_/g, " ")}</span></div>
                <div className="flex justify-between"><span className="text-muted">Penalty</span><span>{parseInt(penaltyPerWrong) > 0 ? `${penaltyPerWrong} pts/wrong` : "None"}</span></div>
                <div className="flex justify-between"><span className="text-muted">Fee</span><span>{parseInt(registrationFee) > 0 ? `PKR ${registrationFee}` : "Free"}</span></div>
                <div className="flex justify-between"><span className="text-muted">Teams</span><span>{allowTeams ? `Yes (max ${maxTeamSize})` : "Individual"}</span></div>
                <div className="flex justify-between"><span className="text-muted">Leaderboard</span><span>{leaderboardFrozen ? "Frozen (ICPC-style)" : "Live"}</span></div>
                <div className="flex justify-between"><span className="text-muted">Status</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full badge-${hackathonStatus}`}>{hackathonStatus}</span>
                </div>
              </div>

              <div className="space-y-2">
                {activeProblems.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-accent font-bold">{String.fromCharCode(65 + i)}</span>
                      <span className="font-medium">{p.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full badge-${p.difficulty}`}>{p.difficulty}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted text-xs">
                      <span>{p.points} pts</span>
                      <span>{p.time_limit_minutes}min</span>
                      <span>{p.test_cases.filter(tc => !tc._deleted && tc.input).length} tests</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-sm text-muted">
                ℹ️ Saving changes will not change your approval status — admin will review any significant changes.
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
              className="flex items-center gap-2 text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={16} /> Previous
            </button>

            {step < STEPS.length - 1 ? (
              <button onClick={goNext} className="btn-primary flex items-center gap-2">
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <div className="flex gap-3">
                {!isApproved && (
                  <button onClick={() => handleSave(true)} disabled={saving} className="btn-secondary flex items-center gap-2">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                    Save as Draft
                  </button>
                )}
                <button onClick={() => handleSave(false)} disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}