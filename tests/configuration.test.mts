import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function text(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("environment files and build output are excluded from Git", async () => {
  const gitignore = await text(".gitignore");
  assert.match(gitignore, /^\.env\*/m);
  assert.match(gitignore, /^\/\.next\//m);
});

test("RAWG credentials are server-only", async () => {
  const server = await text("src/lib/rawg-server.ts");
  assert.match(server, /process\.env\.RAWG_API_KEY/);
  assert.doesNotMatch(server, /NEXT_PUBLIC_RAWG_API_KEY/);
});

test("sensitive API routes enforce authenticated access", async () => {
  const routes = [
    "src/app/api/extract-intent/route.ts",
    "src/app/api/games/discover/route.ts",
    "src/app/api/games/recommend/route.ts",
    "src/app/api/games/save/route.ts",
    "src/app/api/games/[slug]/route.ts",
  ];
  for (const route of routes) {
    assert.match(await text(route), /protectApi\(/, `${route} does not call protectApi`);
  }
});

test("browser clients attach authentication to protected API calls", async () => {
  const paths = [
    "src/lib/rawg.ts",
    "src/lib/catalogue-client.ts",
    "src/app/dashboard/search/page.tsx",
    "src/app/dashboard/search/[slug]/page.tsx",
    "src/app/dashboard/recommend/page.tsx",
  ];
  for (const path of paths) {
    assert.match(await text(path), /authenticatedFetch/, `${path} bypasses authenticatedFetch`);
  }
});

test("account enumeration endpoint is permanently disabled", async () => {
  const route = await text("src/app/api/auth/check-email/route.ts");
  assert.doesNotMatch(route, /listUsers|SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(route, /status:\s*410/);
});

test("global security headers are configured", async () => {
  const config = await text("next.config.ts");
  for (const header of [
    "Content-Security-Policy", "Referrer-Policy", "X-Content-Type-Options",
    "X-Frame-Options", "Permissions-Policy", "Strict-Transport-Security",
  ]) assert.match(config, new RegExp(header));
  assert.match(config, /poweredByHeader:\s*false/);
});
