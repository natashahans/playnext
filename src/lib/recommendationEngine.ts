import { buildExplanation } from "./recommendation/explain.ts";
import type {
  ExtractedIntent,
  PreviousFeedback,
  PreviousRecommendation,
  RecommendationGame,
  ScoreBreakdownItem,
  ScoredGame,
  UserPreferences,
} from "./recommendation/types";

type Evaluation = {
  points: number;
  label: string;
  detail: string;
  reasons: string[];
  cautions: string[];
};

type Eligibility = {
  eligible: boolean;
  reasons: string[];
};

const DAY_MS = 86_400_000;
const SCORE_BASELINE = 42;

const EXPERIENCE_SIGNALS: Record<string, string[]> = {
  relaxing: ["casual", "simulation", "puzzle", "family", "cozy", "relaxing", "peaceful", "wholesome", "meditative"],
  story: ["adventure", "rpg", "story rich", "narrative", "choices matter", "visual novel", "singleplayer"],
  action: ["action", "shooter", "fighting", "hack and slash", "combat", "fast paced"],
  exploration: ["adventure", "open world", "exploration", "walking simulator", "metroidvania"],
  challenge: ["difficult", "souls like", "hardcore", "roguelike", "roguelite", "precision platformer"],
  social: ["multiplayer", "co op", "online co op", "local co op", "party"],
  creative: ["sandbox", "building", "crafting", "level editor", "simulation"],
  strategic: ["strategy", "tactical", "turn based", "card", "management"],
  immersive: ["atmospheric", "open world", "rpg", "story rich", "exploration", "first person"],
  funny: ["comedy", "funny", "parody", "satire", "family"],
  scary: ["horror", "survival horror", "psychological horror", "dark", "creepy", "lovecraftian"],
};

// Broad genre signals establish relevance. These narrower signals distinguish a
// game that merely overlaps with an experience from one built around it.
const EXPERIENCE_PRIMARY_SIGNALS: Record<string, string[]> = {
  relaxing: ["cozy", "relaxing", "peaceful", "wholesome", "meditative"],
  story: ["story rich", "narrative", "choices matter", "visual novel"],
  action: ["action", "shooter", "fighting", "hack and slash", "combat", "fast paced"],
  exploration: ["open world", "exploration", "walking simulator", "metroidvania"],
  challenge: ["difficult", "souls like", "hardcore", "precision platformer", "permadeath"],
  social: ["multiplayer", "co op", "online co op", "local co op", "party"],
  creative: ["sandbox", "building", "crafting", "level editor"],
  strategic: ["strategy", "tactical", "turn based", "card", "management"],
  immersive: ["atmospheric", "open world", "first person"],
  funny: ["comedy", "funny", "parody", "satire"],
  scary: ["horror", "survival horror", "psychological horror", "creepy", "lovecraftian"],
};

