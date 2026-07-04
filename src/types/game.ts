export type Game = {
  id: string;
  rawg_id: number | null;
  title: string;
  slug: string | null;
  background_image: string | null;
  released: string | null;
  rating: number | null;
  genres: string[] | null;
  platforms: string[] | null;
  created_at: string;
};