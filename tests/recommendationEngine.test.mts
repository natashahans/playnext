import test from "node:test";
import assert from "node:assert/strict";
import { assessRecommendationDecision, scoreGames } from "../src/lib/recommendationEngine.ts";
import { fallbackIntent } from "../src/lib/intent.ts";
import type {
  ExtractedIntent,
  PreviousFeedback,
  PreviousRecommendation,
  RecommendationGame,
  UserPreferences,
} from "../src/lib/recommendation/types.ts";

const NOW = Date.UTC(2026, 6, 20, 12);
const DAY_MS = 86_400_000;

function intent(overrides: Partial<ExtractedIntent> = {}): ExtractedIntent {
  return {
    mood: "unknown",
    availableTime: null,
    energyLevel: "unknown",
    desiredExperience: "unknown",
    desiredExperiences: [],
    difficultyPreference: "unknown",
    sessionPace: "unknown",
    multiplayerPreference: "unknown",
    preferredGenres: [],
    avoidedGenres: [],
    referenceGames: [],
    confidence: 0.8,
    summary: "Test session",
    ...overrides,
  };
}

function game(
  id: string,
  title: string,
  genres: string[],
  tags: string[] = [],
  overrides: Partial<RecommendationGame> = {}
): RecommendationGame {
  return {
    id,
    rawg_id: Number(id.replace(/\D/g, "")) || null,
    title,
    rating: 4,
    genres,
    tags,
    platforms: ["PC"],
    playtime: 12,
    source: "collection",
    ...overrides,
  };
}

const cozy = game("1", "Quiet Garden", ["Casual", "Puzzle"], ["Cozy", "Relaxing"], { playtime: 8 });
const action = game("2", "Combat Rush", ["Action", "Shooter"], ["Difficult", "Fast-paced"], { playtime: 18 });
const epic = game("3", "Endless Kingdom", ["RPG", "Open World"], ["Story Rich"], { playtime: 65 });

test("high-energy challenge intent ranks difficult action above a cozy game", () => {
  const ranked = scoreGames([cozy, action], intent({
    mood: "restless",
    energyLevel: "high",
    desiredExperience: "challenge, action",
    desiredExperiences: ["challenge", "action"],
    difficultyPreference: "hard",
    sessionPace: "fast",
    confidence: 0.92,
  }), [], null, [], { now: NOW });

  assert.equal(ranked[0].id, action.id);
  assert.ok(ranked[0].score > ranked[1].score);
});

test("a short tired session ranks a relaxing short game above a long RPG", () => {
  const ranked = scoreGames([epic, cozy], intent({
    mood: "tired",
    availableTime: 25,
    energyLevel: "low",
    desiredExperience: "relaxing",
    desiredExperiences: ["relaxing"],
    difficultyPreference: "easy",
    confidence: 0.95,
  }), [], null, [], { now: NOW });

  assert.equal(ranked[0].id, cozy.id);
  assert.ok(ranked[0].matchReasons.some((reason) => reason.includes("short session")));
});

test("a currently avoided genre is a hard eligibility constraint", () => {
  const horror = game("4", "Night Terror", ["Horror", "Adventure"], ["Story Rich"], { rating: 5 });
  const ranked = scoreGames([horror, cozy], intent({
    desiredExperience: "story",
    desiredExperiences: ["story"],
    avoidedGenres: ["Horror"],
    confidence: 0.9,
  }), [], null, [], { now: NOW });

  const result = ranked.find((item) => item.id === horror.id);
  assert.equal(result?.isEligible, false);
  assert.ok((result?.exclusionReasons.length ?? 0) > 0);
  assert.equal(ranked[0].id, cozy.id);
});

