import test from "node:test";
import assert from "node:assert/strict";
import {
  buildIntentSummary,
  emptyIntent,
  fallbackIntent,
  normalizeChatResponse,
  normalizeIntent,
} from "../src/lib/intent.ts";

function user(content: string, id = "user-1") {
  return { id, role: "user" as const, content };
}

test("empty intent contains no invented user context", () => {
  const result = emptyIntent();
  assert.equal(result.availableTime, null);
  assert.equal(result.mood, "unknown");
  assert.deepEqual(result.desiredExperiences, []);
  assert.equal(result.confidence, 0);
});

test("normalization clamps unsafe values and rejects unknown enum values", () => {
  const result = normalizeIntent({
    mood: "invented-mood",
    availableTime: 50_000,
    energyLevel: "maximum",
    confidence: 9,
    desiredExperiences: ["story", "story", "invalid", "relaxing"],
  });
  assert.equal(result.mood, "unknown");
  assert.equal(result.energyLevel, "unknown");
  assert.equal(result.availableTime, 720);
  assert.equal(result.confidence, 1);
  assert.deepEqual(result.desiredExperiences, ["story", "relaxing"]);
});

test("fallback extraction converts common time expressions to minutes", () => {
  assert.equal(fallbackIntent([user("I have half an hour")]).intent.availableTime, 30);
  assert.equal(fallbackIntent([user("I have an hour")]).intent.availableTime, 60);
  assert.equal(fallbackIntent([user("I have a couple of hours")]).intent.availableTime, 120);
  assert.equal(fallbackIntent([user("I can play all evening")]).intent.availableTime, 240);
});

test("fallback extraction preserves several requested experiences", () => {
  const result = fallbackIntent([user("I want a relaxing story with exploration")]);
  assert.deepEqual(result.intent.desiredExperiences, ["relaxing", "story", "exploration"]);
  assert.equal(result.status, "ready");
});

test("fallback extraction separates preferred and avoided genres", () => {
  const result = fallbackIntent([user("I want an RPG, but no horror or strategy")]);
  assert.ok(result.intent.preferredGenres.includes("RPG"));
  assert.ok(result.intent.avoidedGenres.includes("Horror"));
  assert.ok(result.intent.avoidedGenres.includes("Strategy"));
  assert.ok(!result.intent.preferredGenres.includes("Horror"));
});

test("vague first messages trigger one useful clarification", () => {
  const result = fallbackIntent([user("Recommend something")]);
  assert.equal(result.status, "needs_clarification");
  assert.ok(result.missingFields.length > 0);
});

test("a second user turn becomes ready without inventing missing values", () => {
  const result = fallbackIntent([
    user("Recommend something", "user-1"),
    user("Surprise me", "user-2"),
  ]);
  assert.equal(result.status, "ready");
  assert.equal(result.intent.availableTime, null);
  assert.ok(result.intent.desiredExperiences.includes("surprise"));
});

test("AI output cannot force ready status without evidence on the first turn", () => {
  const result = normalizeChatResponse({
    status: "ready",
    assistantMessage: "Ready",
    intent: emptyIntent(),
  }, [user("anything")]);
  assert.equal(result.status, "needs_clarification");
});

test("intent summaries contain only captured signals", () => {
  const result = normalizeIntent({
    availableTime: 45,
    mood: "tired",
    energyLevel: "low",
    desiredExperiences: ["story"],
    difficultyPreference: "easy",
  });
  assert.equal(buildIntentSummary(result), "45 minutes, low energy, tired mood, story, easy difficulty");
});

test("long and repeated arrays are deduplicated and bounded", () => {
  const result = normalizeIntent({
    preferredGenres: ["Action", "Action", "RPG", "Puzzle", "Indie", "Racing", "Sports", "Strategy"],
    referenceGames: ["A", "A", "B", "C", "D", "E", "F"],
  });
  assert.deepEqual(result.preferredGenres, ["Action", "RPG", "Puzzle", "Indie", "Racing", "Sports"]);
  assert.deepEqual(result.referenceGames, ["A", "B", "C", "D", "E"]);
});
