import { authenticatedFetch } from "@/lib/authenticated-fetch";

type SavedCatalogueGame = {
  id: string;
  rawg_id: number;
  user_game_id?: string;
};

export async function saveCatalogueGame(
  slug: string,
  options: { addToCollection?: boolean } = {}
) {
  const response = await authenticatedFetch("/api/games/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, addToCollection: options.addToCollection === true }),
  });

  const payload = (await response.json()) as Partial<SavedCatalogueGame> & { error?: string };
  if (!response.ok || !payload.id || !payload.rawg_id) {
    throw new Error(payload.error || "This game could not be saved.");
  }

  return payload as SavedCatalogueGame;
}
