import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { gradeWithAI } from "@/lib/aiGrading";

const JUDGE0_URL = process.env.JUDGE0_URL || "https://ce.judge0.com";

const LANGUAGE_MAP: Record<string, number> = {
  python: 71, javascript: 63, typescript: 74,
  cpp: 54, c: 50, java: 62, go: 60, rust: 73,
  ruby: 72, kotlin: 78, swift: 83, php: 68, csharp: 51,
};

async function executeCode(
  language: string,
  code: string,
  stdin: string,
  timeLimitMs: number
): Promise<{ stdout: string; stderr: string; exitCode: number; time: number }> {
  const languageId = LANGUAGE_MAP[language];
  if (!languageId) throw new Error(`Unsupported language: ${language}`);

  const start = Date.now();
  const res = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language_id: languageId,
      source_code: code,
      stdin: stdin || "",
      cpu_time_limit: Math.min(20, Math.max(1, Math.ceil(timeLimitMs / 1000))),
      memory_limit: 262144,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Judge0 error ${res.status}: ${txt}`);
  }

  const data = await res.json();
  const stdout = data.stdout || "";
  const stderr = data.stderr || data.compile_output || "";

  if (data.status?.id === 5) return { stdout: "", stderr: "Time Limit Exceeded", exitCode: 1, time: timeLimitMs };
  if (data.status?.id === 6) return { stdout: "", stderr: data.compile_output || "Compilation Error", exitCode: 1, time: Date.now() - start };

  const exitCode = data.status?.id === 3 ? 0 : 1;
  return { stdout, stderr, exitCode, time: Date.now() - start };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {}
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { hackathon_id, problem_id, language, code, is_practice, tab_violations = 0 } = body;

    if (!problem_id || !language || !code) {
      return NextResponse.json({ error: "Missing required fields: problem_id, language, code" }, { status: 400 });
    }

    if (!LANGUAGE_MAP[language]) {
      return NextResponse.json({ error: `Language '${language}' not supported.` }, { status: 400 });
    }

    // Use service role to bypass RLS for reading problems + hidden test cases
    const adminClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: problem, error: probErr } = await adminClient
      .from("problems").select("*").eq("id", problem_id).single();
    if (!problem) {
      return NextResponse.json({ error: "Problem not found", detail: probErr?.message }, { status: 404 });
    }

    const { data: testCases, error: tcErr } = await adminClient
      .from("test_cases")
      .select("id, input, expected_output, is_hidden, order_index")
      .eq("problem_id", problem_id)
      .order("order_index");

    if (tcErr) {
      return NextResponse.json({ error: "Failed to load test cases", detail: tcErr.message }, { status: 500 });
    }

    if (!testCases?.length) {
      return NextResponse.json({ error: "No test cases found for this problem" }, { status: 400 });
    }

    let passed = 0;
    let verdict = "accepted";
    let errorMessage = "";
    let totalTime = 0;

    // Run all test cases
    const results = await Promise.all(
      testCases.map(tc => executeCode(language, code, tc.input || "", problem.time_limit_ms || 5000))
    );

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const result = results[i];
      totalTime = Math.max(totalTime, result.time);

      if (result.stderr?.toLowerCase().includes("compilation") || result.stderr?.toLowerCase().includes("compile")) {
        verdict = "compilation_error";
        errorMessage = result.stderr.slice(0, 500);
        break;
      }

      if (result.stderr === "Time Limit Exceeded") {
        verdict = "time_limit_exceeded";
        break;
      }

      if (result.exitCode !== 0) {
        verdict = "runtime_error";
        errorMessage = result.stderr.slice(0, 500);
        break;
      }

      const actual = result.stdout.trim().replace(/\r\n/g, "\n");
      const expected = (tc.expected_output || "").trim().replace(/\r\n/g, "\n");

      if (actual === expected) {
        passed++;
      } else if (verdict === "accepted") {
        verdict = "wrong_answer";
        errorMessage = tc.is_hidden
          ? "Wrong answer on hidden test case."
          : `Expected:\n${expected}\n\nGot:\n${actual}`;
      }
    }

    const finalVerdict = passed === testCases.length ? "accepted" : verdict;
    // Tab violation penalty: each switch costs 10% of score (max 50% penalty)
    const tabPenaltyPct = Math.min(0.5, tab_violations * 0.10);
    const baseScore = finalVerdict === "accepted"
      ? problem.points
      : Math.floor(problem.points * (passed / testCases.length));
    const score = Math.floor(baseScore * (1 - tabPenaltyPct));

    // AI Grading — non-blocking, skip if it fails
    let aiResult: Awaited<ReturnType<typeof gradeWithAI>> = { feedback: null as any, aiScore: null as any, timeComplexity: null as any, spaceComplexity: null as any, codeQuality: null as any, suggestions: null as any, plagiarismFlag: false, gradedBy: "fallback" };
    try {
      aiResult = await gradeWithAI({
        code, language,
        problemTitle: problem.title,
        problemDescription: problem.description?.slice(0, 500) || "",
        verdict: finalVerdict,
        testCasesPassed: passed,
        testCasesTotal: testCases.length,
        executionTimeMs: totalTime,
      });
    } catch (aiErr) {
      console.warn("AI grading failed (non-fatal):", aiErr);
    }

    // Save submission using regular client (user's auth)
    const { data: submission, error: subErr } = await supabase.from("submissions").insert({
      hackathon_id: is_practice ? null : (hackathon_id || null),
      problem_id,
      user_id: user.id,
      language,
      code,
      verdict: finalVerdict,
      score,
      max_score: problem.points,
      execution_time_ms: totalTime,
      test_cases_passed: passed,
      test_cases_total: testCases.length,
      ai_feedback: aiResult.feedback,
      ai_score: aiResult.aiScore,
      ai_time_complexity: aiResult.timeComplexity,
      ai_space_complexity: aiResult.spaceComplexity,
      ai_quality_score: aiResult.codeQuality,
      ai_suggestions: aiResult.suggestions,
      plagiarism_flag: aiResult.plagiarismFlag,
      error_message: errorMessage || null,
    }).select().single();

    if (subErr) {
      // Try with adminClient if RLS blocked it
      const { data: submission2, error: subErr2 } = await adminClient.from("submissions").insert({
        hackathon_id: is_practice ? null : (hackathon_id || null),
        problem_id,
        user_id: user.id,
        language,
        code,
        verdict: finalVerdict,
        score,
        max_score: problem.points,
        execution_time_ms: totalTime,
        test_cases_passed: passed,
        test_cases_total: testCases.length,
        ai_feedback: aiResult.feedback,
        ai_score: aiResult.aiScore,
        error_message: errorMessage || null,
      }).select().single();

      if (subErr2) {
        return NextResponse.json({ error: "Failed to save submission", detail: subErr2.message }, { status: 500 });
      }

      return NextResponse.json({ submission: submission2, verdict: finalVerdict, score, passed, total: testCases.length, ai: aiResult });
    }

    // Notification (non-fatal)
    try {
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "submission_result",
        title: finalVerdict === "accepted" ? "✅ Accepted!" : "❌ Submission Result",
        message: `${problem.title}: ${finalVerdict.replace(/_/g, " ")} — ${score}/${problem.points} pts`,
        link: is_practice ? `/practice` : `/arena/${hackathon_id}/${problem_id}`,
      });
    } catch {}

    return NextResponse.json({
      submission,
      verdict: finalVerdict,
      score,
      passed,
      total: testCases.length,
      ai: {
        feedback: aiResult.feedback,
        score: aiResult.aiScore,
        quality: aiResult.codeQuality,
        timeComplexity: aiResult.timeComplexity,
        spaceComplexity: aiResult.spaceComplexity,
        suggestions: aiResult.suggestions,
        gradedBy: aiResult.gradedBy,
      },
    });

  } catch (err: any) {
    console.error("Submit error:", err);
    return NextResponse.json({
      error: "Submission failed",
      detail: err?.message || String(err)
    }, { status: 500 });
  }
}