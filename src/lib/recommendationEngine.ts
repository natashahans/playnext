import type { ExtractedIntent } from "@/lib/mockIntentExtraction";

export type RecommendationGame = {
  id: string;
  title: string;
  rating: number | null;
  genres: string[] | null;
};

export type PreviousFeedback = {
  game_id: string;
  feedback_type: string;
};

export type ScoredGame = RecommendationGame & {
  score: number;
  explanation: string;
};

export function scoreGames(
  games: RecommendationGame[],
  intent: ExtractedIntent,
  previousFeedback: PreviousFeedback[] = []
): ScoredGame[] {
  return games
    .map((game) => {
      let score = 50;
      const reasons: string[] = [];

      if (
        intent.desiredExperience === "relaxing" &&
        game.genres?.includes("Relaxing")
      ) {
        score += 25;
        reasons.push("matches your relaxing experience preference");
      }

      if (intent.mood === "tired" && game.genres?.includes("Relaxing")) {
        score += 15;
        reasons.push("fits a low-energy mood");
      }

      if (game.rating && game.rating >= 4) {
        score += 10;
        reasons.push("has a strong rating");
      }

      const feedbackForGame = previousFeedback.filter(
        (feedback) => feedback.game_id === game.id
      );

      const negativeFeedbackCount = feedbackForGame.filter((feedback) =>
        ["not_in_mood", "too_long", "too_difficult", "not_interested"].includes(
          feedback.feedback_type
        )
      ).length;

      const positiveFeedbackCount = feedbackForGame.filter(
        (feedback) => feedback.feedback_type === "liked"
      ).length;

      if (negativeFeedbackCount > 0) {
        score -= negativeFeedbackCount * 20;
        reasons.push("was penalised because of previous negative feedback");
      }

      if (positiveFeedbackCount > 0) {
        score += positiveFeedbackCount * 10;
        reasons.push("was boosted because of previous positive feedback");
      }

      score = Math.max(0, Math.min(100, score));

      return {
        ...game,
        score,
        explanation:
          reasons.length > 0
            ? `Recommended because it ${reasons.join(", ")}.`
            : "Recommended as a balanced option from your collection.",
      };
    })
    .sort((a, b) => b.score - a.score);
}