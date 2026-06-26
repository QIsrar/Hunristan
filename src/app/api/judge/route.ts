import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  judgeText, judgeImage, judgeFile, judgeGitHub, gradeMcq,
} from "@/lib/geminiJudge";
import type { JudgeRequest } from "@/types";

export async function POST(req: NextRequest) {
  const body: JudgeRequest = await req.json();
  const { submission_id, category_type, text_content, file_url, github_url, rubric, max_score } = body;

  if (!submission_id) {
    return NextResponse.json({ error: "submission_id required" }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    // ── Fetch submission + category context ──────────────────────────────
    const { data: sub, error: subErr } = await supabase
      .from("submissions_v2")
      .select("*, competition_categories(name, type, rubric_json, max_score)")
      .eq("id", submission_id)
      .single();

    if (subErr || !sub) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Mark as PROCESSING
    await supabase.from("submissions_v2").update({ ai_status: "PROCESSING" }).eq("id", submission_id);

    const categoryName = (sub.competition_categories as any)?.name ?? "Competition";
    const effectiveRubric = rubric ?? (sub.competition_categories as any)?.rubric_json ?? [];
    const effectiveMaxScore = max_score ?? (sub.competition_categories as any)?.max_score ?? 100;

    let result;

    // ── Route to correct evaluator ───────────────────────────────────────
    switch (category_type) {

      case "TEXT": {
        const content = text_content ?? sub.text_content;
        if (!content) throw new Error("No text content to evaluate");
        result = await judgeText({ content, categoryName, rubric: effectiveRubric, maxScore: effectiveMaxScore });
        break;
      }

      case "IMAGE": {
        const imageUrl = file_url ?? sub.file_url;
        if (!imageUrl) throw new Error("No image URL to evaluate");
        result = await judgeImage({ imageUrl, categoryName, rubric: effectiveRubric, maxScore: effectiveMaxScore });
        break;
      }

      case "FILE": {
        const fileUrlVal = file_url ?? sub.file_url;
        const fileName = sub.file_name ?? "document";
        if (!fileUrlVal) throw new Error("No file URL to evaluate");
        result = await judgeFile({ fileUrl: fileUrlVal, fileName, categoryName, rubric: effectiveRubric, maxScore: effectiveMaxScore });
        break;
      }

      case "URL": {
        const ghUrl = github_url ?? sub.github_url;
        if (!ghUrl) throw new Error("No GitHub URL to evaluate");
        result = await judgeGitHub({ githubUrl: ghUrl, categoryName, rubric: effectiveRubric, maxScore: effectiveMaxScore });
        break;
      }

      case "MCQ": {
        // Auto-grade — use admin client to bypass RLS on correct_ans
        const adminClient = await createAdminClient();
        const { data: questions } = await adminClient
          .from("mcq_questions")
          .select("id, correct_ans, marks")
          .eq("category_id", sub.category_id);

        if (!questions || questions.length === 0) {
          throw new Error("No MCQ questions found for this category");
        }
        result = gradeMcq({
          answers: sub.mcq_answers ?? {},
          questions,
          maxScore: effectiveMaxScore,
        });
        break;
      }

      default:
        return NextResponse.json({ error: `Unsupported category type: ${category_type}` }, { status: 400 });
    }

    // ── Save result to submissions_v2 ────────────────────────────────────
    const { error: updateErr } = await supabase.from("submissions_v2").update({
      ai_score: result.score,
      ai_feedback: result.feedback,
      ai_breakdown: result.breakdown,
      ai_status: "DONE",
      ai_error: null,
    }).eq("id", submission_id);

    if (updateErr) {
      console.error("Failed to save AI result:", updateErr);
    }

    return NextResponse.json(result);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/judge] Error:", message);

    // Best-effort: mark as FAILED
    try {
      const supabase = await createClient();
      await supabase.from("submissions_v2").update({
        ai_status: "FAILED",
        ai_error: message,
      }).eq("id", submission_id);
    } catch { /* best-effort */ }

    return NextResponse.json({ error: message, status: "FAILED" }, { status: 500 });
  }
}
