export type Role = "participant" | "organizer" | "admin";
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
  email_verified: boolean;
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
  max_team_size: number;
  prize_details?: string;
  registration_fee: number;
  rules?: string;
  payment_details?: string; // JSON: {method, account_name, account_number, instructions}
  status: HackathonStatus;
  is_approved: boolean;
  leaderboard_frozen: boolean;
  created_at: string;
  profiles?: Profile;
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
    };
  };
};