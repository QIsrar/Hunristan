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
  aiScore: number;          // 0-100 overall
  codeQuality?: number;     // 0-10 code quality score (from Gemini)
  feedback: string;         // human-readable review
  timeComplexity: string;   // "O(n)", etc.
  spaceComplexity: string;  // "O(1)", etc.
  verdict: string;          // "CORRECT", "INEFFICIENT", etc.
  status: string;           // "Passed", "Failed", etc.
  suggestions: string[];
  plagiarismFlag: boolean;
  gradedBy: "custom_model" | "gemini" | "fallback";
}

export async function gradeWithAI(input: GradingInput): Promise<GradingResult> {
  const customUrl = process.env.CUSTOM_AI_GRADER_URL;
  const customKey = process.env.CUSTOM_AI_GRADER_KEY;

  // === SLOT 1: Your Custom Llama Model ===
  const supportedByLlama = ["python", "java", "c", "cpp", "javascript"];
  if (customUrl && supportedByLlama.includes(input.language.toLowerCase())) {
    try {
      // EXACT MATCH WITH YOUR SERVER/TRAINING CODE
      const JUDGE_SYSTEM = 'You are the official AI Judge for a competitive coding hackathon. Evaluate the submitted code for the given problem. Respond in strict JSON format only with fields: status, time_complexity, space_complexity, feedback, score.';
      const userPrompt = `Problem: ${input.problemTitle}\nLanguage: ${input.language}\n\nSubmitted Code:\n${input.code}`;

      const res = await fetch(customUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(customKey ? { Authorization: `Bearer ${customKey}` } : {}),
        },
        body: JSON.stringify({
          // If your server expects an OpenAI-style 'messages' array:
          messages: [
            { role: "system", content: JUDGE_SYSTEM },
            { role: "user", content: userPrompt }
          ],
          // We also keep the old keys just in case your custom Flask/FastAPI server expects them directly:
          problem: input.problemTitle,
          code: input.code,
          language: input.language
        }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      
      // Map Llama names to our names based strictly on the model output
      return {
        aiScore: data.score ?? 0,
        feedback: data.feedback ?? "",
        timeComplexity: data.time_complexity ?? "N/A",
        spaceComplexity: data.space_complexity ?? "N/A",
        // The model returns 'category' (e.g. INEFFICIENT) and 'status' (e.g. Pass)
        verdict: data.category ?? "UNKNOWN",
        status: data.status === "Pass" ? "Passed" : "Failed",
        suggestions: [], // Model wasn't trained to give line-by-line suggestions
        plagiarismFlag: false,
        gradedBy: "custom_model",
      };
    } catch (err) {
      console.warn("Llama grader failed, falling back to Gemini:", err);
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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
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
    timeComplexity: "N/A",
    spaceComplexity: "N/A",
    verdict: input.verdict === "accepted" ? "CORRECT" : "WRONG",
    status: input.verdict === "accepted" ? "pass" : "fail",
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
