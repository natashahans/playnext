export type RawgGenre = {
  id: number;
  name: string;
  slug?: string;
};

export type RawgPlatform = {
  platform: {
    id: number;
    name: string;
    slug?: string;
  };
};

export type RawgGame = {
  id: number;
  name: string;
  slug: string;
  background_image: string | null;
  released: string | null;
  rating: number | null;
  ratings_count?: number;
  metacritic?: number | null;
  genres: RawgGenre[];
  platforms: RawgPlatform[] | null;
  playtime: number | null;
  tags: {
    id: number;
    name: string;
    slug?: string;
  }[];
  short_screenshots?: {
    id: number;
    image: string;
  }[];
};

export type RawgGameDetail = RawgGame & {
  description_raw: string;
  website: string;
  developers: { id: number; name: string; slug: string }[];
  publishers: { id: number; name: string; slug: string }[];
  esrb_rating: { id: number; name: string; slug: string } | null;
  stores: {
    id: number;
    store: { id: number; name: string; slug: string };
  }[];
  clip?: {
    clip?: string;
    clips?: {
      320?: string;
      640?: string;
      full?: string;
    };
    video?: string;
    preview?: string;
  } | null;
};

export type RawgScreenshot = {
  id: number;
  image: string;
  width: number;
  height: number;
};

export type DiscoverySection = {
  id: string;
  title: string;
  subtitle: string;
  games: RawgGame[];
};

export type DiscoveryPayload = {
  featured: RawgGame | null;
  sections: DiscoverySection[];
};

export type GameDetailPayload = {
  game: RawgGameDetail;
  screenshots: RawgScreenshot[];
  similar: RawgGame[];
};

type SearchPayload = {
  results: RawgGame[];
};

export async function searchRawgGames(query: string): Promise<RawgGame[]> {
  const response = await fetch(
    `/api/games/discover?search=${encodeURIComponent(query)}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch games from RAWG.");
  }

  const data = (await response.json()) as SearchPayload;
  return data.results;
}
