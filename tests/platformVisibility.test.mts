import test from "node:test";
import assert from "node:assert/strict";
import { getDiscoveryGames, getGameDetails, searchGames } from "../src/lib/rawg-server.ts";
import type { RawgGame } from "../src/lib/rawg";

function rawgGame(overrides: Partial<RawgGame> & { id: number; name: string; slug: string }): RawgGame {
  return {
    id: overrides.id,
    name: overrides.name,
    slug: overrides.slug,
    background_image: overrides.background_image ?? "https://example.com/game.jpg",
    released: overrides.released ?? "2024-06-01",
    rating: overrides.rating ?? 4.2,
    ratings_count: overrides.ratings_count ?? 500,
    metacritic: overrides.metacritic ?? 82,
    genres: overrides.genres ?? [{ id: 1, name: "Action", slug: "action" }],
    platforms: overrides.platforms ?? [{ platform: { id: 4, name: "PC", slug: "pc" } }],
    playtime: overrides.playtime ?? 12,
    tags: overrides.tags ?? [{ id: 10, name: "Story Rich", slug: "story-rich" }],
    short_screenshots: overrides.short_screenshots ?? [],
  };
}

test("discovery applies preferred platform filtering during retrieval", async () => {
  process.env.RAWG_API_KEY = "test-key";

  const pcGame = rawgGame({ id: 1, name: "PC Game", slug: "pc-game", platforms: [{ platform: { id: 4, name: "PC" } }] });
  const xboxGame = rawgGame({ id: 2, name: "Xbox Game", slug: "xbox-game", platforms: [{ platform: { id: 1, name: "Xbox One" } }] });

  const requestedUrls: URL[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
    requestedUrls.push(url);
    return new Response(JSON.stringify({ results: [pcGame, xboxGame] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const payload = await getDiscoveryGames({ preferredPlatformNames: ["PC"] });
    const allGames = payload.sections.flatMap((section) => section.games);

    assert.ok(allGames.length > 0);
    assert.ok(allGames.every((game) => game.platforms?.some((item) => item.platform.id === 4)));

    const rawgGameRequests = requestedUrls.filter((url) => url.pathname === "/api/games");
    assert.ok(rawgGameRequests.length >= 7);
    assert.ok(rawgGameRequests.every((url) => url.searchParams.get("platforms") === "4"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search prioritizes preferred platform results but still returns other matches", async () => {
  process.env.RAWG_API_KEY = "test-key";

  const preferredGame = rawgGame({
    id: 11,
    name: "Arena Clash",
    slug: "arena-clash-pc",
    ratings_count: 1000,
    rating: 4.4,
    metacritic: 80,
    platforms: [{ platform: { id: 4, name: "PC" } }],
  });

  const otherPlatformGame = rawgGame({
    id: 12,
    name: "Arena Clash",
    slug: "arena-clash-xbox",
    ratings_count: 1000,
    rating: 4.4,
    metacritic: 80,
    platforms: [{ platform: { id: 1, name: "Xbox One" } }],
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    return new Response(JSON.stringify({ results: [preferredGame, otherPlatformGame] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const results = await searchGames("Arena Clash", { preferredPlatformNames: ["PC"] });
    assert.equal(results[0]?.id, preferredGame.id);
    assert.ok(results.some((game) => game.id === otherPlatformGame.id));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("game details similar rail respects preferred platforms", async () => {
  process.env.RAWG_API_KEY = "test-key";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);

    if (url.pathname === "/api/games/target-game") {
      return new Response(JSON.stringify(rawgGame({ id: 50, name: "Target Game", slug: "target-game" })), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.pathname === "/api/games/target-game/screenshots") {
      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      results: [
        rawgGame({ id: 60, name: "Similar PC", slug: "similar-pc", platforms: [{ platform: { id: 4, name: "PC" } }] }),
        rawgGame({ id: 61, name: "Similar Xbox", slug: "similar-xbox", platforms: [{ platform: { id: 1, name: "Xbox One" } }] }),
      ],
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const details = await getGameDetails("target-game", { preferredPlatformNames: ["PC"] });
    assert.equal(details.similar.length, 1);
    assert.equal(details.similar[0]?.id, 60);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("discover sections minimize cross-section duplicates when enough unique candidates exist", async () => {
  process.env.RAWG_API_KEY = "test-key";

  const idRange = (start: number, end: number) =>
    Array.from({ length: end - start + 1 }, (_, index) => start + index);

  const common = idRange(1, 24);
  const sectionPools: Record<string, number[]> = {
    trending: [...common, ...idRange(25, 80)],
    popular: [...common, ...idRange(81, 136)],
    "new-releases": [...common, ...idRange(137, 192)],
    "top-rated": [...common, ...idRange(193, 248)],
    "story-rich": [...common, ...idRange(249, 304)],
    multiplayer: [...common, ...idRange(305, 360)],
    relaxing: [...common, ...idRange(361, 416)],
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
    const params = url.searchParams;

    const dates = params.get("dates");
    const metacritic = params.get("metacritic");
    const tags = params.get("tags");
    const genres = params.get("genres");

    let key: keyof typeof sectionPools = "popular";
    if (metacritic) key = "top-rated";
    else if (tags === "story-rich") key = "story-rich";
    else if (tags === "multiplayer") key = "multiplayer";
    else if (genres === "casual,puzzle") key = "relaxing";
    else if (dates) {
      const [startDate] = dates.split(",");
      const start = new Date(`${startDate}T00:00:00`).getTime();
      const now = Date.now();
      const roughlyTwoYears = 1000 * 60 * 60 * 24 * 730;
      key = now - start > roughlyTwoYears ? "trending" : "new-releases";
    }

    const results = sectionPools[key].map((id) =>
      rawgGame({ id, name: `Game ${id}`, slug: `game-${id}` })
    );

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const payload = await getDiscoveryGames();
    const firstFour = payload.sections.slice(0, 4);
    const seen = new Set<number>();

    for (const section of firstFour) {
      for (const game of section.games) {
        assert.equal(seen.has(game.id), false, `Duplicate game ${game.id} found in early discover sections`);
        seen.add(game.id);
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("discover allows later cross-section duplicates only when candidate pools are exhausted", async () => {
  process.env.RAWG_API_KEY = "test-key";

  const constrainedPool = Array.from({ length: 8 }, (_, index) =>
    rawgGame({ id: index + 1, name: `Limited ${index + 1}`, slug: `limited-${index + 1}` })
  );

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    return new Response(JSON.stringify({ results: constrainedPool }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const payload = await getDiscoveryGames();
    const trendingIds = new Set(payload.sections[0]?.games.map((game) => game.id) ?? []);
    const popularIds = new Set(payload.sections[1]?.games.map((game) => game.id) ?? []);
    const overlap = [...popularIds].filter((id) => trendingIds.has(id));

    assert.ok(trendingIds.size > 0);
    assert.ok(popularIds.size > 0);
    assert.ok(overlap.length > 0, "Expected overlap once unique candidates are exhausted");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search ranks canonical titles first for common aliases and abbreviations", async () => {
  process.env.RAWG_API_KEY = "test-key";

  const pool = [
    rawgGame({ id: 1001, name: "Grand Theft Auto V", slug: "grand-theft-auto-v", ratings_count: 900000, rating: 4.5, metacritic: 97 }),
    rawgGame({ id: 1002, name: "Persona 5", slug: "persona-5", ratings_count: 250000, rating: 4.4, metacritic: 93 }),
    rawgGame({ id: 1003, name: "Far Cry 5", slug: "far-cry-5", ratings_count: 180000, rating: 4.0, metacritic: 81 }),
    rawgGame({ id: 1004, name: "Devil May Cry 5", slug: "devil-may-cry-5", ratings_count: 130000, rating: 4.3, metacritic: 89 }),
    rawgGame({ id: 1005, name: "Red Dead Redemption 2", slug: "red-dead-redemption-2", ratings_count: 820000, rating: 4.6, metacritic: 97 }),
    rawgGame({ id: 1006, name: "Call of Duty: Modern Warfare III", slug: "call-of-duty-modern-warfare-iii", ratings_count: 120000, rating: 3.8, metacritic: 74 }),
    rawgGame({ id: 1007, name: "Baldur's Gate 3", slug: "baldurs-gate-3", ratings_count: 410000, rating: 4.7, metacritic: 96 }),
    rawgGame({ id: 1008, name: "Resident Evil 4", slug: "resident-evil-4", ratings_count: 220000, rating: 4.4, metacritic: 93 }),
    rawgGame({ id: 1009, name: "The Witcher 3: Wild Hunt", slug: "the-witcher-3-wild-hunt", ratings_count: 780000, rating: 4.7, metacritic: 93 }),
    rawgGame({ id: 1010, name: "Elden Ring", slug: "elden-ring", ratings_count: 700000, rating: 4.7, metacritic: 96 }),
  ];

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    return new Response(JSON.stringify({ results: pool }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const expectations: Array<{ query: string; expectedId: number }> = [
      { query: "gta 5", expectedId: 1001 },
      { query: "gta v", expectedId: 1001 },
      { query: "grand theft auto", expectedId: 1001 },
      { query: "rdr2", expectedId: 1005 },
      { query: "red dead", expectedId: 1005 },
      { query: "bg3", expectedId: 1007 },
      { query: "baldurs gate", expectedId: 1007 },
      { query: "resident evil 4", expectedId: 1008 },
      { query: "witcher", expectedId: 1009 },
      { query: "persona 5", expectedId: 1002 },
      { query: "elden ring", expectedId: 1010 },
      { query: "dmc5", expectedId: 1004 },
      { query: "cod mw3", expectedId: 1006 },
    ];

    for (const expectation of expectations) {
      const results = await searchGames(expectation.query, { preferredPlatformNames: ["PC"] });
      assert.equal(
        results[0]?.id,
        expectation.expectedId,
        `Expected \"${expectation.query}\" to rank game ${expectation.expectedId} first`
      );
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
