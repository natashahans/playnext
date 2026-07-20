import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

async function text(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("a fresh Supabase project can be created from the bootstrap schema", async () => {
  const schema = await text("supabase/bootstrap/000_initial_schema.sql");
  for (const table of [
    "profiles",
    "games",
    "user_games",
    "user_preferences",
    "recommendation_sessions",
    "recommendations",
    "feedback",
  ]) {
    assert.match(schema, new RegExp(`create table if not exists public\\.${table}`, "i"));
  }
  assert.match(schema, /unique \(user_id, game_id\)/i);
  assert.match(schema, /feedback_one_response_per_recommendation unique \(recommendation_id\)/i);
  assert.match(schema, /recommendation_mode in \('collection', 'discovery'\)/i);
});

test("README distinguishes fresh bootstrap from existing-project migrations", async () => {
  const readme = await text("README.md");
  assert.match(readme, /new empty Supabase project only/i);
  assert.match(readme, /Do not run the bootstrap file against the existing production project/i);
});

test("documentation links resolve to real files", async () => {
  for (const path of [
    "docs/RECOMMENDATION_ENGINE.md",
    "docs/USABILITY_EVALUATION_PROTOCOL.md",
    "docs/REAL_WORLD_EVIDENCE_PLAN.md",
  ]) {
    await assert.doesNotReject(access(new URL(`../${path}`, import.meta.url)));
  }
});

test("paginated collection and history pages request exact lifetime totals", async () => {
  const collection = await text("src/app/dashboard/collection/page.tsx");
  const history = await text("src/app/dashboard/history/page.tsx");
  assert.match(collection, /count:\s*"exact",\s*head:\s*true/);
  assert.match(collection, /Recent-page rating/);
  assert.match(history, /count:\s*"exact",\s*head:\s*true/);
  assert.match(history, /Recent average fit/);
});

test("participant protocol records the approval reference and expiry", async () => {
  const protocol = await text("docs/USABILITY_EVALUATION_PROTOCOL.md");
  assert.match(protocol, /2571-ST-HSET-2026/);
  assert.match(protocol, /5 August 2026/);
  assert.match(protocol, /signed approval letter/i);
});
