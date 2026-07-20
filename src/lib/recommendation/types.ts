import type { ExtractedIntent } from "@/types/intent";

export type { ExtractedIntent };

export type RecommendationMode = "collection" | "discovery";

export type RecommendationGame = {
  id: string;
  rawg_id?: number | null;
  slug?: string | null;
  source?: RecommendationMode;
  title: string;
  background_image?: string | null;
  released?: string | null;
  rating: number | null;
  genres: string[] | null;
  platforms?: string[] | null;
  playtime?: number | null;
  tags?: string[] | null;
  status?: string | null;
};

export type FeedbackGameSnapshot = {
  id: string;
  rawg_id?: number | null;
  genres: string[] | null;
  platforms?: string[] | null;
  playtime?: number | null;
  tags?: string[] | null;
};

export type PreviousFeedback = {
  game_id: string;
  feedback_type: string;
  reason?: string | null;
  created_at?: string | null;
  game?: FeedbackGameSnapshot | null;
};

export type UserPreferences = {
  favorite_genres: string[] | null;
  preferred_platforms?: string[] | null;
  play_style?: string | null;
  difficulty_preference: string | null;
  session_length_preference: string | null;
};

export type ScoreBreakdownItem = {
  category: "Live context" | "Saved preferences" | "Learned feedback" | "Recommendation history" | "Game quality";
  label: string;
  points: number;
  detail: string;
};

export type ScoredGame = RecommendationGame & {
  score: number;
  confidenceBand: "low" | "medium" | "high";
  isEligible: boolean;
  exclusionReasons: string[];
  explanation: string;
  scoreBreakdown: ScoreBreakdownItem[];
  matchReasons: string[];
  cautions: string[];
};

export type PreviousRecommendation = {
  game_id: string;
  rawg_id?: number | null;
  created_at: string;
};
