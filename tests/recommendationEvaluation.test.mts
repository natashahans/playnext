import test from "node:test";
import assert from "node:assert/strict";
import { scoreGames } from "../src/lib/recommendationEngine.ts";
import type { ExtractedIntent, RecommendationGame } from "../src/lib/recommendation/types.ts";

const NOW = Date.UTC(2026, 6, 20, 12);

function game(id: number, title: string, genres: string[], tags: string[], playtime = 15): RecommendationGame {
  return {
    id: String(id), rawg_id: id, title, genres, tags, playtime,
    rating: 4.1, platforms: ["PC"], source: "collection", status: "backlog",
  };
}

const library = [
  game(1, "Quiet Garden", ["Casual", "Puzzle"], ["Cozy", "Relaxing", "Peaceful"], 7),
  game(2, "Combat Rush", ["Action", "Shooter"], ["Difficult", "Fast-paced", "Combat"], 15),
  game(3, "Kingdom Stories", ["RPG", "Adventure"], ["Story Rich", "Atmospheric", "Singleplayer"], 55),
  game(4, "Tactical Crown", ["Strategy"], ["Tactical", "Turn-based", "Management"], 35),
  game(5, "Midnight House", ["Horror", "Adventure"], ["Psychological Horror", "Creepy", "Dark"], 12),
  game(6, "Together We Go", ["Adventure", "Casual"], ["Online Co-op", "Multiplayer", "Party"], 10),
  game(7, "Builder's Haven", ["Simulation", "Indie"], ["Sandbox", "Building", "Crafting"], 30),
  game(8, "Velocity Circuit", ["Racing", "Arcade"], ["Fast-paced", "Action"], 8),
  game(9, "Wide Horizon", ["Adventure", "RPG"], ["Open World", "Exploration", "Singleplayer"], 45),
];

function intent(overrides: Partial<ExtractedIntent>): ExtractedIntent {
  return {
    mood: "neutral", availableTime: null, energyLevel: "medium",
    desiredExperience: "unknown", desiredExperiences: [], difficultyPreference: "unknown",
    sessionPace: "unknown", multiplayerPreference: "unknown", preferredGenres: [],
    avoidedGenres: [], referenceGames: [], confidence: 0.9, summary: "Evaluation scenario",
    ...overrides,
  };
}

