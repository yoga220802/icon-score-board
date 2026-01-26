import type { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "judge" | "participant";

export interface UserDoc {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  team_id?: string | null;
}

export interface Team {
  id: string;
  name: string;
  prodi: string;
  color: string;
  logo_url?: string | null;
  score_phase1: number;
  topic_phase2?: Phase2TopicSummary | null;
  drive_link_phase2?: string | null;
  ai_timer_remaining: number;
  ai_timer_last_started?: Timestamp | null;
  is_ai_active: boolean;
  total_score_phase2: number;
  total_score_phase3: number;
  final_score: number;
}

export type QuestionCategory = "GENERAL" | "LOGIC";

export interface Question {
  id: string;
  number: number;
  category: QuestionCategory;
  text: string;
  image_url?: string;
  options?: string[];
  answer_key: string;
  is_active: boolean;
}

export type GamePhase = "IDLE" | "PHASE_1" | "PHASE_2" | "PHASE_3";

export interface Phase2Topic {
  id: string;
  prodi: string;
  title: string;
  case_study: string;
}

export type Phase2TopicSummary = Omit<Phase2Topic, "id"> & { id: string };

export interface GameState {
  active_phase: GamePhase;
  p1_question_id: string | null;
  p1_show_question?: boolean;
  p1_show_answer: boolean;
  p1_timer_end: Timestamp | null;
  p1_timer_remaining?: number | null;
  p1_question_duration?: number | null;
  p1_answer_duration?: number | null;
  p1_answer_deadline?: Timestamp | null;
  p2_timer_end?: Timestamp | null;
  p2_timer_remaining?: number | null;
  p1_buzzer_open: boolean;
  p1_buzzer_locked_by: string | null;
  p1_pot_score: number;
  p3_active_team_id: string | null;
  p1_settings?: {
    general_count: number;
    logic_count: number;
    shuffle_questions: boolean;
  };
}

export type AssessmentPhase = "PHASE_2" | "PHASE_3";

export interface Assessment {
  judge_id: string;
  phase: AssessmentPhase;
  raw_scores: Record<string, number>;
  final_value: number;
}
