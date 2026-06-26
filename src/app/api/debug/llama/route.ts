import { NextRequest, NextResponse } from "next/server";

const SUPPORTED = ["python", "java", "c"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, language, problemTitle, problemDescription } = body;

    if (!code || !language) {
      return NextResponse.json({ error: "code and language are required" }, { status: 400 });
    }

    const customUrl = process.env.CUSTOM_AI_GRADER_URL;
    const customKey = process.env.CUSTOM_AI_GRADER_KEY;

    // === Try Llama ===
    if (customUrl && SUPPORTED.includes(language.toLowerCase())) {
      try {
        const res = await fetch(customUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(customKey ? { Authorization: `Bearer ${customKey}` } : {}),
          },
          body: JSON.stringify({
            problem: `${problemTitle || "Test"}\n\n${problemDescription || ""}`,
            code,
            language,
          }),
          signal: AbortSignal.timeout(30000),
        });
        const data = await res.json();
        return NextResponse.json({
          aiScore:        data.score          ?? 0,
          feedback:       data.feedback       ?? "",
          timeComplexity: data.time_complexity ?? "N/A",
          spaceComplexity:data.space_complexity?? "N/A",
          verdict:        data.category       ?? "UNKNOWN",
          status:         data.status         ?? "",
          suggestions:    data.suggestions    ?? [],
          plagiarismFlag: data.plagiarism_flag ?? false,
          gradedBy:       "custom_model",
        });
      } catch (llamaErr: any) {
        console.error("Llama failed:", llamaErr.message);
        return NextResponse.json({ error: `Llama unreachable: ${llamaErr.message}` }, { status: 503 });
      }
    }

    // === No model configured — return mock ===
    return NextResponse.json({
      aiScore: 75,
      feedback: "⚠️ No AI model connected yet. Set CUSTOM_AI_GRADER_URL in .env.local and restart server.",
      timeComplexity: "N/A",
      spaceComplexity: "N/A",
      verdict: "NOT_GRADED",
      status: "No model connected",
      suggestions: ["Connect your Colab model via ngrok", "Set CUSTOM_AI_GRADER_URL in .env.local"],
      plagiarismFlag: false,
      gradedBy: "fallback",
    });

  } catch (error: any) {
    console.error("Debug Llama route error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
