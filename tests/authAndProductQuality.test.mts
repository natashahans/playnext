import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

test("password login uses the correct browser autofill semantics", () => {
  const source = read("src/app/(auth)/login/email/page.tsx");
  assert.match(source, /autoComplete="current-password"/);
  assert.match(source, /placeholder="Password"/);
  assert.doesNotMatch(source, /placeholder="Create password"/);
});

test("password recovery returns through the verified callback route", () => {
  for (const path of [
    "src/app/(auth)/login/forgot-password/page.tsx",
    "src/app/(auth)/login/check-reset-email/page.tsx",
  ]) {
    const source = read(path);
    assert.match(source, /\/auth\/callback\?next=/);
    assert.match(source, /\/login\/reset-password/);
  }
});

test("OAuth callback exchanges the code and blocks external redirect destinations", () => {
  const source = read("src/app/auth/callback/route.ts");
  assert.match(source, /exchangeCodeForSession/);
  assert.match(source, /startsWith\("\/"\)/);
  assert.match(source, /value\.startsWith\("\/\/"\)/);
});

test("settings saves a validated display name into auth metadata", () => {
  const source = read("src/app/dashboard/settings/page.tsx");
  assert.match(source, /updateUser/);
  assert.match(source, /full_name: cleanedDisplayName/);
  assert.match(source, /maxLength=\{80\}/);
});

test("large collection and history queries are paginated", () => {
  const collection = read("src/app/dashboard/collection/page.tsx");
  const history = read("src/app/dashboard/history/page.tsx");
  assert.match(collection, /COLLECTION_PAGE_SIZE = 48/);
  assert.match(collection, /\.range\(/);
  assert.match(history, /HISTORY_PAGE_SIZE = 30/);
  assert.match(history, /\.range\(/);
});

test("RAWG artwork is delivered through Next image optimization", () => {
  const config = read("next.config.ts");
  assert.match(config, /hostname: "media\.rawg\.io"/);
  const imageFiles = [
    "src/app/dashboard/page.tsx",
    "src/app/dashboard/search/page.tsx",
    "src/app/dashboard/collection/page.tsx",
    "src/app/dashboard/history/page.tsx",
    "src/app/dashboard/recommend/page.tsx",
  ];
  for (const path of imageFiles) assert.doesNotMatch(read(path), /\bunoptimized\b/);
});

test("the active decision is persisted behind a dedicated session module", () => {
  const source = read("src/lib/decision-session.ts");
  assert.match(source, /loadDecisionSession/);
  assert.match(source, /saveDecisionSession/);
  assert.match(source, /clearDecisionSession/);
});
