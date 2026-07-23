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
import {
  EXPERIENCE_PRIMARY_SIGNALS,
  EXPERIENCE_SIGNALS,
  FEEDBACK_NOTE_SIGNALS,
  HIGH_ENERGY_SIGNALS,
  LOW_ENERGY_SIGNALS,
  clamp,
  isLongForm,
  isShortSessionFriendly,
  looksDifficult,
  matchesSignal,
  normalizeSignal,
  overlap,
  unique,
} from "./recommendation/signals.ts";
import {
  calibratedScore,
  selectionConfidence,
} from "./recommendation/assessment.ts";

export { assessRecommendationDecision } from "./recommendation/assessment.ts";

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

function describeExperience(experience: string) {
  switch (experience) {
    case "relaxing": return "relaxing";
    case "story": return "story-driven";
    case "action": return "action-heavy";
    case "exploration": return "exploration-focused";
    case "challenge": return "challenging";
    case "social": return "co-op or multiplayer";
    case "creative": return "creative";
    case "strategic": return "strategic";
    case "immersive": return "immersive";
    case "funny": return "funny";
    case "scary": return "scary";
    case "surprise": return "open-ended";
    default: return experience;
  }
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

function matchingGameTargets(game: RecommendationGame, targets: string[] | null | undefined) {
  return (targets ?? []).filter((target) => matchesSignal(game, [target]));
}

function isDirectReference(game: RecommendationGame, intent: ExtractedIntent) {
  const title = normalizeSignal(game.title);
  return intent.referenceGames.some((reference) => {
    const normalizedReference = normalizeSignal(reference);
    return normalizedReference.length >= 3 &&
      (title === normalizedReference || title.includes(normalizedReference) || normalizedReference.includes(title));
  });
}

function isExcludedTitle(game: RecommendationGame, intent: ExtractedIntent) {
  const title = normalizeSignal(game.title);
  return (intent.excludedGames ?? []).some((excluded) => {
    const target = normalizeSignal(excluded);
    return target.length >= 2 &&
      (title === target || title.includes(target) || target.includes(title));
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

function evaluateEligibility(
  game: RecommendationGame,
  intent: ExtractedIntent,
  feedback: PreviousFeedback[]
): Eligibility {
  const reasons: string[] = [];

  if (!game.id || !game.title.trim()) reasons.push("The candidate does not contain enough game data.");

  if (isExcludedTitle(game, intent)) {
    reasons.push("The user explicitly rejected this game in the current conversation.");
  }

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
        reasons.push("you only have a short session, and this game fits it well");
      } else if (isLongForm(game)) {
        points -= 10;
        cautions.push("it may be difficult to enjoy fully in a very short session");
      }
    } else if (intent.availableTime <= 75) {
      points += 4;
      if (isShortSessionFriendly(game)) points += 3;
      reasons.push("you mentioned a medium-length session, and this fits comfortably");
    } else if (intent.availableTime >= 120 && isLongForm(game)) {
      points += 10;
      reasons.push("you said you have plenty of time for a deeper game");
    }
  }

  if (intent.energyLevel === "low" || ["tired", "stressed", "sad"].includes(intent.mood)) {
    if (matchesSignal(game, LOW_ENERGY_SIGNALS)) {
      points += 12;
      reasons.push("your current energy points toward something calmer");
    }
    if (matchesSignal(game, HIGH_ENERGY_SIGNALS) && !matchesSignal(game, LOW_ENERGY_SIGNALS)) {
      points -= 9;
      cautions.push("its intensity may ask for more energy than you have right now");
    }
  }

  if (intent.energyLevel === "high" || ["restless", "happy"].includes(intent.mood)) {
    if (matchesSignal(game, HIGH_ENERGY_SIGNALS)) {
      points += 12;
      reasons.push("you sound energetic, and this game keeps the pace up");
    }
  }

  intent.desiredExperiences.forEach((experience) => {
    const signals = EXPERIENCE_SIGNALS[experience];
    if (signals && matchesSignal(game, signals)) {
      points += 9;
      if (matchesSignal(game, EXPERIENCE_PRIMARY_SIGNALS[experience] ?? [])) points += 3;
      reasons.push(`you asked for a ${describeExperience(experience)} session`);
    }
  });

  (intent.inferredExperiences ?? []).forEach((experience) => {
    if (intent.desiredExperiences.includes(experience)) return;
    const signals = EXPERIENCE_SIGNALS[experience];
    if (signals && matchesSignal(game, signals)) {
      points += 4;
      const reference = intent.referenceGames[0];
      reasons.push(reference
        ? `it shares ${describeExperience(experience)} qualities associated with ${reference}`
        : `it has ${describeExperience(experience)} qualities inferred from your comparison`);
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

function feedbackSimilarity(game: RecommendationGame, feedback: PreviousFeedback) {
  if (!feedback.game) return 0;
  const genreMatches = overlap(game.genres, feedback.game.genres).length;
  const tagMatches = overlap(game.tags, feedback.game.tags).length;
  const platformMatches = overlap(game.platforms, feedback.game.platforms).length;
  return clamp(genreMatches * 0.25 + tagMatches * 0.08 + platformMatches * 0.02, 0, 1);
}

function negativeSignalsFromNote(reason: string | null | undefined) {
  if (!reason) return [];
  const text = normalizeSignal(reason);
  const hasNegativeQualifier = /\b(?:less|without|avoid|no|not|too much|too many|tired of)\b/.test(text);
  if (!hasNegativeQualifier) return [];
  return Object.entries(FEEDBACK_NOTE_SIGNALS)
    .filter(([label]) => text.includes(label))
    .flatMap(([, signals]) => signals);
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

    const noteSignals = negativeSignalsFromNote(item.reason);
    if (noteSignals.length > 0 && matchesSignal(game, noteSignals)) {
      points -= 7 * multiplier;
      cautions.push("your feedback note previously asked for less of this kind of experience");
    }
  });

  feedback
    .filter((item) => !isSameGame(game, { game_id: item.game_id, rawg_id: item.game?.rawg_id }))
    .slice(0, 50)
    .forEach((item) => {
      const multiplier = decayMultiplier(validAgeInDays(item.created_at, now));
      const similarity = feedbackSimilarity(game, item);
      if (item.feedback_type === "liked" && similarity > 0) points += Math.min(4, 4 * similarity) * multiplier;
      if (item.feedback_type === "too_long" && isLongForm(game) && intent.availableTime !== null && intent.availableTime <= 60) {
        points -= 4 * multiplier;
      }
      if (item.feedback_type === "too_difficult" && looksDifficult(game) && intent.difficultyPreference !== "hard") {
        points -= 5 * multiplier;
      }
      if (item.feedback_type === "not_interested" && similarity > 0) points -= Math.min(5, 5 * similarity) * multiplier;
      const noteSignals = negativeSignalsFromNote(item.reason);
      if (noteSignals.length > 0 && matchesSignal(game, noteSignals)) points -= 3 * multiplier;
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

  const recentGenreFatigue = history
    .filter((item) => !isSameGame(game, item) && validAgeInDays(item.created_at, now) < 7)
    .slice(0, 8)
    .reduce((total, item) => total + Math.min(2, overlap(game.genres, item.genres).length), 0);
  points -= Math.min(6, recentGenreFatigue);

  if (game.status === "completed") points -= 15;
  if (game.status === "playing") points += 5;

  return cappedEvaluation(
    points,
    -42,
    5,
    "Variety and recency",
    "Recent repeats are strongly reduced while older suggestions gradually become eligible again",
    points > 0 ? ["it is already in progress, making it easy to resume"] : [],
    points < 0 ? [recentGenreFatigue > 0
      ? "recent recommendations in similar genres slightly reduced it to preserve variety"
      : "it was reduced to keep recommendations varied"] : []
  );
}

function evaluateQuality(game: RecommendationGame): Evaluation {
  const rating = game.rating ?? 0;
  const ratingCount = game.ratings_count ?? null;
  const reliability = ratingCount === null
    ? 0.65
    : clamp(Math.log10(Math.max(1, ratingCount) + 1) / 3.5, 0.2, 1);
  let ratingPoints = 0;
  if (rating >= 4.5) ratingPoints = 7;
  else if (rating >= 4.0) ratingPoints = 5;
  else if (rating >= 3.5) ratingPoints = 3;
  else if (rating > 0 && rating < 2.5) ratingPoints = -2;

  let criticPoints = 0;
  if ((game.metacritic ?? 0) >= 85) criticPoints = 2;
  else if ((game.metacritic ?? 0) >= 75) criticPoints = 1;
  else if ((game.metacritic ?? 100) < 50) criticPoints = -1;
  const points = ratingPoints * reliability + criticPoints;

  return cappedEvaluation(
    points,
    -3,
    7,
    "Quality signal",
    ratingCount === null
      ? "Public rating is a limited tie-breaker because vote-count reliability is unavailable"
      : `Public rating is reliability-weighted using ${ratingCount.toLocaleString()} recorded ratings`,
    points >= 5 ? ["it has a strong, well-supported public quality signal"] : [],
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

  const sorted = deduplicateGames(games)
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
        confidenceBand: "low" as const,
        selectionConfidence: 0,
        scoreMargin: 0,
        rank: 0,
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
        explanation: "",
      };
    })
    .sort((a, b) =>
      Number(b.isEligible) - Number(a.isEligible) ||
      b.score - a.score ||
      (b.rating ?? 0) - (a.rating ?? 0) ||
      a.title.localeCompare(b.title)
    );

  const eligible = sorted.filter((game) => game.isEligible);
  return sorted.map((game) => {
    const eligibleIndex = eligible.findIndex((item) => item.id === game.id);
    const next = eligibleIndex >= 0 ? eligible[eligibleIndex + 1] : undefined;
    const margin = game.isEligible && next ? Math.max(0, game.score - next.score) : 0;
    const confidence = game.isEligible
      ? selectionConfidence(game.score, margin, intent, eligible.length)
      : 0;
    const band = confidence >= 72 ? "high" : confidence >= 45 ? "medium" : "low";
    return {
      ...game,
      rank: eligibleIndex >= 0 ? eligibleIndex + 1 : sorted.length,
      scoreMargin: margin,
      selectionConfidence: confidence,
      confidenceBand: band,
      explanation: buildExplanation({
        reasons: game.matchReasons,
        cautions: game.cautions,
        confidenceBand: band,
        source: game.source,
      }),
    };
  });
}
