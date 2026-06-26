export type Role = "participant" | "organizer" | "admin";

// ================================================================
// MULTI-CATEGORY PLATFORM TYPES
// ================================================================

/** Discriminated union for what kind of submission a category accepts */
export type CategoryType = "CODE" | "TEXT" | "IMAGE" | "FILE" | "MCQ" | "URL";

/** Competition type on a hackathon */
export type CompetitionType = "CODING" | "MULTI_TRACK";

/** AI judging pipeline status */
export type AiStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED";

/** A single rubric criterion used by the AI judge */
export interface RubricCriterion {
  name: string;         // e.g. "Creativity"
  weight: number;       // 0-100, all weights should sum to 100
  description: string;  // hint shown to participant
}

/** One track / event inside a multi-track hackathon */
export interface CompetitionCategory {
  id: string;
  hackathon_id: string;
  name: string;
  type: CategoryType;
  description?: string;
  rubric_json: RubricCriterion[];
  max_score: number;
  time_limit?: number;   // minutes
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** One question inside an MCQ category */
export interface McqQuestion {
  id: string;
  category_id: string;
  question: string;
  options: string[];     // ["Option A", "Option B", "Option C", "Option D"]
  correct_ans: string;   // "A" | "B" | "C" | "D"  — never sent to client via RLS
  marks: number;
  order_index: number;
  created_at: string;
}

/** Per-criterion AI score breakdown */
export type AiBreakdown = Record<string, number>;

/** Universal submission for any category type */
export interface SubmissionV2 {
  id: string;
  category_id: string;
  hackathon_id: string;
  participant_id: string;
  team_id?: string;

  // Content fields — only the relevant one is populated
  code_content?: string;
  text_content?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  github_url?: string;
  mcq_answers?: Record<string, string>;  // { "<question_id>": "A" }

  // AI verdict
  ai_score?: number;
  ai_feedback?: string;
  ai_breakdown?: AiBreakdown;
  ai_status: AiStatus;
  ai_error?: string;

  // Human override
  human_score?: number;
  human_feedback?: string;
  human_judged_by?: string;
  human_judged_at?: string;

  // Computed final score
  final_score?: number;

  submitted_at: string;
  updated_at: string;

  // Joined relations (optional)
  competition_categories?: CompetitionCategory;
  profiles?: { full_name: string; avatar_url?: string };
}

/** Payload sent to POST /api/judge */
export interface JudgeRequest {
  submission_id: string;
  category_type: CategoryType;   // MCQ is auto-graded server-side, all others use AI
  text_content?: string;
  file_url?: string;
  github_url?: string;
  rubric?: RubricCriterion[];
  max_score?: number;
}

/** Response from POST /api/judge */
export interface JudgeResponse {
  score: number;
  breakdown: AiBreakdown;
  feedback: string;
  status: "DONE" | "FAILED";
  error?: string;
}

export type HackathonStatus = "draft" | "active" | "upcoming" | "ended" | "suspended";
export type Verdict = "accepted" | "wrong_answer" | "time_limit_exceeded" | "runtime_error" | "compilation_error" | "pending";
export type Difficulty = "easy" | "medium" | "hard";
export type PaymentStatus = "not_required" | "pending" | "verified" | "rejected";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  university?: string;
  organization?: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  github_url?: string;
  linkedin_url?: string;
  total_points: number;
  problems_solved: number;
  hackathons_participated: number;
  best_rank?: number;
  is_banned: boolean;
  email_verified?: boolean;
  created_at: string;
}

export interface Hackathon {
  id: string;
  organizer_id: string;
  title: string;
  slug: string;
  description: string;
  banner_url?: string;
  tags: string[];
  start_time: string;
  end_time: string;
  max_participants?: number;
  participant_count: number;
  allowed_languages: string[];
  scoring_method: "first_correct" | "best_score" | "last_submission";
  penalty_per_wrong: number;
  allow_teams: boolean;
  teams_compulsory?: boolean;
  max_team_size: number;
  prize_details?: string;
  registration_fee: number;
  rules?: string;
  payment_details?: string; // JSON: {method, account_name, account_number, instructions}
  status: HackathonStatus;
  is_approved: boolean;
  leaderboard_frozen: boolean;
  competition_type: CompetitionType;
  created_at: string;
  profiles?: Profile;
  competition_categories?: CompetitionCategory[];
}

export interface Problem {
  id: string;
  hackathon_id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: Difficulty;
  time_limit_ms: number;
  memory_limit_mb: number;
  points: number;
  input_format?: string;
  output_format?: string;
  constraints?: string;
  sample_input?: string;
  sample_output?: string;
  explanation?: string;
  order_index: number;
}

export interface TestCase {
  id: string;
  problem_id: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
  order_index: number;
}

export interface Submission {
  id: string;
  hackathon_id: string;
  problem_id: string;
  user_id: string;
  language: string;
  code: string;
  verdict: Verdict;
  score: number;
  max_score: number;
  execution_time_ms?: number;
  memory_used_mb?: number;
  test_cases_passed: number;
  test_cases_total: number;
  ai_feedback?: string;
  ai_score?: number;
  error_message?: string;
  submitted_at: string;
  problems?: Problem;
  hackathons?: Hackathon;
}

export interface LeaderboardEntry {
  id: string;
  hackathon_id: string;
  user_id: string;
  rank?: number;
  total_score: number;
  problems_solved: number;
  last_submission_at?: string;
  penalty_minutes: number;
  profiles?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface Mentor {
  id: string;
  name: string;
  bio?: string;
  expertise: string[];
  avatar_url?: string;
  linkedin_url?: string;
  github_url?: string;
  is_active: boolean;
}

export interface Project {
  id: string;
  hackathon_id?: string;
  team_name: string;
  project_title: string;
  description: string;
  demo_url?: string;
  github_url?: string;
  technologies: string[];
  rank_achieved?: number;
  is_featured: boolean;
  hackathons?: Hackathon;
}

// Piston API types
export interface PistonRunResult {
  language: string;
  version: string;
  run: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
  compile?: {
    stdout: string;
    stderr: string;
    code: number;
  };
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      hackathons: { Row: Hackathon; Insert: Partial<Hackathon>; Update: Partial<Hackathon> };
      problems: { Row: Problem; Insert: Partial<Problem>; Update: Partial<Problem> };
      test_cases: { Row: TestCase; Insert: Partial<TestCase>; Update: Partial<TestCase> };
      submissions: { Row: Submission; Insert: Partial<Submission>; Update: Partial<Submission> };
      leaderboard: { Row: LeaderboardEntry; Insert: Partial<LeaderboardEntry>; Update: Partial<LeaderboardEntry> };
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification> };
      mentors: { Row: Mentor; Insert: Partial<Mentor>; Update: Partial<Mentor> };
      projects: { Row: Project; Insert: Partial<Project>; Update: Partial<Project> };
      // Multi-category platform tables
      competition_categories: { Row: CompetitionCategory; Insert: Partial<CompetitionCategory>; Update: Partial<CompetitionCategory> };
      mcq_questions: { Row: McqQuestion; Insert: Partial<McqQuestion>; Update: Partial<McqQuestion> };
      submissions_v2: { Row: SubmissionV2; Insert: Partial<SubmissionV2>; Update: Partial<SubmissionV2> };
    };
  };
};