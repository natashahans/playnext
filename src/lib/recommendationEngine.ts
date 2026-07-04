import type {
  ExtractedIntent,
  RecommendationGame,
  PreviousFeedback,
  UserPreferences,
  ScoredGame,
} from "@/lib/recommendation/types";

function hasMatch(values: string[] | null | undefined, target: string) {
  return values?.some((value) => value.toLowerCase() === target.toLowerCase());
}

function hasAnyMatch(
  values: string[] | null | undefined,
  targets: string[] | null | undefined
) {
  if (!values || !targets) return false;

  return targets.some((target) =>
    values.some((value) => value.toLowerCase() === target.toLowerCase())
  );
}

export function scoreGames(
  games: RecommendationGame[],
  intent: ExtractedIntent,
  previousFeedback: PreviousFeedback[] = [],
  preferences: UserPreferences | null = null
): ScoredGame[] {
  return games
    .map((game) => {
      let score = 40;
      const reasons: string[] = [];
      const scoreBreakdown: { label: string; points: number }[] = [];

      function addScore(label: string, points: number, reason: string) {
        score += points;
        scoreBreakdown.push({ label, points });
        reasons.push(reason);
      }

      function subtractScore(label: string, points: number, reason: string) {
        score -= points;
        scoreBreakdown.push({ label, points: -points });
        reasons.push(reason);
      }

      if (
        intent.desiredExperience &&
        intent.desiredExperience !== "unknown" &&
        hasMatch(game.genres, intent.desiredExperience)
      ) {
        addScore(
          "Desired experience match",
          20,
          "matches your desired experience"
        );
      }

      if (intent.mood === "tired" && hasMatch(game.genres, "Relaxing")) {
        addScore("Mood match", 15, "fits a low-energy mood");
      }

      if (
        intent.energyLevel === "low" &&
        (hasMatch(game.genres, "Relaxing") || hasMatch(game.genres, "Simulation"))
      ) {
        addScore("Energy fit", 15, "suits a lower-energy session");
      }

      if (
        intent.energyLevel === "high" &&
        (hasMatch(game.genres, "Action") || hasMatch(game.genres, "Shooter"))
      ) {
        addScore("Energy fit", 15, "fits a high-energy session");
      }

      if (
        preferences?.favorite_genres &&
        hasAnyMatch(game.genres, preferences.favorite_genres)
      ) {
        addScore(
          "Preference match",
          15,
          "matches your saved genre preferences"
        );
      }

      if (
        preferences?.preferred_platforms &&
        hasAnyMatch(game.platforms, preferences.preferred_platforms)
      ) {
        addScore(
          "Platform match",
          8,
          "matches one of your preferred platforms"
        );
      }

      if (game.rating && game.rating >= 4.2) {
        addScore("Rating", 10, "has a strong rating");
      } else if (game.rating && game.rating >= 3.5) {
        addScore("Rating", 5, "has a decent rating");
      }

      if (
        intent.difficultyPreference === "easy" &&
        (hasMatch(game.genres, "Relaxing") || hasMatch(game.genres, "Simulation"))
      ) {
        addScore("Difficulty fit", 10, "seems suitable for an easier session");
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
        subtractScore(
          "Previous negative feedback",
          negativeFeedbackCount * 18,
          "has been adjusted based on your previous negative feedback"
        );
      }

      if (positiveFeedbackCount > 0) {
        addScore(
          "Previous positive feedback",
          positiveFeedbackCount * 8,
          "has been boosted because you previously liked it"
        );
      }

      score = Math.max(0, Math.min(100, score));

      return {
        ...game,
        score,
        scoreBreakdown,
        explanation:
          reasons.length > 0
            ? `This looks like a strong fit because it ${reasons.join(", ")}.`
            : "This is a balanced option from your collection based on your current context.",
      };
    })
    .sort((a, b) => b.score - a.score);
}