const scenarios: Array<{ id: string; expected: string; intent: ExtractedIntent }> = [
  { id: "short-relaxing", expected: "Quiet Garden", intent: intent({ mood: "tired", energyLevel: "low", availableTime: 25, desiredExperiences: ["relaxing"], difficultyPreference: "easy" }) },
  { id: "high-energy-challenge", expected: "Combat Rush", intent: intent({ mood: "restless", energyLevel: "high", desiredExperiences: ["action", "challenge"], difficultyPreference: "hard", sessionPace: "fast" }) },
  { id: "deep-story", expected: "Kingdom Stories", intent: intent({ availableTime: 180, desiredExperiences: ["story", "immersive"], preferredGenres: ["RPG"] }) },
  { id: "strategic-session", expected: "Tactical Crown", intent: intent({ desiredExperiences: ["strategic"], preferredGenres: ["Strategy"], sessionPace: "slow" }) },
  { id: "scary-session", expected: "Midnight House", intent: intent({ desiredExperiences: ["scary"], preferredGenres: ["Horror"] }) },
  { id: "social-session", expected: "Together We Go", intent: intent({ desiredExperiences: ["social"], multiplayerPreference: "multiplayer" }) },
  { id: "creative-session", expected: "Builder's Haven", intent: intent({ desiredExperiences: ["creative"], preferredGenres: ["Simulation"] }) },
  { id: "quick-racing", expected: "Velocity Circuit", intent: intent({ availableTime: 20, energyLevel: "high", sessionPace: "fast", preferredGenres: ["Racing"] }) },
  { id: "solo-exploration", expected: "Wide Horizon", intent: intent({ availableTime: 150, desiredExperiences: ["exploration"], multiplayerPreference: "solo" }) },
  { id: "story-without-horror", expected: "Kingdom Stories", intent: intent({ desiredExperiences: ["story"], avoidedGenres: ["Horror"] }) },
  { id: "direct-reference", expected: "Tactical Crown", intent: intent({ referenceGames: ["Tactical Crown"] }) },
  { id: "easy-cozy-puzzle", expected: "Quiet Garden", intent: intent({ mood: "calm", energyLevel: "low", desiredExperiences: ["relaxing"], preferredGenres: ["Puzzle"] }) },
  { id: "hard-action-shooter", expected: "Combat Rush", intent: intent({ energyLevel: "high", desiredExperiences: ["action"], difficultyPreference: "hard", preferredGenres: ["Shooter"] }) },
  { id: "long-rpg-narrative", expected: "Kingdom Stories", intent: intent({ availableTime: 240, desiredExperiences: ["story"], preferredGenres: ["RPG"] }) },
  { id: "open-world-wander", expected: "Wide Horizon", intent: intent({ desiredExperiences: ["exploration"], preferredGenres: ["Adventure"] }) },
  { id: "multiplayer-party", expected: "Together We Go", intent: intent({ desiredExperiences: ["social"], multiplayerPreference: "multiplayer", preferredGenres: ["Casual"] }) },
  { id: "turn-based-tactics", expected: "Tactical Crown", intent: intent({ desiredExperiences: ["strategic"], preferredGenres: ["Strategy"] }) },
  { id: "sandbox-creation", expected: "Builder's Haven", intent: intent({ desiredExperiences: ["creative"], preferredGenres: ["Simulation", "Indie"] }) },
  { id: "arcade-speed", expected: "Velocity Circuit", intent: intent({ availableTime: 15, energyLevel: "high", desiredExperiences: ["action"], preferredGenres: ["Racing"] }) },
  { id: "psychological-horror", expected: "Midnight House", intent: intent({ desiredExperiences: ["scary", "immersive"], preferredGenres: ["Horror"] }) },
  { id: "exhausted-peaceful", expected: "Quiet Garden", intent: intent({ mood: "tired", energyLevel: "low", desiredExperiences: ["relaxing"], sessionPace: "slow" }) },
  { id: "focused-management", expected: "Tactical Crown", intent: intent({ mood: "focused", desiredExperiences: ["strategic"], preferredGenres: ["Strategy"] }) },
  { id: "restless-fast-race", expected: "Velocity Circuit", intent: intent({ mood: "restless", energyLevel: "high", sessionPace: "fast", preferredGenres: ["Racing"] }) },
  { id: "happy-party-night", expected: "Together We Go", intent: intent({ mood: "happy", desiredExperiences: ["social"], multiplayerPreference: "multiplayer" }) },
  { id: "creative-building", expected: "Builder's Haven", intent: intent({ desiredExperiences: ["creative"], preferredGenres: ["Simulation"] }) },
  { id: "short-coop-session", expected: "Together We Go", intent: intent({ availableTime: 25, desiredExperiences: ["social"], multiplayerPreference: "multiplayer" }) },
  { id: "long-open-exploration", expected: "Wide Horizon", intent: intent({ availableTime: 240, desiredExperiences: ["exploration"], preferredGenres: ["Adventure"] }) },
  { id: "solo-narrative-rpg", expected: "Kingdom Stories", intent: intent({ desiredExperiences: ["story"], preferredGenres: ["RPG"], multiplayerPreference: "solo" }) },
  { id: "quick-horror", expected: "Midnight House", intent: intent({ availableTime: 30, desiredExperiences: ["scary"], preferredGenres: ["Horror"] }) },
  { id: "forgiving-puzzle-break", expected: "Quiet Garden", intent: intent({ availableTime: 20, difficultyPreference: "easy", preferredGenres: ["Puzzle"] }) },
];

test("benchmark scenarios achieve at least 90% top-one agreement", () => {
  const results = scenarios.map((scenario) => {
    const ranked = scoreGames(library, scenario.intent, [], null, [], { now: NOW });
    return { id: scenario.id, expected: scenario.expected, actual: ranked[0]?.title ?? "none" };
  });
  const correct = results.filter((result) => result.expected === result.actual).length;
  const accuracy = correct / results.length;
  assert.ok(accuracy >= 0.9, `Top-one agreement was ${Math.round(accuracy * 100)}%: ${JSON.stringify(results)}`);
});

for (const scenario of scenarios) {
  test(`scenario: ${scenario.id}`, () => {
    const ranked = scoreGames(library, scenario.intent, [], null, [], { now: NOW });
    assert.equal(ranked[0]?.title, scenario.expected);
    assert.equal(ranked[0]?.isEligible, true);
    assert.ok((ranked[0]?.explanation.length ?? 0) > 20);
  });
}

test("scores a catalogue-sized pool within an interactive response budget", () => {
  const catalogue = Array.from({ length: 1_000 }, (_, index) => ({
    ...library[index % library.length],
    id: `benchmark-${index}`,
    rawg_id: 10_000 + index,
    title: `${library[index % library.length].title} ${index}`,
  }));
  const start = performance.now();
  const ranked = scoreGames(
    catalogue,
    intent({ availableTime: 45, energyLevel: "high", desiredExperiences: ["action"] }),
    [],
    null,
    [],
    { now: NOW }
  );
  const elapsed = performance.now() - start;

  assert.equal(ranked.length, 1_000);
  assert.ok(elapsed < 1_000, `Scoring 1,000 candidates took ${elapsed.toFixed(1)}ms`);
});
