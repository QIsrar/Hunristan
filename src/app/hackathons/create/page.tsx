"use client";
import { useState } from "react";
import { safeGetUser } from "@/lib/supabase/getUser";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import toast from "react-hot-toast";
import {
  ChevronRight, ChevronLeft, Plus, Trash2, Loader2, Check, Info, Code2, Layers,
} from "lucide-react";
import CategoryBuilder, { type CategoryDraft } from "@/components/organizer/CategoryBuilder";

const LANGUAGES = ["python", "javascript", "typescript", "cpp", "c", "java", "go", "rust", "ruby", "kotlin", "swift", "php", "csharp"];

const nowLocal = () => {
  const now = new Date();
  now.setSeconds(0, 0);
  return now.toISOString().slice(0, 16);
};
const toUTC = (localDT: string) => localDT ? new Date(localDT).toISOString() : localDT;

interface TestCase { input: string; expected_output: string; is_hidden: boolean; }
interface Problem {
  title: string; description: string; difficulty: "easy" | "medium" | "hard";
  time_limit_minutes: number; memory_limit_mb: number; points: number;
  input_format: string; constraints: string;
  sample_input: string; sample_output: string;
  test_cases: TestCase[];
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

// ─── Competition type selector ───────────────────────────────────────────────
function CompetitionTypeCard({
  type, label, description, icon: Icon, selected, onClick,
}: {
  type: string; label: string; description: string;
  icon: React.ElementType; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all w-full ${
        selected
          ? "border-accent bg-accent/5"
          : "border-border hover:border-accent/40 bg-surface/20"
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selected ? "bg-accent/15" : "bg-surface"}`}>
        <Icon size={20} className={selected ? "text-accent" : "text-muted"} />
      </div>
      <div>
        <div className={`font-semibold text-sm ${selected ? "text-accent" : "text-text"}`}>{label}</div>
        <div className="text-xs text-muted mt-0.5 leading-relaxed">{description}</div>
      </div>
      <div className={`ml-auto w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${selected ? "border-accent bg-accent" : "border-border"}`}>
        {selected && <Check size={12} className="text-bg" />}
      </div>
    </button>
  );
}

export default function CreateHackathon() {
  const router = useRouter();
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);

  // Competition type (determines which steps are shown)
  const [competitionType, setCompetitionType] = useState<"CODING" | "MULTI_TRACK">("CODING");

  // CODING steps: [Basic Info (0), Problems (1), Rules (2), Review (3)]
  // MULTI_TRACK steps: [Basic Info (0), Categories (1), Rules (2), Review (3)]
  // step 0 also has the type selector embedded
  const [step, setStep] = useState(0);
  const STEPS = ["Basic Info", competitionType === "CODING" ? "Problems" : "Categories", "Rules", "Review & Publish"];

  // ── Step 0: Basic info ──────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("50");
  const [tags, setTags] = useState("");
  const [prizeDetails, setPrizeDetails] = useState("");
  const [rules, setRules] = useState("");
  const [registrationFee, setRegistrationFee] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("jazzcash");
  const [paymentAccountName, setPaymentAccountName] = useState("");
  const [paymentAccountNumber, setPaymentAccountNumber] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [paymentBankName, setPaymentBankName] = useState("");

  // ── Step 1 (CODING): Problems ───────────────────────────────────────────
  const [problems, setProblems] = useState<Problem[]>([{
    title: "", description: "", difficulty: "easy",
    time_limit_minutes: 1, memory_limit_mb: 256, points: 100,
    input_format: "", constraints: "",
    sample_input: "", sample_output: "",
    test_cases: [{ input: "", expected_output: "", is_hidden: false }]
  }]);

  // ── Step 1 (MULTI_TRACK): Categories ───────────────────────────────────
  const [categories, setCategories] = useState<CategoryDraft[]>([]);

  // ── Step 2: Rules / settings ────────────────────────────────────────────
  const [allowedLangs, setAllowedLangs] = useState<string[]>(["python", "javascript", "cpp", "java"]);
  const [scoringMethod, setScoringMethod] = useState("best_score");
  const [penaltyPerWrong, setPenaltyPerWrong] = useState("0");
  const [allowTeams, setAllowTeams] = useState(false);
  const [teamsCompulsory, setTeamsCompulsory] = useState(false);
  const [maxTeamSize, setMaxTeamSize] = useState("3");

  // ── Problem helpers (CODING mode) ───────────────────────────────────────
  const addProblem = () => setProblems(p => [...p, {
    title: "", description: "", difficulty: "easy",
    time_limit_minutes: 1, memory_limit_mb: 256, points: 100,
    input_format: "", constraints: "", sample_input: "", sample_output: "",
    test_cases: [{ input: "", expected_output: "", is_hidden: true }]
  }]);
  const updateProblem = (i: number, updates: Partial<Problem>) =>
    setProblems(p => p.map((prob, idx) => idx === i ? { ...prob, ...updates } : prob));
  const addTestCase = (pi: number) =>
    setProblems(p => p.map((prob, idx) => idx === pi
      ? { ...prob, test_cases: [...prob.test_cases, { input: "", expected_output: "", is_hidden: true }] }
      : prob));
  const removeTestCase = (pi: number, ti: number) =>
    setProblems(p => p.map((prob, idx) => idx === pi
      ? { ...prob, test_cases: prob.test_cases.filter((_, i) => i !== ti) }
      : prob));
  const updateTestCase = (pi: number, ti: number, updates: Partial<TestCase>) =>
    setProblems(p => p.map((prob, idx) => idx === pi
      ? { ...prob, test_cases: prob.test_cases.map((tc, tIdx) => tIdx === ti ? { ...tc, ...updates } : tc) }
      : prob));
  const toggleLang = (lang: string) =>
    setAllowedLangs(l => l.includes(lang) ? l.filter(x => x !== lang) : [...l, lang]);

  // ── Validation ──────────────────────────────────────────────────────────
  const validateStep = (s: number): boolean => {
    if (s === 0) {
      if (!title.trim()) { toast.error("Hackathon title is required"); return false; }
      if (!description.trim()) { toast.error("Description is required"); return false; }
      if (!startTime) { toast.error("Start date & time is required"); return false; }
      if (!endTime) { toast.error("End date & time is required"); return false; }
      if (new Date(endTime) <= new Date(startTime)) { toast.error("End time must be after start time"); return false; }
      if (parseInt(maxParticipants) < 2) { toast.error("Max participants must be at least 2"); return false; }
      return true;
    }
    if (s === 1) {
      if (competitionType === "CODING") {
        for (let i = 0; i < problems.length; i++) {
          const p = problems[i];
          const label = `Problem ${String.fromCharCode(65 + i)}`;
          if (!p.title.trim()) { toast.error(`${label}: Title is required`); return false; }
          if (!p.description.trim()) { toast.error(`${label}: Description is required`); return false; }
          if (!p.sample_input.trim()) { toast.error(`${label}: Sample input is required`); return false; }
          if (!p.sample_output.trim()) { toast.error(`${label}: Sample output is required`); return false; }
          const validTCs = p.test_cases.filter(tc => tc.input && tc.expected_output);
          if (validTCs.length === 0) { toast.error(`${label}: At least one complete test case is required`); return false; }
        }
      } else {
        if (categories.length === 0) { toast.error("Add at least one competition category"); return false; }
        for (const cat of categories) {
          if (!cat.name.trim()) { toast.error("Each category must have a name"); return false; }
          if (cat.type !== "MCQ" && cat.rubric_json.length === 0) {
            toast.error(`Category "${cat.name}": Add at least one rubric criterion`); return false;
          }
          if (cat.type === "MCQ" && cat.mcq_questions.length === 0) {
            toast.error(`Category "${cat.name}": Add at least one MCQ question`); return false;
          }
        }
      }
      return true;
    }
    if (s === 2) {
      if (competitionType === "CODING" && allowedLangs.length === 0) {
        toast.error("Select at least one allowed language"); return false;
      }
      return true;
    }
    return true;
  };

  const goNext = () => { if (validateStep(step)) setStep(s => s + 1); };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handlePublish = async (draft: boolean) => {
    setSubmitting(true);
    try {
      const user = await safeGetUser();
      if (!user) throw new Error("Not authenticated");
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now();

      const { data: hackathon, error: hErr } = await supabase.from("hackathons").insert({
        organizer_id: user.id, title, slug, description,
        start_time: toUTC(startTime), end_time: toUTC(endTime),
        max_participants: parseInt(maxParticipants) || 50,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        prize_details: prizeDetails || null,
        registration_fee: Math.max(0, parseInt(registrationFee) || 0),
        payment_details: parseInt(registrationFee) > 0 ? JSON.stringify({
          method: paymentMethod,
          bank_name: paymentMethod === "other" ? paymentBankName : undefined,
          account_name: paymentAccountName,
          account_number: paymentAccountNumber,
          instructions: paymentInstructions,
        }) : null,
        rules: rules.trim() || null,
        allowed_languages: allowedLangs,
        scoring_method: scoringMethod,
        penalty_per_wrong: Math.max(0, parseInt(penaltyPerWrong) || 0),
        allow_teams: allowTeams,
        teams_compulsory: allowTeams ? teamsCompulsory : false,
        max_team_size: allowTeams ? parseInt(maxTeamSize) : 1,
        status: draft ? "draft" : "upcoming",
        competition_type: competitionType,
      }).select().single();
      if (hErr) throw hErr;

      // ── Save CODING problems ──────────────────────────────────────────
      if (competitionType === "CODING") {
        for (let i = 0; i < problems.length; i++) {
          const prob = problems[i];
          const { data: problem, error: pErr } = await supabase.from("problems").insert({
            hackathon_id: hackathon.id, title: prob.title,
            slug: prob.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + i,
            description: prob.description, difficulty: prob.difficulty,
            time_limit_ms: Math.round(prob.time_limit_minutes * 60 * 1000),
            memory_limit_mb: prob.memory_limit_mb, points: prob.points,
            input_format: prob.input_format, constraints_text: prob.constraints,
            sample_input: prob.sample_input, sample_output: prob.sample_output,
            order_index: i,
          }).select().single();
          if (pErr) throw pErr;
          const validTCs = prob.test_cases.filter(tc => tc.input && tc.expected_output);
          if (validTCs.length > 0) {
            await supabase.from("test_cases").insert(validTCs.map((tc, tIdx) => ({
              problem_id: problem.id, input: tc.input, expected_output: tc.expected_output,
              is_hidden: tc.is_hidden, order_index: tIdx
            })));
          }
        }
      }

      // ── Save MULTI_TRACK categories + MCQ questions ───────────────────
      if (competitionType === "MULTI_TRACK") {
        for (const cat of categories) {
          const { data: savedCat, error: catErr } = await supabase
            .from("competition_categories").insert({
              hackathon_id: hackathon.id,
              name: cat.name,
              type: cat.type,
              description: cat.description || null,
              rubric_json: cat.rubric_json,
              max_score: cat.max_score,
              time_limit: cat.time_limit ? parseInt(cat.time_limit) : null,
              order_index: cat.order_index,
              is_active: true,
            }).select().single();
          if (catErr) throw catErr;

          // Save MCQ questions
          if (cat.type === "MCQ" && cat.mcq_questions.length > 0) {
            const { error: mcqErr } = await supabase.from("mcq_questions").insert(
              cat.mcq_questions.map((q, qi) => ({
                category_id: savedCat.id,
                question: q.question,
                options: q.options,
                correct_ans: q.correct_ans,
                marks: q.marks,
                order_index: qi,
              }))
            );
            if (mcqErr) throw mcqErr;
          }
        }
      }

      toast.success(draft ? "Saved as draft!" : "Hackathon submitted for approval! 🎉");
      router.push("/dashboard/organizer");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("Create hackathon error:", err);
      toast.error(msg || "Failed to create hackathon");
    } finally { setSubmitting(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-4xl mx-auto">

        {/* Step progress */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <button onClick={() => { if (i < step) setStep(i); }} type="button" className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i < step ? "bg-green-500 text-bg cursor-pointer hover:bg-green-400" : i === step ? "bg-accent text-bg" : "glass text-muted"}`}>
                  {i < step ? <Check size={14} /> : i + 1}
                </button>
                <button onClick={() => { if (i < step) setStep(i); }} type="button" className={`text-sm hidden md:block ${i < step ? "cursor-pointer hover:text-green-400" : ""} ${i === step ? "text-text" : "text-muted"}`}>{s}</button>
                {i < STEPS.length - 1 && <div className={`h-px flex-1 mx-2 hidden md:block ${i < step ? "bg-green-500" : "bg-border"}`} style={{ width: "40px" }} />}
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-8">

          {/* ── Step 0: Basic Info ── */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="font-display text-2xl font-bold mb-6">Basic Information</h2>

              {/* Competition Type Selector */}
              <div>
                <label className="text-sm text-muted mb-3 block font-medium">Competition Type *</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <CompetitionTypeCard
                    type="CODING"
                    label="Competitive Programming"
                    description="Participants solve algorithmic problems. Code is executed and graded by our custom Hunr AI judge."
                    icon={Code2}
                    selected={competitionType === "CODING"}
                    onClick={() => setCompetitionType("CODING")}
                  />
                  <CompetitionTypeCard
                    type="MULTI_TRACK"
                    label="Hackathons & Project Showcases"
                    description="Multiple competition tracks: Poster Making, Project Ideas, MCQ Quiz, GitHub repos, and more. Graded by Gemini AI."
                    icon={Layers}
                    selected={competitionType === "MULTI_TRACK"}
                    onClick={() => setCompetitionType("MULTI_TRACK")}
                  />
                </div>
              </div>

              <div className="border-t border-border/50 pt-5">
                <div>
                  <label className="text-sm text-muted mb-2 block">Hackathon / Event Title *</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} className="input-glass" placeholder="e.g. Visio Spark 2025 · Annual Computing Festival" />
                </div>
                <div className="mt-4">
                  <label className="text-sm text-muted mb-2 block">Description *</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5} className="input-glass resize-none" placeholder="What is this event about? Tracks, theme, what to expect..." />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="text-sm text-muted mb-2 block">Start Date & Time *</label>
                    <input type="datetime-local" value={startTime} min={nowLocal()} onChange={e => setStartTime(e.target.value)} className="input-glass" />
                  </div>
                  <div>
                    <label className="text-sm text-muted mb-2 block">End Date & Time *</label>
                    <input type="datetime-local" value={endTime} min={startTime || nowLocal()} onChange={e => setEndTime(e.target.value)} className="input-glass" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="text-sm text-muted mb-2 block">Max Participants <Tip text="Minimum 2." /></label>
                    <input type="number" value={maxParticipants} min="2" onChange={e => setMaxParticipants(String(Math.max(2, parseInt(e.target.value) || 2)))} className="input-glass" />
                  </div>
                  <div>
                    <label className="text-sm text-muted mb-2 block">Registration Fee (PKR)</label>
                    <input type="number" value={registrationFee} min="0" onChange={e => setRegistrationFee(String(Math.max(0, parseInt(e.target.value) || 0)))} className="input-glass" placeholder="0 for free" />
                    {parseInt(registrationFee) === 0 && <p className="text-xs text-green-400 mt-1">✓ Free event</p>}
                  </div>
                </div>
                {parseInt(registrationFee) > 0 && (
                  <div className="mt-4 glass rounded-xl p-5 border border-amber-500/20 space-y-4">
                    <h4 className="text-sm font-semibold text-amber-400 flex items-center gap-2">💳 Payment Details — shown to participants</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted mb-1.5 block">Payment Method *</label>
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input-glass">
                          <option value="jazzcash">JazzCash</option>
                          <option value="easypaisa">Easypaisa</option>
                          <option value="sadapay">SadaPay</option>
                          <option value="nayapay">NayaPay</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="meezan">Meezan Bank</option>
                          <option value="hbl">HBL</option>
                          <option value="ubl">UBL</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted mb-1.5 block">Account Name *</label>
                        <input value={paymentAccountName} onChange={e => setPaymentAccountName(e.target.value)} className="input-glass" placeholder="Muhammad Ali" />
                      </div>
                    </div>
                    {paymentMethod === "other" && (
                      <div>
                        <label className="text-xs text-muted mb-1.5 block">Bank Name *</label>
                        <input value={paymentBankName} onChange={e => setPaymentBankName(e.target.value)} className="input-glass" placeholder="e.g. Allied Bank" />
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-muted mb-1.5 block">Account / Wallet Number *</label>
                      <input value={paymentAccountNumber} onChange={e => setPaymentAccountNumber(e.target.value)} className="input-glass" placeholder="03001234567" />
                    </div>
                    <div>
                      <label className="text-xs text-muted mb-1.5 block">Instructions (optional)</label>
                      <textarea value={paymentInstructions} onChange={e => setPaymentInstructions(e.target.value)} rows={2} className="input-glass resize-none" />
                    </div>
                  </div>
                )}
                <div className="mt-4">
                  <label className="text-sm text-muted mb-2 block">Tags (comma-separated)</label>
                  <input value={tags} onChange={e => setTags(e.target.value)} className="input-glass" placeholder="AI, Web Dev, Poster Making, Beginner Friendly" />
                </div>
                <div className="mt-4">
                  <label className="text-sm text-muted mb-2 block">Prize Details (optional)</label>
                  <textarea value={prizeDetails} onChange={e => setPrizeDetails(e.target.value)} rows={3} className="input-glass resize-none" placeholder={"1st: PKR 50,000\n2nd: PKR 25,000\n3rd: PKR 10,000"} />
                </div>
                <div className="mt-4">
                  <label className="text-sm text-muted mb-2 block">Rules & Guidelines (optional)</label>
                  <textarea value={rules} onChange={e => setRules(e.target.value)} rows={4} className="input-glass resize-none" placeholder={"1. Teams of 1–4 members\n2. No plagiarism\n3. Judges' decisions are final"} />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1 (CODING): Problems ── */}
          {step === 1 && competitionType === "CODING" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-2xl font-bold">Problems</h2>
                <button onClick={addProblem} className="btn-secondary !py-2 !px-4 text-sm flex items-center gap-2"><Plus size={14} /> Add Problem</button>
              </div>
              <div className="mb-5 p-4 bg-accent/5 border border-accent/15 rounded-xl text-xs text-muted space-y-1.5">
                <p><span className="text-accent font-semibold">Sample Input/Output</span> — Shown to participants as example. Not used for grading.</p>
                <p><span className="text-accent font-semibold">Test Cases</span> — Used to grade submissions. Mark Hidden so participants can't see expected answers.</p>
              </div>
              <div className="space-y-8">
                {problems.map((prob, pi) => (
                  <div key={pi} className="border border-border rounded-xl p-6 bg-surface/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-semibold text-lg">Problem {String.fromCharCode(65 + pi)}</span>
                      {problems.length > 1 && (
                        <button onClick={() => setProblems(p => p.filter((_, i) => i !== pi))} className="text-red-400 hover:text-red-300 flex items-center gap-1 text-xs"><Trash2 size={13} /> Remove</button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted mb-2 block">Title *</label>
                        <input value={prob.title} onChange={e => updateProblem(pi, { title: e.target.value })} className="input-glass" placeholder="e.g. Two Sum" />
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
                      <textarea value={prob.description} onChange={e => updateProblem(pi, { description: e.target.value })} rows={4} className="input-glass resize-none" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-sm text-muted mb-2 block">Points</label>
                        <input type="number" value={prob.points} min="1" onChange={e => updateProblem(pi, { points: Math.max(1, +e.target.value) })} className="input-glass" />
                      </div>
                      <div>
                        <label className="text-sm text-muted mb-2 block">Time Limit (min)</label>
                        <input type="number" value={prob.time_limit_minutes} min="0.5" step="0.5" onChange={e => updateProblem(pi, { time_limit_minutes: Math.max(0.5, +e.target.value) })} className="input-glass" />
                      </div>
                      <div>
                        <label className="text-sm text-muted mb-2 block">Memory (MB)</label>
                        <input type="number" value={prob.memory_limit_mb} min="16" onChange={e => updateProblem(pi, { memory_limit_mb: Math.max(16, +e.target.value) })} className="input-glass" />
                      </div>
                    </div>
                    <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                      <p className="text-xs text-amber-400 font-semibold mb-3">📋 Sample — shown to participants, does NOT grade</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-muted mb-1.5 block">Sample Input *</label>
                          <textarea value={prob.sample_input} onChange={e => updateProblem(pi, { sample_input: e.target.value })} rows={3} className="input-glass resize-none font-mono text-xs" />
                        </div>
                        <div>
                          <label className="text-xs text-muted mb-1.5 block">Sample Output *</label>
                          <textarea value={prob.sample_output} onChange={e => updateProblem(pi, { sample_output: e.target.value })} rows={3} className="input-glass resize-none font-mono text-xs" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm text-muted">Test Cases *</label>
                        <button onClick={() => addTestCase(pi)} className="text-xs text-accent hover:underline flex items-center gap-1"><Plus size={10} /> Add</button>
                      </div>
                      <div className="space-y-3">
                        {prob.test_cases.map((tc, ti) => (
                          <div key={ti} className="grid grid-cols-2 gap-3 p-3 bg-bg rounded-lg border border-border/50">
                            <div>
                              <label className="text-xs text-muted mb-1 block">Input</label>
                              <textarea value={tc.input} onChange={e => updateTestCase(pi, ti, { input: e.target.value })} rows={2} className="input-glass resize-none font-mono text-xs" />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs text-muted">Expected Output</label>
                                <div className="flex items-center gap-2">
                                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                                    <input type="checkbox" checked={tc.is_hidden} onChange={e => updateTestCase(pi, ti, { is_hidden: e.target.checked })} className="w-3 h-3 accent-accent" />
                                    <span className={tc.is_hidden ? "text-accent" : "text-muted"}>Hidden</span>
                                  </label>
                                  {prob.test_cases.length > 1 && (
                                    <button onClick={() => removeTestCase(pi, ti)} className="text-red-400/60 hover:text-red-400"><Trash2 size={11} /></button>
                                  )}
                                </div>
                              </div>
                              <textarea value={tc.expected_output} onChange={e => updateTestCase(pi, ti, { expected_output: e.target.value })} rows={2} className="input-glass resize-none font-mono text-xs" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 1 (MULTI_TRACK): Categories ── */}
          {step === 1 && competitionType === "MULTI_TRACK" && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold">Competition Categories</h2>
                <p className="text-muted text-sm mt-1">Define the tracks participants can compete in. Each track can have a different submission type and AI judge.</p>
              </div>
              <div className="p-4 bg-accent/5 border border-accent/15 rounded-xl text-xs text-muted space-y-1.5">
                <p><span className="text-accent font-semibold">Rubric</span> — Define criteria (e.g. Creativity 30%, Technical Depth 40%, Clarity 30%). The AI uses these weights to score submissions.</p>
                <p><span className="text-accent font-semibold">MCQ categories</span> — Auto-graded by the server. No AI needed, scores are instant.</p>
                <p><span className="text-accent font-semibold">All other types</span> — Graded by Gemini AI using your rubric. Human judges can override.</p>
              </div>
              <CategoryBuilder categories={categories} onChange={setCategories} />
            </div>
          )}

          {/* ── Step 2: Rules & Settings ── */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="font-display text-2xl font-bold mb-6">Rules & Settings</h2>
              {competitionType === "CODING" && (
                <>
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
                    <label className="text-sm text-muted mb-2 block">Scoring Method</label>
                    <select value={scoringMethod} onChange={e => setScoringMethod(e.target.value)} className="input-glass">
                      <option value="best_score">Best Score — highest scoring attempt counts</option>
                      <option value="first_correct">First Correct — first accepted submission wins</option>
                      <option value="last_submission">Last Submission — only final attempt counts</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-muted mb-2 block">Wrong Submission Penalty (points)</label>
                    <input type="number" value={penaltyPerWrong} min="0" onChange={e => setPenaltyPerWrong(String(Math.max(0, parseInt(e.target.value) || 0)))} className="input-glass" placeholder="0 = no penalty" />
                  </div>
                </>
              )}
              {competitionType === "MULTI_TRACK" && (
                <div className="p-4 bg-accent/5 border border-accent/15 rounded-xl text-sm text-muted">
                  <p className="text-accent font-semibold mb-1">🤖 AI Judge Settings</p>
                  <p>Scoring for multi-track events is handled per category using Gemini AI. Each category type (TEXT, IMAGE, FILE, URL) uses Gemini with the rubric you defined.</p>
                  <p className="mt-2">MCQ categories are auto-graded instantly. Human judges can override AI scores from the Judge Dashboard after the event.</p>
                </div>
              )}
              <div className="p-4 bg-surface rounded-xl border border-border space-y-4">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={allowTeams} onChange={e => setAllowTeams(e.target.checked)} id="teams" className="w-4 h-4 accent-accent" />
                  <label htmlFor="teams" className="text-sm cursor-pointer font-medium">Allow team participation</label>
                </div>
                {allowTeams && (
                  <div className="space-y-4 ml-7 mt-3 p-4 bg-surface/50 border border-border/50 rounded-xl">
                    <div>
                      <label className="text-sm text-muted mb-2 block">Max Team Size</label>
                      <input type="number" value={maxTeamSize} min="2" max="10" onChange={e => setMaxTeamSize(String(Math.min(10, Math.max(2, parseInt(e.target.value) || 2))))} className="input-glass w-32" />
                      <p className="text-xs text-muted mt-1">Between 2 and 10 members per team</p>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${teamsCompulsory ? "bg-accent border-accent text-bg" : "border-muted group-hover:border-accent/50"}`}>
                        {teamsCompulsory && <Check size={14} className="text-bg" />}
                      </div>
                      <div>
                        <span className="text-sm font-medium">Teams Compulsory</span>
                        <p className="text-xs text-muted">Participants MUST form or join a team to compete.</p>
                      </div>
                      <input type="checkbox" checked={teamsCompulsory} onChange={e => setTeamsCompulsory(e.target.checked)} className="hidden" />
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Review ── */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="font-display text-2xl font-bold mb-6">Review & Publish</h2>
              <div className="glass rounded-xl p-5 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted">Type</span><span className="font-medium">{competitionType === "CODING" ? "⚡ Coding Competition" : "🏆 Multi-Track Event"}</span></div>
                <div className="flex justify-between"><span className="text-muted">Title</span><span className="font-medium">{title}</span></div>
                <div className="flex justify-between"><span className="text-muted">Start</span><span>{startTime ? new Date(startTime).toLocaleString() : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted">End</span><span>{endTime ? new Date(endTime).toLocaleString() : "—"}</span></div>
                {startTime && endTime && (
                  <div className="flex justify-between"><span className="text-muted">Duration</span>
                    <span>{Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 3600000 * 10) / 10} hours</span>
                  </div>
                )}
                {competitionType === "CODING"
                  ? <div className="flex justify-between"><span className="text-muted">Problems</span><span>{problems.length}</span></div>
                  : <div className="flex justify-between"><span className="text-muted">Categories</span><span>{categories.length} tracks</span></div>
                }
                <div className="flex justify-between"><span className="text-muted">Max Participants</span><span>{maxParticipants}</span></div>
                <div className="flex justify-between"><span className="text-muted">Fee</span><span>{parseInt(registrationFee) > 0 ? `PKR ${registrationFee}` : "Free"}</span></div>
                <div className="flex justify-between"><span className="text-muted">Teams</span><span>{allowTeams ? `Yes (max ${maxTeamSize})${teamsCompulsory ? ' — Compulsory' : ''}` : "Individual"}</span></div>
              </div>

              {competitionType === "CODING" && (
                <div className="space-y-2">
                  {problems.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-accent font-bold">{String.fromCharCode(65 + i)}</span>
                        <span className="font-medium">{p.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full badge-${p.difficulty}`}>{p.difficulty}</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted text-xs">
                        <span>{p.points} pts</span>
                        <span>{p.time_limit_minutes}min</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {competitionType === "MULTI_TRACK" && (
                <div className="space-y-2">
                  {categories.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-accent font-bold">{i + 1}</span>
                        <span className="font-medium">{cat.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">{cat.type}</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted text-xs">
                        <span>{cat.max_score} pts max</span>
                        {cat.time_limit && <span>{cat.time_limit}min</span>}
                        {cat.type === "MCQ" && <span>{cat.mcq_questions.length} questions</span>}
                        {cat.type !== "MCQ" && <span>{cat.rubric_json.length} criteria</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 text-sm text-muted">
                ℹ️ Your event will be reviewed by an admin before going live. Drafts are private and only visible to you.
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
              <button onClick={goNext} className="btn-primary flex items-center gap-2">Next <ChevronRight size={16} /></button>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => handlePublish(true)} disabled={submitting} className="btn-secondary flex items-center gap-2">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : null} Save as Draft
                </button>
                <button onClick={() => handlePublish(false)} disabled={submitting} className="btn-primary flex items-center gap-2">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Submit for Approval
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}