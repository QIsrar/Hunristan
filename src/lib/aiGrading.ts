/**
 * AI GRADING INTEGRATION LAYER
 * ============================================================
 * This module is the integration point for your custom AI grading model.
 *
 * HOW TO PLUG IN YOUR OWN AI MODEL:
 * 1. Set CUSTOM_AI_GRADER_URL in .env (your model's endpoint)
 * 2. Set CUSTOM_AI_GRADER_KEY for auth
 * 3. Your endpoint should accept POST with { code, language, problem, testResults }
 *    and return { score: 0-100, verdict: string, feedback: string, metrics: {} }
 *
 * If CUSTOM_AI_GRADER_URL is not set, falls back to Gemini.
 * ============================================================
 */

export interface GradingInput {
  code: string;
  language: string;
  problemTitle: string;
  problemDescription: string;
  verdict: string; // from test runner
  testCasesPassed: number;
  testCasesTotal: number;
  executionTimeMs: number;
}

export interface GradingResult {
  aiScore: number;        // 0-100
  feedback: string;       // human-readable review
  codeQuality: number;    // 0-10
  timeComplexity: string; // "O(n)", "O(n log n)", etc.
  spaceComplexity: string;
  suggestions: string[];  // list of improvement suggestions
  plagiarismFlag: boolean;
  gradedBy: "custom_model" | "gemini" | "fallback";
}

export async function gradeWithAI(input: GradingInput): Promise<GradingResult> {
  const customUrl = process.env.CUSTOM_AI_GRADER_URL;
  const customKey = process.env.CUSTOM_AI_GRADER_KEY;

  // === SLOT 1: Your Custom AI Model ===
  if (customUrl) {
    try {
      const res = await fetch(customUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(customKey ? { Authorization: `Bearer ${customKey}` } : {}),
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`Custom grader returned ${res.status}`);
      const data = await res.json();
      return { ...data, gradedBy: "custom_model" };
    } catch (err) {
      console.warn("Custom AI grader failed, falling back to Gemini:", err);
    }
  }

  // === SLOT 2: Gemini Fallback ===
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const prompt = `You are an expert code reviewer for a competitive programming hackathon.

Problem: "${input.problemTitle}"
Language: ${input.language}
Test Results: ${input.testCasesPassed}/${input.testCasesTotal} cases passed
Verdict: ${input.verdict}
Execution Time: ${input.executionTimeMs}ms

Code:
\`\`\`${input.language}
${input.code.slice(0, 2000)}
\`\`\`

Analyze this code and respond ONLY with a valid JSON object (no markdown):
{
  "aiScore": <0-100 overall score>,
  "codeQuality": <0-10>,
  "timeComplexity": "<e.g. O(n log n)>",
  "spaceComplexity": "<e.g. O(n)>",
  "feedback": "<2-3 sentences constructive review>",
  "suggestions": ["<improvement 1>", "<improvement 2>"],
  "plagiarismFlag": false
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          signal: AbortSignal.timeout(10000),
        }
      );
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      return { ...parsed, gradedBy: "gemini" };
    } catch (err) {
      console.warn("Gemini grading failed:", err);
    }
  }

  // === SLOT 3: Rule-based fallback ===
  const passRate = input.testCasesTotal > 0 ? input.testCasesPassed / input.testCasesTotal : 0;
  return {
    aiScore: Math.round(passRate * 70 + (input.verdict === "accepted" ? 30 : 0)),
    codeQuality: Math.round(passRate * 10),
    timeComplexity: "Unknown",
    spaceComplexity: "Unknown",
    feedback: input.verdict === "accepted"
      ? "All test cases passed. Great work!"
      : `${input.testCasesPassed} of ${input.testCasesTotal} test cases passed.`,
    suggestions: ["Add comments to explain your approach", "Consider edge cases"],
    plagiarismFlag: false,
    gradedBy: "fallback",
  };
}

/**
 * WEBHOOK ENDPOINT for external AI model to push results back
 * Your AI model can also POST to: /api/ai-grade-callback
 * with { submission_id, ...GradingResult }
 */
