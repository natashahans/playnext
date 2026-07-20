import { authenticatedFetch } from "@/lib/authenticated-fetch";

type SavedCatalogueGame = {
  id: string;
  rawg_id: number;
};

export async function saveCatalogueGame(slug: string) {
  const response = await authenticatedFetch("/api/games/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  });

  const payload = (await response.json()) as Partial<SavedCatalogueGame> & { error?: string };
  if (!response.ok || !payload.id || !payload.rawg_id) {
    throw new Error(payload.error || "This game could not be saved.");
  }

  return payload as SavedCatalogueGame;
}
