import { buildExplanation } from "@/lib/recommendation/explain";
import type {
  ExtractedIntent,
  PreviousFeedback,
  PreviousRecommendation,
  RecommendationGame,
  ScoreBreakdownItem,
  ScoredGame,
  UserPreferences,
} from "@/lib/recommendation/types";

type Evaluation = {
  points: number;
  label: string;
  detail: string;
  reasons: string[];
  cautions: string[];
};

const EXPERIENCE_SIGNALS: Record<string, string[]> = {
  relaxing: ["casual", "simulation", "puzzle", "family", "cozy", "relaxing", "peaceful", "wholesome", "meditative"],
  story: ["adventure", "rpg", "story rich", "narrative", "choices matter", "visual novel", "singleplayer"],
  action: ["action", "shooter", "fighting", "hack and slash", "combat", "fast-paced"],
  exploration: ["adventure", "open world", "exploration", "walking simulator", "metroidvania"],
  challenge: ["difficult", "souls-like", "hardcore", "roguelike", "roguelite", "precision platformer"],
  social: ["multiplayer", "co-op", "online co-op", "local co-op", "party"],
  creative: ["sandbox", "building", "crafting", "level editor", "simulation"],
  strategic: ["strategy", "tactical", "turn-based", "card", "management"],
  immersive: ["atmospheric", "open world", "rpg", "story rich", "exploration", "first-person"],
  funny: ["comedy", "funny", "parody", "satire", "family"],
  scary: ["horror", "survival horror", "psychological horror", "dark", "creepy", "lovecraftian"],
};

