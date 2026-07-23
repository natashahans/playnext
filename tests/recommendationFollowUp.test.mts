import test from "node:test";
import assert from "node:assert/strict";
import {
  answerRecommendationFollowUp,
  classifyRecommendationFollowUp,
  isSimpleReplacementRequest,
} from "../src/lib/recommendation/follow-up.ts";
import type { ScoredGame } from "../src/lib/recommendation/types.ts";

const game: ScoredGame = {
  id: "game-1",
  slug: "the-last-of-us-part-i",
  title: "The Last of Us Part I",
  rating: 4.5,
  genres: ["Adventure", "Action"],
  platforms: ["PC", "PlayStation 5"],
  playtime: 15,
  tags: ["Single-player", "Story Rich"],
  score: 91,
  confidenceBand: "high",
  selectionConfidence: 0.9,
  scoreMargin: 12,
  rank: 1,
  isEligible: true,
  exclusionReasons: [],
  explanation: "It matches the story-led experience you requested.",
  scoreBreakdown: [],
  matchReasons: ["it supports the story experience you asked for"],
  cautions: [],
};

test("questions about the current recommendation do not request a rerank", () => {
  assert.equal(classifyRecommendationFollowUp("what is it about"), "about");
  assert.equal(classifyRecommendationFollowUp("Why did you recommend this?"), "why");
  assert.equal(classifyRecommendationFollowUp("How long is it?"), "playtime");
  assert.equal(classifyRecommendationFollowUp("Can I play it on PC?"), "platforms");
});

test("requests for a different result return to intent extraction", () => {
  assert.equal(classifyRecommendationFollowUp("Give me another one"), "change");
  assert.equal(classifyRecommendationFollowUp("Not this, something shorter"), "change");
  assert.equal(classifyRecommendationFollowUp("I actually want something aggressive and long"), "change");
});

test("recognises pure replacement requests without inventing new criteria", () => {
  assert.equal(isSimpleReplacementRequest("another please"), true);
  assert.equal(isSimpleReplacementRequest("give me another one"), true);
  assert.equal(isSimpleReplacementRequest("something else"), true);
  assert.equal(isSimpleReplacementRequest("another but shorter"), false);
  assert.equal(isSimpleReplacementRequest("not Borderlands"), false);
});

test("about answers are grounded in the current game's description", () => {
  const answer = answerRecommendationFollowUp(
    "about",
    game,
    "A hardened survivor escorts a young girl across a dangerous post-pandemic America. They must depend on one another to survive."
  );

  assert.match(answer, /^The Last of Us Part I is about /);
  assert.match(answer, /post-pandemic America/);
});

test("common factual follow-ups use catalogue fields", () => {
  assert.match(answerRecommendationFollowUp("playtime", game), /15 hours/);
  assert.match(answerRecommendationFollowUp("platforms", game), /PC and PlayStation 5/);
  assert.match(answerRecommendationFollowUp("multiplayer", game), /single-player/);
});
