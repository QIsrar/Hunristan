import { NextRequest, NextResponse } from "next/server";

// Judge0 CE — free, no API key required
const JUDGE0_URL = process.env.JUDGE0_URL || "https://ce.judge0.com";

// Judge0 language IDs
const LANGUAGE_MAP: Record<string, number> = {
  python:     71,
  javascript: 63,
  typescript: 74,
  cpp:        54,
  c:          50,
  java:       62,
  go:         60,
  rust:       73,
  ruby:       72,
  kotlin:     78,
  swift:      83,
  php:        68,
  csharp:     51,
};

export async function POST(request: NextRequest) {
  try {
    const { language, code, stdin = "" } = await request.json();

    const languageId = LANGUAGE_MAP[language];
    if (!languageId) {
      return NextResponse.json({ error: `Unsupported language: ${language}` }, { status: 400 });
    }

    // Step 1: Create submission
    const createRes = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language_id: languageId,
        source_code: code,
        stdin,
        cpu_time_limit: 10,
        memory_limit: 262144, // 256MB in KB
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Judge0 error ${createRes.status}: ${err}`);
    }

    const result = await createRes.json();

    // Map Judge0 response to our Piston-compatible format
    const stdout = result.stdout || "";
    const stderr = result.stderr || result.compile_output || "";
    const exitCode = result.exit_code ?? (result.status?.id === 3 ? 0 : 1);

    // Status IDs: 3=Accepted, 4=Wrong Answer, 5=TLE, 6=Compilation Error, 11=Runtime Error
    if (result.status?.id === 6) {
      // Compilation error
      return NextResponse.json({
        run: { stdout: "", stderr: result.compile_output || "Compilation error", code: 1 }
      });
    }

    if (result.status?.id === 5) {
      return NextResponse.json({
        run: { stdout: "", stderr: "Time Limit Exceeded", code: 1 }
      });
    }

    return NextResponse.json({
      run: { stdout, stderr, code: exitCode }
    });

  } catch (error: any) {
    console.error("Code execution error:", error);
    return NextResponse.json(
      { error: "Code execution failed", detail: error?.message || String(error) },
      { status: 500 }
    );
  }
}