test("a recommendation from today is strongly reduced to preserve variety", () => {
  const history: PreviousRecommendation[] = [{
    game_id: action.id,
    rawg_id: action.rawg_id,
    created_at: new Date(NOW - 2 * 60 * 60 * 1000).toISOString(),
  }];
  const similarAction = game("5", "Combat Wave", ["Action", "Shooter"], ["Difficult", "Fast-paced"]);
  const ranked = scoreGames([action, similarAction], intent({
    energyLevel: "high",
    desiredExperience: "action",
    desiredExperiences: ["action"],
    confidence: 0.9,
  }), [], null, history, { now: NOW });

  assert.equal(ranked[0].id, similarAction.id);
  assert.ok(ranked.find((item) => item.id === action.id)!.score < ranked[0].score);
});

test("not-in-mood feedback fades instead of permanently hiding a game", () => {
  const recent: PreviousFeedback[] = [{
    game_id: cozy.id,
    feedback_type: "not_in_mood",
    created_at: new Date(NOW - 3 * 86_400_000).toISOString(),
    game: cozy,
  }];
  const old: PreviousFeedback[] = [{
    ...recent[0],
    created_at: new Date(NOW - 240 * 86_400_000).toISOString(),
  }];
  const session = intent({ desiredExperience: "relaxing", desiredExperiences: ["relaxing"] });
  const recentScore = scoreGames([cozy], session, recent, null, [], { now: NOW })[0].score;
  const oldScore = scoreGames([cozy], session, old, null, [], { now: NOW })[0].score;

  assert.ok(oldScore > recentScore);
  assert.equal(scoreGames([cozy], session, old, null, [], { now: NOW })[0].isEligible, true);
});

test("too-long feedback is more important for a short request than a long request", () => {
  const feedback: PreviousFeedback[] = [{
    game_id: epic.id,
    feedback_type: "too_long",
    created_at: new Date(NOW - 2 * 86_400_000).toISOString(),
    game: epic,
  }];
  const shortScore = scoreGames([epic], intent({ availableTime: 30 }), feedback, null, [], { now: NOW })[0].score;
  const longScore = scoreGames([epic], intent({ availableTime: 180 }), feedback, null, [], { now: NOW })[0].score;

  assert.ok(longScore > shortScore);
});

test("sparse intent cannot produce a misleading near-perfect score", () => {
  const ranked = scoreGames([action], intent({ confidence: 0.2 }), [], null, [], { now: NOW });
  assert.ok(ranked[0].score <= 72);
  assert.equal(ranked[0].confidenceBand, "low");
});

test("saved preferences support but do not override explicit current context", () => {
  const preferences: UserPreferences = {
    favorite_genres: ["Action", "Shooter"],
    preferred_platforms: ["PC"],
    play_style: "gameplay",
    difficulty_preference: "hard",
    session_length_preference: "long",
  };
  const ranked = scoreGames([action, cozy], intent({
    mood: "tired",
    energyLevel: "low",
    desiredExperience: "relaxing",
    desiredExperiences: ["relaxing"],
    difficultyPreference: "easy",
    availableTime: 20,
    confidence: 0.95,
  }), [], preferences, [], { now: NOW });

  assert.equal(ranked[0].id, cozy.id);
});

test("duplicate RAWG candidates are removed deterministically", () => {
  const duplicate = { ...action, id: "local-copy" };
  const ranked = scoreGames([action, duplicate, cozy], intent(), [], null, [], { now: NOW });
  assert.equal(ranked.length, 2);
});

test("deterministic intent extraction understands exclusions without preferring them", () => {
  const result = fallbackIntent([{
    id: "message-1",
    role: "user",
    content: "I have an hour and want a story game, but no horror.",
  }]);

  assert.equal(result.intent.availableTime, 60);
  assert.ok(result.intent.desiredExperiences.includes("story"));
  assert.ok(result.intent.avoidedGenres.includes("Horror"));
  assert.ok(!result.intent.preferredGenres.includes("Horror"));
});

test("a later message can correct an earlier genre exclusion", () => {
  const result = fallbackIntent([
    { id: "message-1", role: "user", content: "Anything but strategy." },
    { id: "message-2", role: "user", content: "Actually strategy is what I want." },
  ]);

  assert.ok(!result.intent.avoidedGenres.includes("Strategy"));
  assert.ok(result.intent.preferredGenres.includes("Strategy"));
});

