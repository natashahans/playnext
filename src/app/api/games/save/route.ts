import { NextResponse } from "next/server";
import { protectApi } from "@/lib/api-security";
import { getCatalogueGame } from "@/lib/rawg-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

function validSlug(value: unknown) {
  if (typeof value !== "string") return "";
  const slug = value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{0,119}$/.test(slug) ? slug : "";
}

export async function POST(request: Request) {
  const security = await protectApi(request, {
    bucket: "save-game",
    limit: 30,
    windowMs: 60_000,
  });
  if (!security.ok) return security.response;

  try {
    const body = (await request.json()) as { slug?: unknown };
    const slug = validSlug(body.slug);
    if (!slug) {
      return NextResponse.json({ error: "A valid game identifier is required." }, { status: 400 });
    }

    // Game metadata is fetched server-side so clients cannot overwrite the shared catalogue.
    const game = await getCatalogueGame(slug);
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("games")
      .upsert({
        rawg_id: game.id,
        title: game.name.slice(0, 240),
        slug: game.slug,
        background_image: game.background_image,
        released: game.released,
        rating: game.rating,
        playtime: game.playtime,
        genres: game.genres.slice(0, 20).map((genre) => genre.name.slice(0, 80)),
        platforms: (game.platforms ?? []).slice(0, 30).map((item) => item.platform.name.slice(0, 80)),
        tags: game.tags
          .filter((tag) => /^[\x00-\x7F\s\-':,&()]+$/.test(tag.name))
          .slice(0, 40)
          .map((tag) => tag.name.slice(0, 80)),
      }, { onConflict: "rawg_id" })
      .select("id, rawg_id")
      .single();

    if (error || !data) throw error ?? new Error("Game was not returned after saving.");

    return NextResponse.json(data, { headers: security.headers });
  } catch (error) {
    console.error("Secure game save failed:", error);
    return NextResponse.json(
      { error: "This game could not be verified and saved right now." },
      { status: 502, headers: security.headers }
    );
  }
}
