"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AddGameButtonProps = {
  gameId: string;
  alreadyAdded?: boolean;
  onAdded?: () => void;
};

export default function AddGameButton({
  gameId,
  alreadyAdded = false,
  onAdded,
}: AddGameButtonProps) {
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

    const { error } = await supabase.from("user_games").upsert(
      {
        user_id: userData.user.id,
        game_id: gameId,
        status: "backlog",
      },
      {
        onConflict: "user_id,game_id",
        ignoreDuplicates: true,
      }
    );

    if (error) {
      setErrorMessage("This game couldn’t be added. Please try again.");
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
