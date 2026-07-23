import type {
  ExtractedIntent,
  RecommendationAssessment,
  ScoredGame,
} from "./types";
import { clamp, unique } from "./signals.ts";

export function evidenceCount(intent: ExtractedIntent) {
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
    (intent.excludedGames ?? []).length > 0,
    (intent.inferredExperiences ?? []).length > 0,
  ].filter(Boolean).length;
}

export function calibratedScore(rawScore: number, intent: ExtractedIntent, eligible: boolean) {
  const evidence = evidenceCount(intent);
  const confidence = clamp(intent.confidence, 0, 1);
  let ceiling = 72;
  if (evidence >= 2 && confidence >= 0.45) ceiling = 84;
  if (evidence >= 4 && confidence >= 0.7) ceiling = 94;
  if (evidence >= 6 && confidence >= 0.85) ceiling = 98;
  if (!eligible) ceiling = 20;
  return clamp(Math.round(rawScore), 0, ceiling);
}

export function selectionConfidence(
  topScore: number,
  margin: number,
  intent: ExtractedIntent,
  candidateCount: number
) {
  const evidenceStrength = clamp(evidenceCount(intent) / 5, 0, 1);
  const scoreStrength = clamp((topScore - 42) / 45, 0, 1);
  const marginStrength = candidateCount > 1 ? clamp(margin / 12, 0, 1) : 0.35;
  return Math.round(100 * (
    clamp(intent.confidence, 0, 1) * 0.35 +
    evidenceStrength * 0.3 +
    scoreStrength * 0.2 +
    marginStrength * 0.15
  ));
}

function clarificationQuestion(intent: ExtractedIntent, ranked: ScoredGame[]) {
  if (intent.desiredExperiences.length === 0 && intent.preferredGenres.length === 0) {
    return "I can help with that. What kind of session do you want right now?";
  }
  if (intent.availableTime === null) {
    return "A few matches are very close. Roughly how much time do you want to play right now?";
  }
  if (intent.difficultyPreference === "unknown") {
    return "I have two close options. Would you prefer something forgiving, balanced, or genuinely challenging?";
  }
  const genres = unique(ranked.slice(0, 2).flatMap((game) => game.genres ?? [])).slice(0, 2);
  return genres.length === 2
    ? `The leading matches are close. Would you rather prioritise ${genres[0]} or ${genres[1]} for this session?`
    : "The leading matches are close. Tell me one thing you definitely want—or want to avoid—so I can separate them properly.";
}

export function assessRecommendationDecision(
  ranked: ScoredGame[],
  intent: ExtractedIntent
): RecommendationAssessment {
  const eligible = ranked.filter((game) => game.isEligible);
  const top = eligible[0];
  const runnerUp = eligible[1];
  const margin = top && runnerUp ? Math.max(0, top.score - runnerUp.score) : 0;
  const confidence = top?.selectionConfidence ?? 0;
  const evidence = evidenceCount(intent);
  const shouldClarify = eligible.length > 1 && evidence === 0;

  return {
    shouldClarify,
    selectionConfidence: confidence,
    scoreMargin: margin,
    evidenceCount: evidence,
    question: shouldClarify ? clarificationQuestion(intent, eligible) : null,
  };
}
