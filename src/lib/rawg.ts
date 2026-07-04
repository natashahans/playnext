export type RawgGame = {
  id: number;
  name: string;
  slug: string;
  background_image: string | null;
  released: string | null;
  rating: number | null;
  genres: {
    id: number;
    name: string;
  }[];
  platforms:
    | {
        platform: {
          id: number;
          name: string;
        };
      }[]
    | null;
  playtime: number | null;
  tags: {
    id: number;
    name: string;
  }[];
};

type RawgSearchResponse = {
  results: RawgGame[];
};

export async function searchRawgGames(query: string): Promise<RawgGame[]> {
  const apiKey = process.env.NEXT_PUBLIC_RAWG_API_KEY;

  if (!apiKey) {
    throw new Error("Missing RAWG API key.");
  }

  const response = await fetch(
    `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(
      query
    )}&page_size=12`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch games from RAWG.");
  }

  const data: RawgSearchResponse = await response.json();

  return data.results;
}