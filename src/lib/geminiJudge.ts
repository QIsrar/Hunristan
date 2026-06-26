/**
 * GEMINI JUDGE — Universal AI evaluation for multi-category submissions
 * =====================================================================
 * Uses Google Gemini API to evaluate TEXT, IMAGE, FILE, and URL submissions
 * against organizer-defined rubrics.
 *
 * CODE submissions are NOT handled here — they go through /api/submit (LLaMA-3).
 * MCQ submissions are auto-graded server-side — no AI needed.
 */

import type { RubricCriterion, JudgeResponse } from "@/types";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

// ── Shared helpers ─────────────────────────────────────────────────────────

function buildRubricPrompt(rubric: RubricCriterion[], maxScore: number): string {
  const criteriaList = rubric
    .map(c => `- ${c.name} (${c.weight}% of ${maxScore} pts): ${c.description}`)
    .join("\n");
  return `SCORING RUBRIC (total: ${maxScore} points):\n${criteriaList}`;
}

function buildSystemInstruction(categoryName: string, rubric: RubricCriterion[], maxScore: number): string {
  return `You are an expert competition judge evaluating a student submission for: "${categoryName}".

${buildRubricPrompt(rubric, maxScore)}

IMPORTANT: Respond ONLY with a valid JSON object — no markdown, no explanation outside JSON:
{
  "score": <integer 0 to ${maxScore}>,
  "breakdown": { ${rubric.map(c => `"${c.name}": <score>`).join(", ")} },
  "feedback": "<2-4 sentences of constructive, specific feedback>"
}`;
}

