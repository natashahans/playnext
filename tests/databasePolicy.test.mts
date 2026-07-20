import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationUrl = new URL("../supabase/migrations/20260720_security_hardening.sql", import.meta.url);
const migration = await readFile(migrationUrl, "utf8");
const integrityMigration = await readFile(
  new URL("../supabase/migrations/20260721_recommendation_integrity.sql", import.meta.url),
  "utf8"
);
const databaseMigrations = `${migration}\n${integrityMigration}`;

const userTables = [
  "profiles", "user_games", "user_preferences", "recommendation_sessions", "recommendations", "feedback",
];

test("RLS is enabled for every personal-data table", () => {
  for (const table of userTables) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
});

test("anonymous table access is revoked", () => {
  for (const table of [...userTables, "games"]) {
    assert.match(migration, new RegExp(`revoke all on table public\\.${table} from anon`, "i"));
  }
});

test("authenticated table privileges are reset before least-privilege grants", () => {
  for (const table of [...userTables, "games"]) {
    assert.match(migration, new RegExp(`revoke all on table public\\.${table} from authenticated`, "i"));
  }
});

test("shared game metadata cannot be changed by browser users", () => {
  assert.match(migration, /revoke all on table public\.games from authenticated/i);
  assert.match(migration, /grant select on table public\.games to authenticated/i);
  assert.doesNotMatch(migration, /create policy[^;]+on public\.games for update[^;]+;/i);
});

test("feedback ownership is tied to the user's own recommendation", () => {
  assert.match(migration, /recommendation\.id = recommendation_id/i);
  assert.match(migration, /recommendation\.user_id = \(select auth\.uid\(\)\)/i);
});

test("recommendation ownership is tied to the user's own session", () => {
  assert.match(migration, /session\.id = session_id/i);
  assert.match(migration, /session\.user_id = \(select auth\.uid\(\)\)/i);
});

test("database constraints cover bounded domain values", () => {
  for (const constraint of [
    "user_games_status_allowed", "feedback_type_allowed", "recommendation_score_range",
    "session_available_time_range", "feedback_reason_length", "session_recommendation_mode_allowed",
  ]) assert.match(databaseMigrations, new RegExp(constraint));
});

test("duplicate feedback is prevented when existing data is clean", () => {
  assert.match(integrityMigration, /feedback_one_response_per_recommendation/i);
  assert.match(integrityMigration, /group by recommendation_id\s+having count\(\*\) > 1/i);
  assert.match(integrityMigration, /unique \(recommendation_id\)/i);
});
