"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { RawgGame } from "@/lib/rawg";

export default function AddRawgGameButton({
  game,
  onAdded,
}: {
  game: RawgGame;
  onAdded?: () => void;
}) {
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAddGame() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      alert("You must be logged in.");
      setLoading(false);
      return;
    }

    const { data: savedGame, error: gameError } = await supabase
      .from("games")
      .upsert(
        {
          rawg_id: game.id,
          title: game.name,
          slug: game.slug,
          background_image: game.background_image,
          released: game.released,
          rating: game.rating,
          playtime: game.playtime,
          genres: game.genres?.map((genre) => genre.name) ?? [],
          platforms:
            game.platforms?.map((item) => item.platform.name) ?? [],
          tags: game.tags?.map((tag) => tag.name) ?? [],
        },
        { onConflict: "rawg_id" }
      )
      .select("id")
      .single();

    if (gameError) {
      alert(gameError.message);
      setLoading(false);
      return;
    }

    const { error: userGameError } = await supabase
      .from("user_games")
      .upsert(
        {
          user_id: userData.user.id,
          game_id: savedGame.id,
          status: "backlog",
        },
        {
          onConflict: "user_id,game_id",
          ignoreDuplicates: true,
        }
      );

    if (userGameError) {
      alert(userGameError.message);
      setLoading(false);
      return;
    }

    setAdded(true);
    onAdded?.();
    setLoading(false);
  }

  return (
    <button
      onClick={handleAddGame}
      disabled={loading || added}
      className="mt-4 w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
    >
      {added ? "Added to collection" : loading ? "Adding..." : "Add to collection"}
    </button>
  );
}