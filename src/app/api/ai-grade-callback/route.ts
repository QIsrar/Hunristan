import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/ai-grade-callback
 * Your custom AI model calls this endpoint to push grading results back.
 * Secure with WEBHOOK_SECRET in env.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET;
  const authHeader = request.headers.get("authorization");

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      submission_id,
      aiScore,
      codeQuality,
      timeComplexity,
      spaceComplexity,
      feedback,
      suggestions,
      plagiarismFlag,
    } = body;

    if (!submission_id) return NextResponse.json({ error: "submission_id required" }, { status: 400 });

    const supabase = await createClient();

    // Update the submission with AI grading results
    const { error } = await supabase.from("submissions").update({
      ai_score: aiScore,
      ai_feedback: feedback,
      // Store extended metrics in a metadata field
    }).eq("id", submission_id);

    if (error) throw error;

    // If plagiarism flagged, log security event
    if (plagiarismFlag) {
      const { data: sub } = await supabase.from("submissions")
        .select("user_id, hackathon_id").eq("id", submission_id).single();
      if (sub) {
        await supabase.from("security_logs").insert({
          user_id: sub.user_id,
          hackathon_id: sub.hackathon_id,
          violation_type: "plagiarism_suspected",
          severity: "high",
          metadata: { submission_id, aiScore },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("AI callback error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