async function callGeminiText(
  apiKey: string,
  prompt: string,
  model: string = "gemini-2.5-flash"
): Promise<string> {
  const res = await fetch(
    `${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(25000),
    }
  );
  if (!res.ok) throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function parseJudgeResponse(raw: string, maxScore: number): JudgeResponse {
  const clean = raw.replace(/```(?:json)?|```/gi, "").trim();
  let parsed;
  try {
    // Try to find a JSON block
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      parsed = JSON.parse(clean);
    }
  } catch {
    throw new Error("No JSON found in Gemini response: " + raw.slice(0, 100));
  }
  return {
    score: Math.min(maxScore, Math.max(0, Math.round(parsed.score ?? 0))),
    breakdown: parsed.breakdown ?? {},
    feedback: parsed.feedback ?? "No feedback provided.",
    status: "DONE",
  };
}

// ── Evaluators ─────────────────────────────────────────────────────────────

/**
 * Evaluate a TEXT submission (Project Idea, Essay, Description)
 * Uses: Gemini 2.0 Flash (text-only)
 */
export async function judgeText(params: {
  content: string;
  categoryName: string;
  rubric: RubricCriterion[];
  maxScore: number;
}): Promise<JudgeResponse> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const systemPart = buildSystemInstruction(params.categoryName, params.rubric, params.maxScore);
  const prompt = `${systemPart}

SUBMISSION TEXT:
"""
${params.content.slice(0, 8000)}
"""

Evaluate the above submission according to the rubric and return the JSON verdict.`;

  const raw = await callGeminiText(apiKey, prompt);
  return parseJudgeResponse(raw, params.maxScore);
}

/**
 * Evaluate an IMAGE submission (Poster, Graphic Design)
 * Uses: Gemini 2.0 Flash Vision (inline image from URL)
 */
export async function judgeImage(params: {
  imageUrl: string;
  categoryName: string;
  rubric: RubricCriterion[];
  maxScore: number;
}): Promise<JudgeResponse> {
  const apiKey = process.env.GEMINI_API_KEY!;

  // Fetch the image and convert to base64
  const imgRes = await fetch(params.imageUrl, { signal: AbortSignal.timeout(15000) });
  if (!imgRes.ok) throw new Error(`Could not fetch image: ${params.imageUrl}`);
  const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
  const buffer = await imgRes.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  const systemPart = buildSystemInstruction(params.categoryName, params.rubric, params.maxScore);
  const prompt = `${systemPart}

The image above is the participant's submission. Evaluate it according to the rubric and return the JSON verdict.`;

  const res = await fetch(
    `${GEMINI_BASE}/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType: contentType, data: base64 } },
            { text: prompt },
          ],
        }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(30000),
    }
  );
  if (!res.ok) throw new Error(`Gemini Vision API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return parseJudgeResponse(raw, params.maxScore);
}

/**
 * Evaluate a FILE submission (PDF Report, PPTX Presentation)
 * Uses: Gemini 2.5 Flash
 *       falls back to passing the file as base64 if small enough
 */
export async function judgeFile(params: {
  fileUrl: string;
  fileName: string;
  categoryName: string;
  rubric: RubricCriterion[];
  maxScore: number;
}): Promise<JudgeResponse> {
  const apiKey = process.env.GEMINI_API_KEY!;

  // Fetch file
  const fileRes = await fetch(params.fileUrl, { signal: AbortSignal.timeout(20000) });
  if (!fileRes.ok) throw new Error(`Could not fetch file: ${params.fileUrl}`);
  const contentType = fileRes.headers.get("content-type") ?? "application/pdf";
  const buffer = await fileRes.arrayBuffer();

  // Limit to 20MB for inline data
  if (buffer.byteLength > 20 * 1024 * 1024) {
    throw new Error("File too large for AI evaluation (max 20MB)");
  }

  const base64 = Buffer.from(buffer).toString("base64");
  const systemPart = buildSystemInstruction(params.categoryName, params.rubric, params.maxScore);
  const prompt = `${systemPart}

The document above is the participant's submission ("${params.fileName}"). Read it carefully and evaluate according to the rubric. Return the JSON verdict.`;

  const res = await fetch(
    `${GEMINI_BASE}/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType: contentType, data: base64 } },
            { text: prompt },
          ],
        }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(45000),
    }
  );
  if (!res.ok) throw new Error(`Gemini File API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return parseJudgeResponse(raw, params.maxScore);
}

/**
 * Evaluate a GitHub URL submission (App Dev, Web Dev)
 * Fetches README.md (and optionally file tree) then passes to Gemini
 */
export async function judgeGitHub(params: {
  githubUrl: string;
  categoryName: string;
  rubric: RubricCriterion[];
  maxScore: number;
}): Promise<JudgeResponse> {
  const apiKey = process.env.GEMINI_API_KEY!;

  // Parse owner/repo from various GitHub URL formats
  const match = params.githubUrl.match(
    /github\.com\/([^/]+)\/([^/?#]+)/
  );
  
  let repoMeta = "";
  let readmeContent = "";

  if (match) {
    const [, owner, repo] = match;
    const repoClean = repo.replace(/\.git$/, "");

    // Fetch README (try main then master branch)
    for (const branch of ["main", "master"]) {
      try {
        const readmeRes = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repoClean}/${branch}/README.md`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (readmeRes.ok) {
          readmeContent = await readmeRes.text();
          break;
        }
      } catch { /* try next */ }
    }

    // Fetch repo metadata via GitHub API
    try {
      const metaRes = await fetch(
        `https://api.github.com/repos/${owner}/${repoClean}`,
        { headers: { "Accept": "application/vnd.github.v3+json" }, signal: AbortSignal.timeout(8000) }
      );
      if (metaRes.ok) {
        const meta = await metaRes.json();
        repoMeta = `Repository: ${meta.full_name}
Description: ${meta.description ?? "None"}
Language: ${meta.language ?? "Unknown"}
Stars: ${meta.stargazers_count}
Topics: ${(meta.topics ?? []).join(", ") || "None"}
Last updated: ${meta.updated_at}`;
      }
    } catch { /* skip metadata */ }
  }

  const systemPart = buildSystemInstruction(params.categoryName, params.rubric, params.maxScore);
  const prompt = `${systemPart}

GITHUB REPOSITORY: ${params.githubUrl}
${repoMeta ? `\nREPOSITORY INFO:\n${repoMeta}\n` : ""}
${readmeContent
    ? `\nREADME.md CONTENT:\n"""\n${readmeContent.slice(0, 6000)}\n"""`
    : "\nNo README.md found in this repository."
  }

Evaluate this GitHub repository submission according to the rubric. Return the JSON verdict.`;

  const raw = await callGeminiText(apiKey, prompt);
  return parseJudgeResponse(raw, params.maxScore);
}

/**
 * Auto-grade an MCQ submission (no AI needed)
 * Returns a JudgeResponse-compatible object
 */
export function gradeMcq(params: {
  answers: Record<string, string>;       // { "<question_id>": "A" }
  questions: { id: string; correct_ans: string; marks: number }[];
  maxScore: number;
}): JudgeResponse {
  let earned = 0;
  let total = 0;
  const breakdown: Record<string, number> = {};

  for (const q of params.questions) {
    total += q.marks;
    const userAns = params.answers[q.id] ?? "";
    const isCorrect = userAns.toUpperCase() === q.correct_ans.toUpperCase();
    if (isCorrect) earned += q.marks;
    breakdown[`Q:${q.id.slice(0, 8)}`] = isCorrect ? q.marks : 0;
  }

  const scaledScore = total > 0 ? Math.round((earned / total) * params.maxScore) : 0;
  return {
    score: scaledScore,
    breakdown,
    feedback: `Auto-graded: ${earned}/${total} marks earned (${Math.round((earned / total) * 100)}% correct).`,
    status: "DONE",
  };
}
