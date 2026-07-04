import type { ExtractedIntent } from "@/types/intent";

export type { ExtractedIntent };

export type RecommendationGame = {
  id: string;
  title: string;
  rating: number | null;
  genres: string[] | null;
  platforms?: string[] | null;
  playtime?: number | null;
};

export type PreviousFeedback = {
  game_id: string;
  feedback_type: string;
};

export type UserPreferences = {
  favorite_genres: string[] | null;
  preferred_platforms?: string[] | null;
  play_style?: string | null;
  difficulty_preference: string | null;
  session_length_preference: string | null;
};

export type ScoredGame = RecommendationGame & {
  score: number;
  explanation: string;
  scoreBreakdown: {
    label: string;
    points: number;
  }[];
};

export type PreviousRecommendation = {
  game_id: string;
  created_at: string;
};