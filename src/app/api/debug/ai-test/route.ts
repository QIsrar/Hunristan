import { NextResponse } from "next/server";
import { gradeWithAI } from "@/lib/aiGrading";

export async function POST(req: Request) {
  try {
    const { problem, code, language } = await req.json();

    if (!problem || !code || !language) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await gradeWithAI({
      problemTitle: problem,
      problemDescription: "",
      code,
      language,
      verdict: "accepted",
      testCasesPassed: 1,
      testCasesTotal: 1,
      executionTimeMs: 100,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI Debug Test Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
