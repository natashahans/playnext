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
    const body = (await request.json()) as { slug?: unknown; addToCollection?: unknown };
    const slug = validSlug(body.slug);
    const addToCollection = body.addToCollection === true;
    if (!slug) {
      return NextResponse.json({ error: "A valid game identifier is required." }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    const { data: existingGame, error: lookupError } = await admin
      .from("games")
      .select("id, rawg_id")
      .eq("slug", slug)
      .maybeSingle();
    if (lookupError) throw lookupError;

    let data = existingGame;
    if (!data) {
      // Only contact RAWG when this game has not already been verified locally.
      const game = await getCatalogueGame(slug);
      const { data: savedGame, error: saveError } = await admin
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

      if (saveError || !savedGame) {
        throw saveError ?? new Error("Game was not returned after saving.");
      }
      data = savedGame;
    }

    let userGameId: string | undefined;
    if (addToCollection) {
      const { error: membershipError } = await admin
        .from("user_games")
        .upsert(
          { user_id: security.userId, game_id: data.id, status: "backlog" },
          { onConflict: "user_id,game_id", ignoreDuplicates: true }
        );
      if (membershipError) throw membershipError;

      const { data: membership, error: membershipLookupError } = await admin
        .from("user_games")
        .select("id")
        .eq("user_id", security.userId)
        .eq("game_id", data.id)
        .single();
      if (membershipLookupError || !membership) {
        throw membershipLookupError ?? new Error("Collection membership was not returned.");
      }
      userGameId = membership.id;
    }

    return NextResponse.json(
      { ...data, ...(userGameId ? { user_game_id: userGameId } : {}) },
      { headers: security.headers }
    );
  } catch (error) {
    console.error("Secure game save failed:", error);
    return NextResponse.json(
      { error: "This game could not be verified and saved right now." },
      { status: 502, headers: security.headers }
    );
  }
}
