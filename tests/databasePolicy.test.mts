import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationUrl = new URL("../supabase/migrations/20260720_security_hardening.sql", import.meta.url);
const migration = await readFile(migrationUrl, "utf8");

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

test("shared game metadata cannot be changed by browser users", () => {
  assert.match(migration, /revoke insert, update, delete on table public\.games from authenticated/i);
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
    "session_available_time_range", "feedback_reason_length",
  ]) assert.match(migration, new RegExp(constraint));
});
