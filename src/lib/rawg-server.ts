import type {
  DiscoveryPayload,
  RawgGame,
  RawgGameDetail,
  RawgScreenshot,
} from "@/lib/rawg";

type RawgListResponse<T> = {
  results: T[];
};

const RAWG_BASE_URL = "https://api.rawg.io/api";

function getApiKey() {
  const apiKey =
    process.env.RAWG_API_KEY ?? process.env.NEXT_PUBLIC_RAWG_API_KEY;

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

export async function getGameDetails(slug: string) {
  const game = await rawgFetch<RawgGameDetail>(
    `/games/${encodeURIComponent(slug)}`
  );

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