test("an ambiguous close ranking requests one discriminating clarification", () => {
  const first = game("20", "Option One", ["Adventure"]);
  const second = game("21", "Option Two", ["Adventure"]);
  const sparse = intent({ confidence: 0.25 });
  const assessment = assessRecommendationDecision(
    scoreGames([first, second], sparse, [], null, [], { now: NOW }),
    sparse
  );

  assert.equal(assessment.shouldClarify, true);
  assert.ok((assessment.question?.length ?? 0) > 20);
  assert.ok(assessment.selectionConfidence < 45);
});

test("strong context with a clear winner does not ask an unnecessary question", () => {
  const clearIntent = intent({
    availableTime: 25,
    mood: "tired",
    energyLevel: "low",
    desiredExperiences: ["relaxing"],
    difficultyPreference: "easy",
    confidence: 0.95,
  });
  const assessment = assessRecommendationDecision(
    scoreGames([cozy, action], clearIntent, [], null, [], { now: NOW }),
    clearIntent
  );

  assert.equal(assessment.shouldClarify, false);
  assert.ok(assessment.scoreMargin > 3);
});

test("public rating quality is discounted when almost nobody rated the game", () => {
  const weakEvidence = game("22", "Tiny Sample", ["Adventure"], [], { rating: 4.8, ratings_count: 2 });
  const strongEvidence = game("23", "Established Choice", ["Adventure"], [], { rating: 4.8, ratings_count: 10_000 });
  const ranked = scoreGames([weakEvidence, strongEvidence], intent(), [], null, [], { now: NOW });

  assert.equal(ranked[0].id, strongEvidence.id);
});

test("a clear negative feedback note transfers cautiously to similar future games", () => {
  const previous = game("24", "Old Arena", ["Action"], ["Combat"]);
  const feedback: PreviousFeedback[] = [{
    game_id: previous.id,
    feedback_type: "not_in_mood",
    reason: "I want less combat tonight",
    created_at: new Date(NOW - DAY_MS).toISOString(),
    game: previous,
  }];
  const anotherAction = game("25", "Another Arena", ["Action"], ["Combat"]);
  const neutralPuzzle = game("26", "Clear Shapes", ["Puzzle"], ["Casual"]);
  const ranked = scoreGames([anotherAction, neutralPuzzle], intent(), feedback, null, [], { now: NOW });

  assert.equal(ranked[0].id, neutralPuzzle.id);
});

test("recent same-genre recommendations create a small diversity adjustment", () => {
  const recentHistory: PreviousRecommendation[] = [{
    game_id: "different-action-game",
    created_at: new Date(NOW - DAY_MS).toISOString(),
    genres: ["Action"],
  }];
  const anotherAction = game("27", "Action Again", ["Action"]);
  const adventure = game("28", "Fresh Adventure", ["Adventure"]);
  const ranked = scoreGames([anotherAction, adventure], intent(), [], null, recentHistory, { now: NOW });

  assert.equal(ranked[0].id, adventure.id);
});

test("ranking is deterministic regardless of candidate input order", () => {
  const session = intent({ desiredExperiences: ["action"], energyLevel: "high" });
  const forward = scoreGames([cozy, action, epic], session, [], null, [], { now: NOW }).map((item) => item.id);
  const reverse = scoreGames([epic, action, cozy], session, [], null, [], { now: NOW }).map((item) => item.id);
  assert.deepEqual(forward, reverse);
});

test("every score and confidence value stays inside its documented range", () => {
  const ranked = scoreGames([cozy, action, epic], intent({ confidence: 1 }), [], null, [], { now: NOW });
  ranked.forEach((item) => {
    assert.ok(item.score >= 0 && item.score <= 100);
    assert.ok(item.selectionConfidence >= 0 && item.selectionConfidence <= 100);
    assert.ok(item.rank >= 1);
  });
});
