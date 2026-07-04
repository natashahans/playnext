import { buildExplanation } from "@/lib/recommendation/explain";
import type {
  ExtractedIntent,
  RecommendationGame,
  PreviousFeedback,
  PreviousRecommendation,
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

function hasRelaxingSignal(text: string | null | undefined) {
  if (!text) return false;

  const value = text.toLowerCase();

  return ["relaxing", "relax", "chill", "calm", "cozy", "cosy", "peaceful"].some(
    (word) => value.includes(word)
  );
}

function gameHasRelaxingGenre(game: RecommendationGame) {
  return game.genres?.some((genre) =>
    ["Relaxing", "Simulation", "Casual", "Cozy", "Adventure"].some(
      (target) => genre.toLowerCase() === target.toLowerCase()
    )
  );
}

function getEstimatedPlaytime(game: RecommendationGame) {
  if (game.playtime) return game.playtime;

  if (hasMatch(game.genres, "Roguelike")) return 10;
  if (hasMatch(game.genres, "Platformer")) return 15;
  if (hasMatch(game.genres, "Puzzle")) return 15;
  if (hasMatch(game.genres, "Casual")) return 15;
  if (hasMatch(game.genres, "Simulation")) return 25;
  if (hasMatch(game.genres, "Relaxing")) return 25;
  if (hasMatch(game.genres, "Shooter")) return 35;
  if (hasMatch(game.genres, "Action")) return 40;
  if (hasMatch(game.genres, "RPG")) return 60;
  if (hasMatch(game.genres, "Adventure")) return 45;

  return 30;
}

function estimateSessionFit(game: RecommendationGame, availableTime: number | null) {
  if (!availableTime) return null;

  const estimatedPlaytime = getEstimatedPlaytime(game);

  if (availableTime <= 30) {
    if (estimatedPlaytime <= 10) return "short-good";
    if (estimatedPlaytime >= 40) return "short-bad";
  }

  if (availableTime <= 60) {
    if (estimatedPlaytime <= 25) return "medium-good";
    if (estimatedPlaytime >= 60) return "medium-bad";
  }

  if (availableTime >= 120) {
    if (estimatedPlaytime >= 30) return "long-good";
  }

  return null;
}

export function scoreGames(
  games: RecommendationGame[],
  intent: ExtractedIntent,
  previousFeedback: PreviousFeedback[] = [],
  preferences: UserPreferences | null = null,
  previousRecommendations: PreviousRecommendation[] = []
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
        addScore("Desired experience match", 20, "matches your desired experience");
      }

      if (
        hasRelaxingSignal(intent.desiredExperience) &&
        gameHasRelaxingGenre(game)
      ) {
        addScore(
          "Relaxing/cozy fit",
          20,
          "fits the relaxing or cozy experience you asked for"
        );
      }

      if (intent.mood === "tired" && hasMatch(game.genres, "Relaxing")) {
        addScore("Mood match", 15, "fits a low-energy mood");
      }

      if (intent.energyLevel === "low" && gameHasRelaxingGenre(game)) {
        addScore("Energy fit", 15, "suits a lower-energy session");
      }

      if (
        intent.energyLevel === "high" &&
        (hasMatch(game.genres, "Action") || hasMatch(game.genres, "Shooter"))
      ) {
        addScore("Energy fit", 15, "fits a high-energy session");
      }

      const sessionFit = estimateSessionFit(game, intent.availableTime);

      if (sessionFit === "short-good") {
        addScore(
          "Time fit",
          15,
          "works well for the short amount of time you have"
        );
      }

      if (sessionFit === "short-bad") {
        subtractScore(
          "Time mismatch",
          18,
          "may be too large for the short session you described"
        );
      }

      if (sessionFit === "medium-good") {
        addScore(
          "Time fit",
          10,
          "fits reasonably well into your available time"
        );
      }

      if (sessionFit === "medium-bad") {
        subtractScore(
          "Time mismatch",
          10,
          "may be too long for the time you have right now"
        );
      }

      if (sessionFit === "long-good") {
        addScore(
          "Time fit",
          10,
          "fits a longer play session"
        );
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

      if (intent.difficultyPreference === "easy" && gameHasRelaxingGenre(game)) {
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

      const timesRecentlyRecommended = previousRecommendations.filter(
        (recommendation) => recommendation.game_id === game.id
      ).length;

      if (timesRecentlyRecommended > 0) {
        subtractScore(
          "Recently recommended penalty",
          timesRecentlyRecommended * 10,
          "was slightly reduced to avoid repeating the same recommendation too often"
        );
      }

      score = Math.max(0, Math.min(100, score));

      return {
        ...game,
        score,
        scoreBreakdown,
        explanation: buildExplanation(reasons),
      };
    })
    .sort((a, b) => b.score - a.score);
}