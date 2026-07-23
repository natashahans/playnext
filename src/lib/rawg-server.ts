import type {
  DiscoveryPayload,
  RawgGame,
  RawgGameDetail,
  RawgScreenshot,
} from "@/lib/rawg";
import type { ExtractedIntent, UserPreferences } from "@/lib/recommendation/types";

type RawgListResponse<T> = {
  results: T[];
};

const RAWG_BASE_URL = "https://api.rawg.io/api";

function getApiKey() {
  const apiKey = process.env.RAWG_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing RAWG API key. Add RAWG_API_KEY to your .env.local file."
    );
  }

  return apiKey;
}

async function rawgFetch<T>(
  path: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  const url = new URL(`${RAWG_BASE_URL}${path}`);
  url.searchParams.set("key", getApiKey());

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, {
    next: { revalidate: 60 * 30 },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`RAWG request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function offsetDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

function removeGamesWithoutArtwork(games: RawgGame[]) {
  return games.filter((game) => Boolean(game.background_image));
}

function uniqueGames(games: RawgGame[]) {
  const seen = new Set<number>();
  return games.filter((game) => {
    if (seen.has(game.id)) return false;
    seen.add(game.id);
    return true;
  });
}

function discoveryQualityScore(game: RawgGame) {
  return (
    Math.log10(Math.max(1, game.ratings_count ?? 0)) * 34 +
    (game.rating ?? 0) * 15 +
    (game.metacritic ?? 0) * 0.35
  );
}

function curateDiscoveryGames(
  games: RawgGame[],
  {
    minRatings = 100,
    minRating = 3.2,
    limit = 12,
  }: { minRatings?: number; minRating?: number; limit?: number } = {}
) {
  const today = toDateString(new Date());
  const unsuitableTitle = /\b(demo|soundtrack|benchmark|playtest|test server|artbook)\b/i;
  const eligible = uniqueGames(removeGamesWithoutArtwork(games)).filter((game) =>
    !unsuitableTitle.test(game.name) && (!game.released || game.released <= today)
  );
  const preferred = eligible.filter(
    (game) => (game.ratings_count ?? 0) >= minRatings && (game.rating ?? 0) >= minRating
  );
  const pool = preferred.length >= 8 ? preferred : eligible;

  return pool
    .sort((a, b) => discoveryQualityScore(b) - discoveryQualityScore(a))
    .slice(0, limit);
}

function rankDiscoveryCandidates(games: RawgGame[]) {
  return uniqueGames(games)
    .sort((a, b) => discoveryQualityScore(b) - discoveryQualityScore(a));
}

async function getGames(params: Record<string, string | number>) {
  const data = await rawgFetch<RawgListResponse<RawgGame>>("/games", {
    page_size: 12,
    ...params,
  });

  return removeGamesWithoutArtwork(data.results);
}

const GENRE_SLUGS: Record<string, string> = {
  action: "action",
  adventure: "adventure",
  arcade: "arcade",
  casual: "casual",
  family: "family",
  fighting: "fighting",
  indie: "indie",
  multiplayer: "massively-multiplayer",
  platformer: "platformer",
  puzzle: "puzzle",
  racing: "racing",
  rpg: "role-playing-games-rpg",
  "role playing": "role-playing-games-rpg",
  shooter: "shooter",
  simulation: "simulation",
  sports: "sports",
  strategy: "strategy",
};

const EXPERIENCE_GENRES: Record<string, string[]> = {
  action: ["action", "shooter"],
  challenge: ["platformer", "action"],
  creative: ["simulation", "indie"],
  exploration: ["adventure", "role-playing-games-rpg"],
  funny: ["casual", "indie"],
  immersive: ["adventure", "role-playing-games-rpg"],
  relaxing: ["casual", "puzzle", "simulation"],
  scary: ["adventure", "action"],
  social: ["massively-multiplayer", "sports"],
  story: ["adventure", "role-playing-games-rpg"],
  strategic: ["strategy", "card"],
};

const PLATFORM_IDS: Record<string, number[]> = {
  pc: [4],
  playstation: [187, 18],
  "playstation 5": [187],
  "playstation 4": [18],
  xbox: [186, 1],
  "xbox series x s": [186],
  "xbox one": [1],
  "nintendo switch": [7],
  switch: [7],
};

function normalizeLookup(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const ROMAN_NUMERALS: Record<string, string> = {
  i: "1",
  ii: "2",
  iii: "3",
  iv: "4",
  v: "5",
  vi: "6",
  vii: "7",
  viii: "8",
  ix: "9",
  x: "10",
};

const SEARCH_ALIASES: Record<string, string[]> = {
  gta: ["grand theft auto"],
  "gta 5": ["grand theft auto 5", "grand theft auto v"],
  "gta v": ["grand theft auto 5", "grand theft auto v"],
  rdr2: ["red dead redemption 2"],
  "cod mw2": ["call of duty modern warfare 2", "call of duty modern warfare ii"],
  "cod mw3": ["call of duty modern warfare 3", "call of duty modern warfare iii"],
  mw2: ["modern warfare 2", "modern warfare ii", "call of duty modern warfare 2", "call of duty modern warfare ii"],
  mw3: ["modern warfare 3", "modern warfare iii", "call of duty modern warfare 3", "call of duty modern warfare iii"],
  bg3: ["baldurs gate 3", "baldur s gate 3", "baldurs gate iii"],
  dmc5: ["devil may cry 5", "devil may cry v"],
  cs2: ["counter strike 2"],
};

function normalizeWithNumerals(value: string) {
  return value
    .split(" ")
    .map((token) => ROMAN_NUMERALS[token] ?? token)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitTerms(value: string) {
  return value.split(" ").filter(Boolean);
}

function isNumericTerm(term: string) {
  return /^\d+$/.test(term);
}

function buildSearchVariants(query: string) {
  const normalized = normalizeLookup(query);
  const normalizedNumeric = normalizeWithNumerals(normalized);

  const variants = [normalized, normalizedNumeric];
  const aliasValues = [
    ...(SEARCH_ALIASES[normalized] ?? []),
    ...(SEARCH_ALIASES[normalizedNumeric] ?? []),
  ].map((value) => normalizeWithNumerals(normalizeLookup(value)));

  const seen = new Set<string>();
  const deduped = [...variants, ...aliasValues]
    .filter(Boolean)
    .filter((variant) => {
      if (seen.has(variant)) return false;
      seen.add(variant);
      return true;
    });

  return {
    primary: deduped[0] ?? "",
    variants: deduped.slice(0, 5),
    aliasVariants: deduped.slice(1),
  };
}

function scoreTitleMatch(title: string, variant: string) {
  if (!variant) return { score: 0, numericOnly: false };

  const titleTerms = splitTerms(title);
  const variantTerms = splitTerms(variant);
  const shared = variantTerms.filter((term) => titleTerms.includes(term));
  const sharedNumeric = shared.filter(isNumericTerm).length;
  const sharedNonNumeric = shared.length - sharedNumeric;
  const variantNonNumericTerms = variantTerms.filter((term) => !isNumericTerm(term));
  const allNonNumericMatched = variantNonNumericTerms.length > 0
    && variantNonNumericTerms.every((term) => titleTerms.includes(term));
  const allTermsMatched = variantTerms.length > 0
    && variantTerms.every((term) => titleTerms.includes(term));

  let score = 0;
  if (title === variant) score = 12_000;
  else if (title.startsWith(`${variant} `) || title.startsWith(variant)) score = 7_600;
  else if (allTermsMatched) score = 6_100;
  else if (allNonNumericMatched && sharedNumeric > 0) score = 5_600;
  else if (variant.length >= 4 && title.includes(variant)) score = 4_200;
  else score = sharedNonNumeric * 860 + sharedNumeric * 80;

  const numericOnly = sharedNonNumeric === 0 && sharedNumeric > 0;
  if (numericOnly) score -= 520;

  return { score, numericOnly };
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function candidateGenres(intent: ExtractedIntent, preferences: UserPreferences | null) {
  const explicit = intent.preferredGenres
    .map((genre) => GENRE_SLUGS[normalizeLookup(genre)])
    .filter((genre): genre is string => Boolean(genre));
  const experiences = intent.desiredExperiences.flatMap(
    (experience) => EXPERIENCE_GENRES[normalizeLookup(experience)] ?? []
  );
  const saved = (preferences?.favorite_genres ?? [])
    .map((genre) => GENRE_SLUGS[normalizeLookup(genre)])
    .filter((genre): genre is string => Boolean(genre));

  return unique([...explicit, ...experiences, ...saved]).slice(0, 4);
}

function candidatePlatforms(preferences: UserPreferences | null) {
  return unique(
    (preferences?.preferred_platforms ?? []).flatMap(
      (platform) => PLATFORM_IDS[normalizeLookup(platform)] ?? []
    )
  ).slice(0, 4);
}

function platformIdsFromPreferenceNames(preferredPlatforms?: string[] | null) {
  return unique(
    (preferredPlatforms ?? []).flatMap(
      (platform) => PLATFORM_IDS[normalizeLookup(platform)] ?? []
    )
  ).slice(0, 4);
}

function gameMatchesAnyPlatform(game: RawgGame, platformIds: Set<number>) {
  if (platformIds.size === 0) return true;
  const gamePlatforms = game.platforms ?? [];
  return gamePlatforms.some((item) => platformIds.has(item.platform.id));
}

function filterByPlatformPreference(games: RawgGame[], preferredPlatformIds: number[]) {
  if (preferredPlatformIds.length === 0) return games;
  const allowed = new Set(preferredPlatformIds);
  return games.filter((game) => gameMatchesAnyPlatform(game, allowed));
}

function hasAvoidedGenre(game: RawgGame, avoidedGenres: string[]) {
  const avoided = avoidedGenres.map(normalizeLookup);
  return game.genres.some((genre) => {
    const value = normalizeLookup(genre.name);
    return avoided.some((item) => value === item || value.includes(item) || item.includes(value));
  });
}

function interleaveGroups(groups: RawgGame[][]) {
  const output: RawgGame[] = [];
  const longest = Math.max(0, ...groups.map((group) => group.length));
  for (let index = 0; index < longest; index += 1) {
    groups.forEach((group) => {
      if (group[index]) output.push(group[index]);
    });
  }
  return output;
}

export async function getRecommendationCandidates({
  intent,
  preferences,
  excludedRawgIds,
}: {
  intent: ExtractedIntent;
  preferences: UserPreferences | null;
  excludedRawgIds: number[];
}) {
  const today = offsetDate(0);
  const fourYearsAgo = offsetDate(-1460);
  const genres = candidateGenres(intent, preferences);
  const platforms = candidatePlatforms(preferences);
  const contextualParams: Record<string, string | number> = {
    ordering: "-rating",
    page_size: 30,
  };

  if (genres.length > 0) contextualParams.genres = genres.join(",");
  if (platforms.length > 0) contextualParams.platforms = platforms.join(",");

  const focusedGenreRequests = genres.slice(0, 3).map((genre) =>
    getGames({
      genres: genre,
      ...(platforms.length > 0 ? { platforms: platforms.join(",") } : {}),
      ordering: "-rating",
      page_size: 24,
    })
  );
  const candidateRequests = await Promise.allSettled([
    getGames(contextualParams),
    ...focusedGenreRequests,
    getGames({ dates: `${fourYearsAgo},${today}`, ordering: "-added", page_size: 30 }),
    getGames({ metacritic: "78,100", ordering: "-metacritic", page_size: 30 }),
  ]);

  const candidateGroups = candidateRequests.map((result) =>
    result.status === "fulfilled" ? result.value : []
  );

  if (candidateRequests.every((result) => result.status === "rejected")) {
    throw new Error("Every RAWG recommendation candidate request failed.");
  }

  const excluded = new Set(excludedRawgIds);
  const seen = new Set<number>();

  return interleaveGroups(candidateGroups)
    .filter((game) => {
      if (excluded.has(game.id) || seen.has(game.id) || hasAvoidedGenre(game, intent.avoidedGenres)) {
        return false;
      }
      seen.add(game.id);
      return Boolean(game.background_image) && (game.rating ?? 0) > 0;
    })
    .slice(0, 90);
}

export async function searchGames(
  query: string,
  options: { preferredPlatformNames?: string[] | null; limit?: number } = {}
) {
  const preferredPlatformIds = platformIdsFromPreferenceNames(options.preferredPlatformNames);
  const platformSet = new Set(preferredPlatformIds);
  const platformParam = preferredPlatformIds.join(",");
  const { primary, variants, aliasVariants } = buildSearchVariants(query);
  const resultLimit = Math.min(24, Math.max(1, options.limit ?? 24));

  const platformScopedQueries = preferredPlatformIds.length > 0
    ? variants.slice(0, 2).map((variant) =>
      getGames({ search: variant, platforms: platformParam, ordering: "-added", page_size: 40 })
    )
    : [];

  const lexicalQueries = variants.flatMap((variant) => [
    getGames({ search: variant, search_precise: "true", page_size: 40 }),
    getGames({ search: variant, ordering: "-added", page_size: 40 }),
  ]);

  const requests = await Promise.allSettled([
    ...platformScopedQueries,
    getGames({ search: primary || query, search_exact: "true", page_size: 40 }),
    ...lexicalQueries,
  ]);
  const games = uniqueGames(
    requests.flatMap((result) => result.status === "fulfilled" ? result.value : [])
  );

  if (requests.every((result) => result.status === "rejected")) {
    throw new Error("Every RAWG search request failed.");
  }

  const aliasSet = new Set(aliasVariants);

  return games
    .map((game) => {
      const title = normalizeWithNumerals(normalizeLookup(game.name));
      const bestMatch = variants.reduce(
        (best, variant) => {
          const current = scoreTitleMatch(title, variant);
          return current.score > best.score ? current : best;
        },
        { score: 0, numericOnly: false }
      );

      const aliasBoost = aliasSet.size > 0 && [...aliasSet].some((variant) =>
        title === variant || title.startsWith(`${variant} `) || title.includes(variant)
      )
        ? 2_400
        : 0;

      const numberOnlyPenalty = bestMatch.numericOnly ? 350 : 0;
      const popularityScore = Math.log10(Math.max(1, game.ratings_count ?? 0)) * 42;
      const qualityScore = (game.rating ?? 0) * 8 + (game.metacritic ?? 0) * 0.2;
      const platformBoost = platformSet.size === 0
        ? 0
        : gameMatchesAnyPlatform(game, platformSet)
          ? 1_250
          : -320;
      return {
        game,
        relevance: bestMatch.score + aliasBoost + popularityScore + qualityScore + platformBoost - numberOnlyPenalty,
      };
    })
    .sort((a, b) => b.relevance - a.relevance || a.game.name.localeCompare(b.game.name))
    .map((item) => item.game)
    .slice(0, resultLimit);
}

export async function getDiscoveryGames(
  options: { preferredPlatformNames?: string[] | null } = {}
): Promise<DiscoveryPayload> {
  const recentStart = offsetDate(-1460);
  const today = offsetDate(0);
  const newReleaseStart = offsetDate(-365);
  const preferredPlatformIds = platformIdsFromPreferenceNames(options.preferredPlatformNames);
  const platformParam = preferredPlatformIds.join(",");
  const withPlatforms = (params: Record<string, string | number>) => (
    preferredPlatformIds.length > 0 ? { ...params, platforms: platformParam } : params
  );

  const sectionConfigs = [
    {
      id: "trending",
      title: "Trending now",
      subtitle: "The games players cannot stop talking about",
      params: {
        dates: `${recentStart},${today}`,
        ordering: "-added",
      },
      minRatings: 250,
      minRating: 3.25,
    },
    {
      id: "popular",
      title: "Popular right now",
      subtitle: "Recognisable favourites and widely played games",
      params: {
        ordering: "-added",
      },
      minRatings: 1000,
      minRating: 3.4,
    },
    {
      id: "new-releases",
      title: "Fresh releases",
      subtitle: "Recently released games worth knowing about",
      params: {
        dates: `${newReleaseStart},${today}`,
        ordering: "-added",
      },
      minRatings: 35,
      minRating: 3.1,
    },
    {
      id: "top-rated",
      title: "Critically acclaimed",
      subtitle: "Standout games with exceptional scores",
      params: {
        metacritic: "82,100",
        ordering: "-metacritic",
      },
      minRatings: 300,
      minRating: 3.6,
    },
    {
      id: "story-rich",
      title: "Story-rich worlds",
      subtitle: "Memorable characters, choices and narratives",
      params: {
        tags: "story-rich",
        ordering: "-added",
      },
      minRatings: 250,
      minRating: 3.4,
    },
    {
      id: "multiplayer",
      title: "Better together",
      subtitle: "Co-op and multiplayer games for shared sessions",
      params: {
        tags: "multiplayer",
        ordering: "-added",
      },
      minRatings: 400,
      minRating: 3.25,
    },
    {
      id: "relaxing",
      title: "Easy-going picks",
      subtitle: "Lower-pressure games for a calmer session",
      params: {
        genres: "casual,puzzle",
        ordering: "-added",
      },
      minRatings: 100,
      minRating: 3.25,
    },
  ] as const;

  const initialGroups = await Promise.all(sectionConfigs.map((section) =>
    getGames(withPlatforms({ ...section.params, page_size: 60 }))
  ));

  const displayedIds = new Set<number>();

  const builtSections: DiscoveryPayload["sections"] = [];
  for (const [index, section] of sectionConfigs.entries()) {
      const baseGames = initialGroups[index];
      const strict = filterByPlatformPreference(
        curateDiscoveryGames(baseGames, {
          minRatings: section.minRatings,
          minRating: section.minRating,
          limit: 36,
        }),
        preferredPlatformIds
      );
      const relaxed = filterByPlatformPreference(
        curateDiscoveryGames(baseGames, {
          minRatings: Math.max(25, Math.floor(section.minRatings * 0.45)),
          minRating: Math.max(2.9, section.minRating - 0.35),
          limit: 56,
        }),
        preferredPlatformIds
      );
      const broad = filterByPlatformPreference(rankDiscoveryCandidates(baseGames).slice(0, 80), preferredPlatformIds);

      let candidatePool = uniqueGames([...strict, ...relaxed, ...broad]);
      let selected = candidatePool.filter((game) => !displayedIds.has(game.id)).slice(0, 12);

      // Pull one additional page only when uniqueness pressure would otherwise force early duplicates.
      if (selected.length < 12) {
        const expansion = await getGames(withPlatforms({ ...section.params, page_size: 60, page: 2 }));
        const expandedStrict = filterByPlatformPreference(
          curateDiscoveryGames(expansion, {
            minRatings: section.minRatings,
            minRating: section.minRating,
            limit: 36,
          }),
          preferredPlatformIds
        );
        const expandedRelaxed = filterByPlatformPreference(
          curateDiscoveryGames(expansion, {
            minRatings: Math.max(25, Math.floor(section.minRatings * 0.45)),
            minRating: Math.max(2.9, section.minRating - 0.35),
            limit: 56,
          }),
          preferredPlatformIds
        );
        const expandedBroad = filterByPlatformPreference(rankDiscoveryCandidates(expansion).slice(0, 80), preferredPlatformIds);

        candidatePool = uniqueGames([
          ...candidatePool,
          ...expandedStrict,
          ...expandedRelaxed,
          ...expandedBroad,
        ]);
        selected = candidatePool.filter((game) => !displayedIds.has(game.id)).slice(0, 12);
      }

      if (selected.length < 12) {
        const sectionIds = new Set(selected.map((game) => game.id));
        const duplicates = candidatePool.filter((game) => !sectionIds.has(game.id));
        selected = [...selected, ...duplicates].slice(0, 12);
      }

      selected.forEach((game) => displayedIds.add(game.id));

      builtSections.push({
        id: section.id,
        title: section.title,
        subtitle: section.subtitle,
        games: selected,
      });
  }

  const trending = builtSections.find((section) => section.id === "trending")?.games ?? [];
  const topRated = builtSections.find((section) => section.id === "top-rated")?.games ?? [];
  const featureCandidates = [...trending.slice(0, 5), ...topRated.slice(0, 3)];
  const dayNumber = Math.floor(Date.now() / 86_400_000);

  return {
    featured: featureCandidates[dayNumber % Math.max(featureCandidates.length, 1)] ?? null,
    sections: builtSections,
  };
}

export async function getCatalogueGame(slug: string) {
  return rawgFetch<RawgGameDetail>(`/games/${encodeURIComponent(slug)}`);
}

export async function getGameDetails(
  slug: string,
  options: { preferredPlatformNames?: string[] | null } = {}
) {
  const preferredPlatformIds = platformIdsFromPreferenceNames(options.preferredPlatformNames);
  const game = await getCatalogueGame(slug);

  const screenshotsPromise = rawgFetch<RawgListResponse<RawgScreenshot>>(
    `/games/${encodeURIComponent(slug)}/screenshots`,
    { page_size: 8 }
  ).catch(() => ({ results: [] }));

  const primaryGenre = game.genres[0]?.slug;
  const similarPromise = primaryGenre
    ? getGames({ genres: primaryGenre, ordering: "-rating", page_size: 10 })
    : Promise.resolve([]);

  const [screenshots, similarGames] = await Promise.all([
    screenshotsPromise,
    similarPromise,
  ]);

  return {
    game,
    screenshots: screenshots.results,
    similar: filterByPlatformPreference(
      similarGames.filter((item) => item.id !== game.id),
      preferredPlatformIds
    ).slice(0, 8),
  };
}