const SHORT_SESSION_SIGNALS = [
  "arcade", "casual", "puzzle", "platformer", "racing", "sports", "fighting", "roguelike", "roguelite", "card", "match 3",
];
const LONG_SESSION_SIGNALS = [
  "rpg", "open world", "strategy", "simulation", "management", "grand strategy", "4x", "massively multiplayer",
];
const DIFFICULT_SIGNALS = [
  "difficult", "souls-like", "hardcore", "roguelike", "roguelite", "precision platformer", "permadeath",
];
const LOW_ENERGY_SIGNALS = [
  "casual", "puzzle", "simulation", "turn-based", "story rich", "visual novel", "walking simulator", "cozy", "relaxing",
];
const HIGH_ENERGY_SIGNALS = [
  "action", "shooter", "fighting", "racing", "hack and slash", "fast-paced", "combat",
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isSameGame(
  game: Pick<RecommendationGame, "id" | "rawg_id">,
  reference: { game_id: string; rawg_id?: number | null }
) {
  return reference.game_id === game.id ||
    (game.rawg_id != null && reference.rawg_id === game.rawg_id);
}

function gameSignals(game: Pick<RecommendationGame, "genres" | "tags">) {
  return [...(game.genres ?? []), ...(game.tags ?? [])].map(normalize);
}

function matchesSignal(game: Pick<RecommendationGame, "genres" | "tags">, signals: string[]) {
  const values = gameSignals(game);
  return signals.some((signal) => {
    const target = normalize(signal);
    return values.some((value) => value === target || value.includes(target) || target.includes(value));
  });
}

function overlap(values: string[] | null | undefined, targets: string[] | null | undefined) {
  if (!values?.length || !targets?.length) return [];
  const normalizedTargets = targets.map(normalize);
  return values.filter((value) => {
    const normalizedValue = normalize(value);
    return normalizedTargets.some((target) =>
      normalizedValue === target ||
      (Math.min(normalizedValue.length, target.length) >= 4 &&
        (normalizedValue.includes(target) || target.includes(normalizedValue)))
    );
  });
}

function matchingGameTargets(game: RecommendationGame, targets: string[] | null | undefined) {
  return (targets ?? []).filter((target) => matchesSignal(game, [target]));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cappedEvaluation(
  points: number,
  min: number,
  max: number,
  label: string,
  detail: string,
  reasons: string[],
  cautions: string[]
): Evaluation {
  return { points: clamp(Math.round(points), min, max), label, detail, reasons, cautions };
}

function isShortSessionFriendly(game: RecommendationGame) {
  return matchesSignal(game, SHORT_SESSION_SIGNALS);
}

function isLongForm(game: RecommendationGame) {
  return matchesSignal(game, LONG_SESSION_SIGNALS) || (game.playtime ?? 0) >= 35;
}

function looksDifficult(game: RecommendationGame) {
  return matchesSignal(game, DIFFICULT_SIGNALS);
}

function evaluateLiveContext(game: RecommendationGame, intent: ExtractedIntent): Evaluation {
  let points = 0;
  const reasons: string[] = [];
  const cautions: string[] = [];

  if (intent.availableTime !== null) {
    if (intent.availableTime <= 30) {
      if (isShortSessionFriendly(game)) {
        points += 14;
        reasons.push("it works well for a short session");
      } else if (isLongForm(game)) {
        points -= 8;
        cautions.push("it may be harder to enjoy fully in a very short session");
      }
    } else if (intent.availableTime <= 75) {
      points += 4;
      reasons.push("it fits a flexible medium-length session");
      if (isShortSessionFriendly(game)) points += 3;
    } else if (intent.availableTime >= 120 && isLongForm(game)) {
      points += 10;
      reasons.push("your available time suits a deeper game");
    }
  }

  if (intent.energyLevel === "low" || ["tired", "stressed", "sad"].includes(intent.mood)) {
    if (matchesSignal(game, LOW_ENERGY_SIGNALS)) {
      points += 11;
      reasons.push("its pace suits your current energy");
    }
    if (matchesSignal(game, HIGH_ENERGY_SIGNALS) && !matchesSignal(game, LOW_ENERGY_SIGNALS)) {
      points -= 7;
      cautions.push("its intensity may ask for more energy than you have right now");
    }
  }

  if (intent.energyLevel === "high" || ["restless", "happy"].includes(intent.mood)) {
    if (matchesSignal(game, HIGH_ENERGY_SIGNALS)) {
      points += 11;
      reasons.push("its intensity matches your energy");
    }
  }

  intent.desiredExperiences.forEach((experience) => {
    const signals = EXPERIENCE_SIGNALS[experience];
    if (signals && matchesSignal(game, signals)) {
      points += 8;
      reasons.push(`it supports the ${experience} experience you asked for`);
    }
  });

  const requestedGenres = matchingGameTargets(game, intent.preferredGenres);
  if (requestedGenres.length > 0) {
    points += Math.min(12, requestedGenres.length * 6);
    reasons.push(`it matches your live genre request (${requestedGenres.slice(0, 2).join(" and ")})`);
  }

  const avoidedGenres = matchingGameTargets(game, intent.avoidedGenres);
  if (avoidedGenres.length > 0) {
    points -= 24;
    cautions.push(`it includes ${avoidedGenres.join(" and ")}, which you asked to avoid`);
  }

  if (intent.difficultyPreference === "hard") {
    if (looksDifficult(game)) {
      points += 10;
      reasons.push("its challenge level matches what you requested");
    } else {
      points -= 3;
    }
  } else if (intent.difficultyPreference === "easy") {
    if (looksDifficult(game)) {
      points -= 13;
      cautions.push("it may be more punishing than you want today");
    } else {
      points += 7;
      reasons.push("it appears suitable for a more forgiving session");
    }
  }

  if (intent.sessionPace === "fast" && matchesSignal(game, HIGH_ENERGY_SIGNALS)) points += 6;
  if (intent.sessionPace === "slow" && matchesSignal(game, LOW_ENERGY_SIGNALS)) points += 6;

  if (intent.multiplayerPreference === "solo" && matchesSignal(game, ["singleplayer"])) {
    points += 5;
    reasons.push("it supports the solo session you want");
  }
  if (intent.multiplayerPreference === "multiplayer" && matchesSignal(game, EXPERIENCE_SIGNALS.social)) {
    points += 8;
    reasons.push("it supports multiplayer or cooperative play");
  }

  if (intent.referenceGames.some((reference) => normalize(game.title).includes(normalize(reference)))) {
    points += 15;
    reasons.push("it directly matches a game you referenced");
  }

  return cappedEvaluation(points, -35, 40, "Current session fit", "Mood, time, energy and the experience requested now", reasons, cautions);
}

function evaluatePreferences(game: RecommendationGame, preferences: UserPreferences | null): Evaluation {
  let points = 0;
  const reasons: string[] = [];
  const cautions: string[] = [];

  if (!preferences) {
    return cappedEvaluation(0, 0, 18, "Saved taste", "No saved preference adjustment", reasons, cautions);
  }

  const favoriteGenreMatches = matchingGameTargets(game, preferences.favorite_genres);
  if (favoriteGenreMatches.length > 0) {
    points += Math.min(10, favoriteGenreMatches.length * 5);
    reasons.push(`it aligns with your saved taste in ${favoriteGenreMatches.slice(0, 2).join(" and ")}`);
  }

  const platformMatches = overlap(game.platforms, preferences.preferred_platforms);
  if (platformMatches.length > 0) {
    points += 4;
    reasons.push("it is available on a platform you prefer");
  }

  if (preferences.play_style === "story" && matchesSignal(game, EXPERIENCE_SIGNALS.story)) points += 5;
  if (preferences.play_style === "gameplay" && matchesSignal(game, HIGH_ENERGY_SIGNALS)) points += 5;
  if (preferences.play_style === "balanced") points += 2;

  if (preferences.difficulty_preference === "hard" && looksDifficult(game)) points += 4;
  if (preferences.difficulty_preference === "easy" && !looksDifficult(game)) points += 4;

  if (preferences.session_length_preference === "short" && isShortSessionFriendly(game)) points += 4;
  if (preferences.session_length_preference === "long" && isLongForm(game)) points += 4;

  return cappedEvaluation(points, 0, 18, "Saved preference fit", "Onboarding and Settings preferences used as supporting signals", reasons, cautions);
}

function feedbackGenreOverlap(game: RecommendationGame, feedback: PreviousFeedback) {
  return overlap(game.genres, feedback.game?.genres).length > 0;
}

function feedbackAgeInDays(item: PreviousFeedback) {
  if (!item.created_at) return 0;
  const timestamp = new Date(item.created_at).getTime();
  if (Number.isNaN(timestamp)) return 0;
  return Math.max(0, (Date.now() - timestamp) / 86_400_000);
}

function decayPenalty(points: number, ageInDays: number) {
  if (ageInDays < 14) return points;
  if (ageInDays < 60) return points * 0.65;
  if (ageInDays < 180) return points * 0.35;
  return points * 0.15;
}

function evaluateFeedback(
  game: RecommendationGame,
  feedback: PreviousFeedback[],
  intent: ExtractedIntent
): Evaluation {
  let points = 0;
  const reasons: string[] = [];
  const cautions: string[] = [];
  const exactFeedback = feedback.filter((item) =>
    isSameGame(game, { game_id: item.game_id, rawg_id: item.game?.rawg_id })
  );

  exactFeedback.forEach((item) => {
    const ageInDays = feedbackAgeInDays(item);

    if (item.feedback_type === "liked") {
      points += 8;
      reasons.push("you previously marked this as a good recommendation");
    }

    if (item.feedback_type === "not_in_mood") {
      points += decayPenalty(-22, ageInDays);
      cautions.push("you recently said this game did not fit your mood");
    }

    if (item.feedback_type === "too_long") {
      if (intent.availableTime !== null && intent.availableTime <= 45) {
        points += decayPenalty(-24, ageInDays);
        cautions.push("you previously found this too long for a short session");
      } else if (intent.availableTime === null || intent.availableTime < 120) {
        points += decayPenalty(-7, ageInDays);
      }
    }

    if (item.feedback_type === "too_difficult") {
      if (intent.difficultyPreference === "hard") {
        points -= 1;
      } else if (intent.difficultyPreference === "easy") {
        points += decayPenalty(-24, ageInDays);
        cautions.push("you previously found this more difficult than you wanted");
      } else {
        points += decayPenalty(-9, ageInDays);
      }
    }

    if (item.feedback_type === "not_interested") {
      points += decayPenalty(-30, ageInDays);
      cautions.push("you previously showed low interest in this game");
    }

    if (item.feedback_type === "already_played") points -= 40;
  });

  feedback.filter((item) =>
    !isSameGame(game, { game_id: item.game_id, rawg_id: item.game?.rawg_id })
  ).forEach((item) => {
    if (item.feedback_type === "liked" && feedbackGenreOverlap(game, item)) points += 2;
    if (
      item.feedback_type === "too_long" &&
      isLongForm(game) &&
      intent.availableTime !== null &&
      intent.availableTime <= 60
    ) points -= 4;
    if (
      item.feedback_type === "too_difficult" &&
      looksDifficult(game) &&
      intent.difficultyPreference !== "hard"
    ) points -= 5;
    if (item.feedback_type === "not_interested" && feedbackGenreOverlap(game, item)) points -= 2;
  });

  if (points > 0) reasons.push("it benefits from patterns in your previous feedback");
  if (points < -10) cautions.push("your earlier feedback suggests this may be a weaker personal fit");

  return cappedEvaluation(
    points,
    -45,
    15,
    "Feedback learning",
    "Context-aware feedback signals decay over time instead of permanently hiding games",
    reasons,
    cautions
  );
}

function evaluateHistory(game: RecommendationGame, history: PreviousRecommendation[]): Evaluation {
  const now = Date.now();
  const appearances = history.filter((item) => isSameGame(game, item));
  let points = 0;

  appearances.forEach((item) => {
    const ageInDays = (now - new Date(item.created_at).getTime()) / 86_400_000;
    if (ageInDays < 1) points -= 28;
    else if (ageInDays < 7) points -= 18;
    else if (ageInDays < 30) points -= 8;
    else points -= 2;
  });

  if (game.status === "completed") points -= 20;
  if (game.status === "playing") points += 4;

  const cautions = points < 0 ? ["it was reduced to keep recommendations varied"] : [];
  const reasons = points > 0 ? ["it is already in progress, making it easy to resume"] : [];

  return cappedEvaluation(points, -40, 5, "Variety and recency", "Avoids repetitive suggestions and considers collection status", reasons, cautions);
}

function evaluateQuality(game: RecommendationGame): Evaluation {
  const rating = game.rating ?? 0;
  let points = 0;
  const reasons: string[] = [];

  if (rating >= 4.5) points = 7;
  else if (rating >= 4.0) points = 5;
  else if (rating >= 3.5) points = 3;
  else if (rating > 0 && rating < 2.5) points = -2;

  if (points >= 5) reasons.push("it has a particularly strong player rating");

  return cappedEvaluation(points, -3, 7, "Quality signal", "RAWG rating used only as a tie-breaker", reasons, []);
}

function toBreakdown(
  category: ScoreBreakdownItem["category"],
  evaluation: Evaluation
): ScoreBreakdownItem {
  return {
    category,
    label: evaluation.label,
    points: evaluation.points,
    detail: evaluation.detail,
  };
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
      const context = evaluateLiveContext(game, intent);
      const savedPreferences = evaluatePreferences(game, preferences);
      const learnedFeedback = evaluateFeedback(game, previousFeedback, intent);
      const history = evaluateHistory(game, previousRecommendations);
      const quality = evaluateQuality(game);
      const evaluations = [context, savedPreferences, learnedFeedback, history, quality];
      const rawScore = 45 + evaluations.reduce((total, evaluation) => total + evaluation.points, 0);
      const score = clamp(Math.round(rawScore), 0, 100);
      const matchReasons = evaluations.flatMap((evaluation) => evaluation.reasons);
      const cautions = evaluations.flatMap((evaluation) => evaluation.cautions);

      return {
        ...game,
        score,
        scoreBreakdown: [
          toBreakdown("Live context", context),
          toBreakdown("Saved preferences", savedPreferences),
          toBreakdown("Learned feedback", learnedFeedback),
          toBreakdown("Recommendation history", history),
          toBreakdown("Game quality", quality),
        ],
        matchReasons,
        cautions,
        explanation: buildExplanation({ reasons: matchReasons, cautions }),
      };
    })
    .sort((a, b) => b.score - a.score || (b.rating ?? 0) - (a.rating ?? 0));
}