const SHORT_SESSION_SIGNALS = [
  "arcade", "casual", "puzzle", "platformer", "racing", "sports", "fighting", "roguelike", "roguelite", "card", "match 3",
];
const LONG_SESSION_SIGNALS = [
  "rpg", "open world", "strategy", "simulation", "management", "grand strategy", "4x", "massively multiplayer",
];
const DIFFICULT_SIGNALS = [
  "difficult", "souls like", "hardcore", "roguelike", "roguelite", "precision platformer", "permadeath",
];
const LOW_ENERGY_SIGNALS = [
  "casual", "puzzle", "simulation", "turn based", "story rich", "visual novel", "walking simulator", "cozy", "relaxing",
];
const HIGH_ENERGY_SIGNALS = [
  "action", "shooter", "fighting", "racing", "hack and slash", "fast paced", "combat",
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function validAgeInDays(createdAt: string | null | undefined, now: number) {
  if (!createdAt) return Number.POSITIVE_INFINITY;
  const timestamp = new Date(createdAt).getTime();
  if (!Number.isFinite(timestamp)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (now - timestamp) / DAY_MS);
}

function isSameGame(
  game: Pick<RecommendationGame, "id" | "rawg_id">,
  reference: { game_id: string; rawg_id?: number | null }
) {
  return reference.game_id === game.id ||
    (game.rawg_id != null && reference.rawg_id != null && reference.rawg_id === game.rawg_id);
}

function gameSignals(game: Pick<RecommendationGame, "genres" | "tags">) {
  return [...(game.genres ?? []), ...(game.tags ?? [])].map(normalize).filter(Boolean);
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
  const normalizedTargets = targets.map(normalize).filter(Boolean);
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

function isDirectReference(game: RecommendationGame, intent: ExtractedIntent) {
  const title = normalize(game.title);
  return intent.referenceGames.some((reference) => {
    const normalizedReference = normalize(reference);
    return normalizedReference.length >= 3 &&
      (title === normalizedReference || title.includes(normalizedReference) || normalizedReference.includes(title));
  });
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
  return {
    points: clamp(Math.round(points), min, max),
    label,
    detail,
    reasons: unique(reasons),
    cautions: unique(cautions),
  };
}

function isShortSessionFriendly(game: RecommendationGame) {
  return matchesSignal(game, SHORT_SESSION_SIGNALS) ||
    ((game.playtime ?? 0) > 0 && (game.playtime ?? 0) <= 12);
}

function isLongForm(game: RecommendationGame) {
  return matchesSignal(game, LONG_SESSION_SIGNALS) || (game.playtime ?? 0) >= 35;
}

function looksDifficult(game: RecommendationGame) {
  return matchesSignal(game, DIFFICULT_SIGNALS);
}

function evaluateEligibility(
  game: RecommendationGame,
  intent: ExtractedIntent,
  feedback: PreviousFeedback[]
): Eligibility {
  const reasons: string[] = [];

  if (!game.id || !game.title.trim()) reasons.push("The candidate does not contain enough game data.");

  const avoided = matchingGameTargets(game, intent.avoidedGenres);
  if (avoided.length > 0) {
    reasons.push(`It contains ${avoided.join(" and ")}, which the current request explicitly excludes.`);
  }

  const explicitlyRequested = isDirectReference(game, intent);
  const markedPlayed = feedback.some((item) =>
    item.feedback_type === "already_played" &&
    isSameGame(game, { game_id: item.game_id, rawg_id: item.game?.rawg_id })
  );
  if (markedPlayed && !explicitlyRequested) {
    reasons.push("It was previously marked as already played.");
  }

  return { eligible: reasons.length === 0, reasons };
}

function evaluateLiveContext(game: RecommendationGame, intent: ExtractedIntent): Evaluation {
  let points = 0;
  const reasons: string[] = [];
  const cautions: string[] = [];

  if (intent.availableTime !== null) {
    if (intent.availableTime <= 30) {
      if (isShortSessionFriendly(game)) {
        points += 15;
        reasons.push("it works well for the short session you have");
      } else if (isLongForm(game)) {
        points -= 10;
        cautions.push("it may be difficult to enjoy fully in a very short session");
      }
    } else if (intent.availableTime <= 75) {
      points += 4;
      if (isShortSessionFriendly(game)) points += 3;
      reasons.push("it fits the medium-length session available");
    } else if (intent.availableTime >= 120 && isLongForm(game)) {
      points += 10;
      reasons.push("your available time suits a deeper game");
    }
  }

  if (intent.energyLevel === "low" || ["tired", "stressed", "sad"].includes(intent.mood)) {
    if (matchesSignal(game, LOW_ENERGY_SIGNALS)) {
      points += 12;
      reasons.push("its pace suits your current energy");
    }
    if (matchesSignal(game, HIGH_ENERGY_SIGNALS) && !matchesSignal(game, LOW_ENERGY_SIGNALS)) {
      points -= 9;
      cautions.push("its intensity may ask for more energy than you have right now");
    }
  }

  if (intent.energyLevel === "high" || ["restless", "happy"].includes(intent.mood)) {
    if (matchesSignal(game, HIGH_ENERGY_SIGNALS)) {
      points += 12;
      reasons.push("its intensity matches your energy");
    }
  }

  intent.desiredExperiences.forEach((experience) => {
    const signals = EXPERIENCE_SIGNALS[experience];
    if (signals && matchesSignal(game, signals)) {
      points += 9;
      if (matchesSignal(game, EXPERIENCE_PRIMARY_SIGNALS[experience] ?? [])) points += 3;
      reasons.push(`it supports the ${experience} experience you asked for`);
    }
  });

  const requestedGenres = matchingGameTargets(game, intent.preferredGenres);
  if (requestedGenres.length > 0) {
    points += Math.min(14, requestedGenres.length * 7);
    reasons.push(`it matches your current interest in ${requestedGenres.slice(0, 2).join(" and ")}`);
  }

  const avoidedGenres = matchingGameTargets(game, intent.avoidedGenres);
  if (avoidedGenres.length > 0) {
    points -= 35;
    cautions.push(`it includes ${avoidedGenres.join(" and ")}, which you asked to avoid`);
  }

  if (intent.difficultyPreference === "hard") {
    if (looksDifficult(game)) {
      points += 11;
      reasons.push("its challenge level matches what you requested");
    } else {
      points -= 3;
    }
  } else if (intent.difficultyPreference === "easy") {
    if (looksDifficult(game)) {
      points -= 15;
      cautions.push("it may be more punishing than you want today");
    } else {
      points += 7;
      reasons.push("it appears suitable for a more forgiving session");
    }
  }

  if (intent.sessionPace === "fast") {
    if (matchesSignal(game, HIGH_ENERGY_SIGNALS)) points += 7;
    else points -= 3;
  }
  if (intent.sessionPace === "slow") {
    if (matchesSignal(game, LOW_ENERGY_SIGNALS)) points += 7;
    else if (matchesSignal(game, HIGH_ENERGY_SIGNALS)) points -= 4;
  }

  if (intent.multiplayerPreference === "solo") {
    if (matchesSignal(game, ["singleplayer", "single player"])) {
      points += 6;
      reasons.push("it supports the solo session you want");
    } else if (matchesSignal(game, ["multiplayer only", "mmo"])) {
      points -= 12;
      cautions.push("it may depend on multiplayer when you asked to play alone");
    }
  }
  if (intent.multiplayerPreference === "multiplayer") {
    if (matchesSignal(game, EXPERIENCE_SIGNALS.social)) {
      points += 9;
      reasons.push("it supports multiplayer or cooperative play");
    } else {
      points -= 8;
      cautions.push("it does not show a strong multiplayer signal");
    }
  }

  if (isDirectReference(game, intent)) {
    points += 16;
    reasons.push("it directly matches a game you mentioned");
  }

  const confidenceWeight = 0.65 + clamp(intent.confidence, 0, 1) * 0.35;
  return cappedEvaluation(
    points * confidenceWeight,
    -40,
    44,
    "Current session fit",
    `Mood, time, energy and requested experience weighted by ${Math.round(confidenceWeight * 100)}% interpretation confidence`,
    reasons,
    cautions
  );
}

function evaluatePreferences(game: RecommendationGame, preferences: UserPreferences | null): Evaluation {
  let points = 0;
  const reasons: string[] = [];
  const cautions: string[] = [];

  if (!preferences) {
    return cappedEvaluation(0, 0, 18, "Saved preference fit", "No saved preferences were available", reasons, cautions);
  }

  const favoriteGenreMatches = matchingGameTargets(game, preferences.favorite_genres);
  if (favoriteGenreMatches.length > 0) {
    points += Math.min(10, favoriteGenreMatches.length * 5);
    reasons.push(`it aligns with your saved taste in ${favoriteGenreMatches.slice(0, 2).join(" and ")}`);
  }

  const platformMatches = overlap(game.platforms, preferences.preferred_platforms);
  if ((preferences.preferred_platforms ?? []).length > 0) {
    if (platformMatches.length > 0) {
      points += 4;
      reasons.push("it is available on a platform you prefer");
    } else if ((game.platforms ?? []).length > 0) {
      points -= 3;
      cautions.push("its listed platforms do not match your saved platform preferences");
    }
  }

  if (preferences.play_style === "story" && matchesSignal(game, EXPERIENCE_SIGNALS.story)) points += 5;
  if (preferences.play_style === "gameplay" && matchesSignal(game, HIGH_ENERGY_SIGNALS)) points += 5;
  if (preferences.play_style === "balanced") points += 2;
  if (preferences.difficulty_preference === "hard" && looksDifficult(game)) points += 4;
  if (preferences.difficulty_preference === "easy" && !looksDifficult(game)) points += 4;
  if (preferences.session_length_preference === "short" && isShortSessionFriendly(game)) points += 4;
  if (preferences.session_length_preference === "long" && isLongForm(game)) points += 4;

  return cappedEvaluation(
    points,
    -4,
    18,
    "Saved preference fit",
    "Onboarding and Settings preferences used as supporting—not overriding—signals",
    reasons,
    cautions
  );
}

function decayMultiplier(ageInDays: number) {
  if (ageInDays < 14) return 1;
  if (ageInDays < 60) return 0.65;
  if (ageInDays < 180) return 0.35;
  if (Number.isFinite(ageInDays)) return 0.15;
  return 0.25;
}

function feedbackGenreOverlap(game: RecommendationGame, feedback: PreviousFeedback) {
  return overlap(game.genres, feedback.game?.genres).length > 0;
}

function evaluateFeedback(
  game: RecommendationGame,
  feedback: PreviousFeedback[],
  intent: ExtractedIntent,
  now: number
): Evaluation {
  let points = 0;
  const reasons: string[] = [];
  const cautions: string[] = [];
  const exactFeedback = feedback.filter((item) =>
    isSameGame(game, { game_id: item.game_id, rawg_id: item.game?.rawg_id })
  );

  exactFeedback.forEach((item) => {
    const multiplier = decayMultiplier(validAgeInDays(item.created_at, now));
    if (item.feedback_type === "liked") {
      points += 8 * multiplier;
      reasons.push("you previously marked this as a good recommendation");
    }
    if (item.feedback_type === "not_in_mood") {
      points -= 22 * multiplier;
      cautions.push("you recently said this game did not fit your mood");
    }
    if (item.feedback_type === "too_long") {
      if (intent.availableTime !== null && intent.availableTime <= 45) {
        points -= 25 * multiplier;
        cautions.push("you previously found this too long for a short session");
      } else if (intent.availableTime === null || intent.availableTime < 120) {
        points -= 7 * multiplier;
      }
    }
    if (item.feedback_type === "too_difficult") {
      if (intent.difficultyPreference === "hard") points -= 1;
      else if (intent.difficultyPreference === "easy") {
        points -= 25 * multiplier;
        cautions.push("you previously found this more difficult than you wanted");
      } else points -= 9 * multiplier;
    }
    if (item.feedback_type === "not_interested") {
      points -= 30 * multiplier;
      cautions.push("you previously showed low interest in this game");
    }
  });

  feedback
    .filter((item) => !isSameGame(game, { game_id: item.game_id, rawg_id: item.game?.rawg_id }))
    .slice(0, 50)
    .forEach((item) => {
      const multiplier = decayMultiplier(validAgeInDays(item.created_at, now));
      if (item.feedback_type === "liked" && feedbackGenreOverlap(game, item)) points += 2 * multiplier;
      if (item.feedback_type === "too_long" && isLongForm(game) && intent.availableTime !== null && intent.availableTime <= 60) {
        points -= 4 * multiplier;
      }
      if (item.feedback_type === "too_difficult" && looksDifficult(game) && intent.difficultyPreference !== "hard") {
        points -= 5 * multiplier;
      }
      if (item.feedback_type === "not_interested" && feedbackGenreOverlap(game, item)) points -= 2 * multiplier;
    });

  if (points > 0) reasons.push("it benefits from patterns in your previous feedback");
  if (points < -10) cautions.push("your earlier feedback suggests this may be a weaker personal fit");

  return cappedEvaluation(
    points,
    -45,
    15,
    "Feedback learning",
    "Context-sensitive feedback decays over time instead of permanently hiding games",
    reasons,
    cautions
  );
}

function evaluateHistory(
  game: RecommendationGame,
  history: PreviousRecommendation[],
  now: number
): Evaluation {
  const appearances = history.filter((item) => isSameGame(game, item)).slice(0, 10);
  let points = 0;

  appearances.forEach((item) => {
    const ageInDays = validAgeInDays(item.created_at, now);
    if (ageInDays < 1) points -= 30;
    else if (ageInDays < 7) points -= 18;
    else if (ageInDays < 30) points -= 8;
    else if (ageInDays < 120) points -= 3;
    else points -= 1;
  });

  if (game.status === "completed") points -= 15;
  if (game.status === "playing") points += 5;

  return cappedEvaluation(
    points,
    -42,
    5,
    "Variety and recency",
    "Recent repeats are strongly reduced while older suggestions gradually become eligible again",
    points > 0 ? ["it is already in progress, making it easy to resume"] : [],
    points < 0 ? ["it was reduced to keep recommendations varied"] : []
  );
}

function evaluateQuality(game: RecommendationGame): Evaluation {
  const rating = game.rating ?? 0;
  let points = 0;
  if (rating >= 4.5) points = 7;
  else if (rating >= 4.0) points = 5;
  else if (rating >= 3.5) points = 3;
  else if (rating > 0 && rating < 2.5) points = -2;

  return cappedEvaluation(
    points,
    -3,
    7,
    "Quality signal",
    "Public rating is deliberately limited to a tie-breaking role",
    points >= 5 ? ["it has a particularly strong player rating"] : [],
    []
  );
}

function toBreakdown(category: ScoreBreakdownItem["category"], evaluation: Evaluation): ScoreBreakdownItem {
  return {
    category,
    label: evaluation.label,
    points: evaluation.points,
    detail: evaluation.detail,
  };
}

function evidenceCount(intent: ExtractedIntent) {
  return [
    intent.availableTime !== null,
    intent.mood !== "unknown",
    intent.energyLevel !== "unknown",
    intent.desiredExperiences.length > 0,
    intent.preferredGenres.length > 0,
    intent.avoidedGenres.length > 0,
    intent.difficultyPreference !== "unknown",
    intent.sessionPace !== "unknown",
    intent.multiplayerPreference !== "unknown" && intent.multiplayerPreference !== "either",
    intent.referenceGames.length > 0,
  ].filter(Boolean).length;
}

function calibratedScore(rawScore: number, intent: ExtractedIntent, eligible: boolean) {
  const evidence = evidenceCount(intent);
  const confidence = clamp(intent.confidence, 0, 1);
  let ceiling = 72;
  if (evidence >= 2 && confidence >= 0.45) ceiling = 84;
  if (evidence >= 4 && confidence >= 0.7) ceiling = 94;
  if (evidence >= 6 && confidence >= 0.85) ceiling = 98;
  if (!eligible) ceiling = 20;
  return clamp(Math.round(rawScore), 0, ceiling);
}

function confidenceBand(score: number, intent: ExtractedIntent): ScoredGame["confidenceBand"] {
  const evidence = evidenceCount(intent);
  if (score >= 78 && evidence >= 3 && intent.confidence >= 0.65) return "high";
  if (score >= 58 && evidence >= 1) return "medium";
  return "low";
}

function deduplicateGames(games: RecommendationGame[]) {
  const seen = new Set<string>();
  return games.filter((game) => {
    const key = game.rawg_id != null ? `rawg:${game.rawg_id}` : `id:${game.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function scoreGames(
  games: RecommendationGame[],
  intent: ExtractedIntent,
  previousFeedback: PreviousFeedback[] = [],
  preferences: UserPreferences | null = null,
  previousRecommendations: PreviousRecommendation[] = [],
  options: { now?: number } = {}
): ScoredGame[] {
  const now = options.now ?? Date.now();

  return deduplicateGames(games)
    .map((game) => {
      const eligibility = evaluateEligibility(game, intent, previousFeedback);
      const context = evaluateLiveContext(game, intent);
      const savedPreferences = evaluatePreferences(game, preferences);
      const learnedFeedback = evaluateFeedback(game, previousFeedback, intent, now);
      const history = evaluateHistory(game, previousRecommendations, now);
      const quality = evaluateQuality(game);
      const evaluations = [context, savedPreferences, learnedFeedback, history, quality];
      const rawScore = SCORE_BASELINE + evaluations.reduce((total, evaluation) => total + evaluation.points, 0);
      const score = calibratedScore(rawScore, intent, eligibility.eligible);
      const matchReasons = unique(evaluations.flatMap((evaluation) => evaluation.reasons));
      const cautions = unique([
        ...evaluations.flatMap((evaluation) => evaluation.cautions),
        ...eligibility.reasons,
      ]);

      return {
        ...game,
        score,
        confidenceBand: confidenceBand(score, intent),
        isEligible: eligibility.eligible,
        exclusionReasons: eligibility.reasons,
        scoreBreakdown: [
          toBreakdown("Live context", context),
          toBreakdown("Saved preferences", savedPreferences),
          toBreakdown("Learned feedback", learnedFeedback),
          toBreakdown("Recommendation history", history),
          toBreakdown("Game quality", quality),
        ],
        matchReasons,
        cautions,
        explanation: buildExplanation({
          reasons: matchReasons,
          cautions,
          confidenceBand: confidenceBand(score, intent),
          source: game.source,
        }),
      };
    })
    .sort((a, b) =>
      Number(b.isEligible) - Number(a.isEligible) ||
      b.score - a.score ||
      (b.rating ?? 0) - (a.rating ?? 0) ||
      a.title.localeCompare(b.title)
    );
}
