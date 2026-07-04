import type { ExtractedIntent } from "@/lib/mockIntentExtraction";

export type RecommendationGame = {
  id: string;
  title: string;
  rating: number | null;
  genres: string[] | null;
};

export type ScoredGame = RecommendationGame & {
  score: number;
  explanation: string;
};

export function scoreGames(
  games: RecommendationGame[],
  intent: ExtractedIntent
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