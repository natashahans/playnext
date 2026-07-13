"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { RawgGame } from "@/lib/rawg";

export default function AddRawgGameButton({
  game,
  alreadyAdded = false,
  onAdded,
}: {
  game: RawgGame;
  alreadyAdded?: boolean;
  onAdded?: () => void;
}) {
  const [added, setAdded] = useState(alreadyAdded);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleAddGame() {
    if (loading || added) return;

    setLoading(true);
    setErrorMessage("");

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setErrorMessage("Please log in again.");
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
          platforms: game.platforms?.map((item) => item.platform.name) ?? [],
          tags:
            game.tags
              ?.filter((tag) => /^[\x00-\x7F\s\-':,&()]+$/.test(tag.name))
              .map((tag) => tag.name) ?? [],
        },
        { onConflict: "rawg_id" }
      )
      .select("id")
      .single();

    if (gameError) {
      setErrorMessage("This game couldn’t be added. Please try again.");
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
      setErrorMessage("This game couldn’t be added to your collection.");
      setLoading(false);
      return;
    }

    setAdded(true);
    setLoading(false);
    onAdded?.();
  }

  return (
    <div className="game-add-action">
      <button
        type="button"
        onClick={handleAddGame}
        disabled={loading || added}
        className={added ? "game-add-button game-add-button-added" : "game-add-button"}
      >
        {added ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
        {added ? "In collection" : loading ? "Adding…" : "Add to collection"}
      </button>
      {errorMessage && <span role="alert">{errorMessage}</span>}
    </div>
  );
}
