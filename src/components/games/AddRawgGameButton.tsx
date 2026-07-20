"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { RawgGame } from "@/lib/rawg";
import { saveCatalogueGame } from "@/lib/catalogue-client";

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
  const isAdded = added || alreadyAdded;

  async function handleAddGame() {
    if (loading || isAdded) return;

    setLoading(true);
    setErrorMessage("");

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setErrorMessage("Please log in again.");
      setLoading(false);
      return;
    }

    let savedGame: { id: string };
    try {
      savedGame = await saveCatalogueGame(game.slug);
    } catch {
      setErrorMessage("This game could not be added. Please try again.");
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
      setErrorMessage("This game could not be added to your collection.");
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
        disabled={loading || isAdded}
        className={isAdded ? "game-add-button game-add-button-added" : "game-add-button"}
      >
        {isAdded ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
        {isAdded ? "In collection" : loading ? "Adding…" : "Add to collection"}
      </button>
      {errorMessage && <span role="alert">{errorMessage}</span>}
    </div>
  );
}
