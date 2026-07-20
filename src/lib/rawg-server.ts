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

export async function searchGames(query: string) {
  return getGames({
    search: query,
    search_precise: "false",
    ordering: "-rating",
    page_size: 24,
  });
}

export async function getDiscoveryGames(): Promise<DiscoveryPayload> {
  const recentStart = offsetDate(-730);
  const today = offsetDate(0);
  const newReleaseStart = offsetDate(-120);

  const [trending, newReleases, topRated, action, rolePlaying, indie] =
    await Promise.all([
      getGames({
        dates: `${recentStart},${today}`,
        ordering: "-added",
      }),
      getGames({
        dates: `${newReleaseStart},${today}`,
        ordering: "-released",
      }),
      getGames({
        metacritic: "82,100",
        ordering: "-metacritic",
      }),
      getGames({ genres: "action", ordering: "-rating" }),
      getGames({ genres: "role-playing-games-rpg", ordering: "-rating" }),
      getGames({ genres: "indie", ordering: "-rating" }),
    ]);

  return {
    featured: trending[0] ?? topRated[0] ?? null,
    sections: [
      {
        id: "trending",
        title: "Trending now",
        subtitle: "The games players cannot stop talking about",
        games: trending,
      },
      {
        id: "new-releases",
        title: "Fresh releases",
        subtitle: "Recently released games worth knowing about",
        games: newReleases,
      },
      {
        id: "top-rated",
        title: "Critically acclaimed",
        subtitle: "Standout games with exceptional scores",
        games: topRated,
      },
      {
        id: "action",
        title: "Action",
        subtitle: "Fast, focused and difficult to put down",
        games: action,
      },
      {
        id: "role-playing",
        title: "Role-playing",
        subtitle: "Worlds to inhabit and stories to shape",
        games: rolePlaying,
      },
      {
        id: "indie",
        title: "Indie discoveries",
        subtitle: "Distinctive ideas from independent creators",
        games: indie,
      },
    ],
  };
}

export async function getCatalogueGame(slug: string) {
  return rawgFetch<RawgGameDetail>(`/games/${encodeURIComponent(slug)}`);
}

export async function getGameDetails(slug: string) {
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
    similar: similarGames.filter((item) => item.id !== game.id).slice(0, 8),
  };
}
