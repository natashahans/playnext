"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { RawgGame } from "@/lib/rawg";
import { saveCatalogueGame } from "@/lib/catalogue-client";

export default function AddRawgGameButton({
  game,
  alreadyAdded = false,
  existingUserGameId,
  onAdded,
  onRemoved,
  compact = false,
  iconOnly = false,
}: {
  game: RawgGame;
  alreadyAdded?: boolean;
  existingUserGameId?: string;
  onAdded?: (userGameId?: string) => void;
  onRemoved?: () => void;
  compact?: boolean;
  iconOnly?: boolean;
}) {
  const [added, setAdded] = useState(alreadyAdded || Boolean(existingUserGameId));
  const [userGameId, setUserGameId] = useState<string | null>(existingUserGameId ?? null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const isAdded = added;

  async function handleToggleGame() {
    if (loading) return;

    setLoading(true);
    setErrorMessage("");

    if (isAdded) {
      setAdded(false);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setAdded(true);
        setErrorMessage("Please log in again.");
        setLoading(false);
        return;
      }

      let membershipId = userGameId;

      if (!membershipId) {
        const { data } = await supabase
          .from("user_games")
          .select("id, games!inner(rawg_id)")
          .eq("user_id", userData.user.id)
          .eq("games.rawg_id", game.id)
          .maybeSingle();
        membershipId = (data as { id?: string } | null)?.id ?? null;
      }

      if (!membershipId) {
        setAdded(false);
        setLoading(false);
        onRemoved?.();
        return;
      }

      const { error } = await supabase
        .from("user_games")
        .delete()
        .eq("id", membershipId)
        .eq("user_id", userData.user.id);

      if (error) {
        setAdded(true);
        setErrorMessage("This game could not be removed. Please try again.");
        setLoading(false);
        return;
      }

      setUserGameId(null);
      setLoading(false);
      onRemoved?.();
      return;
    }

    // Change the icon immediately, then roll it back only if persistence fails.
    setAdded(true);
    let savedGame: { id: string; user_game_id?: string };
    try {
      savedGame = await saveCatalogueGame(game.slug, { addToCollection: true });
    } catch {
      setAdded(false);
      setErrorMessage("This game could not be added. Please try again.");
      setLoading(false);
      return;
    }

    if (!savedGame.user_game_id) {
      setAdded(false);
      setErrorMessage("This game could not be added to your collection.");
      setLoading(false);
      return;
    }

    setUserGameId(savedGame.user_game_id);
    setLoading(false);
    onAdded?.(savedGame.user_game_id);
  }

  return (
    <div className="game-add-action">
      <button
        type="button"
        onClick={handleToggleGame}
        disabled={loading}
        className={`${isAdded ? "game-add-button game-add-button-added" : "game-add-button"}${compact ? " game-add-button-compact" : ""}${iconOnly ? " game-add-button-icon" : ""}`}
        aria-label={isAdded ? `Remove ${game.name} from your collection` : `Add ${game.name} to your collection`}
        aria-pressed={isAdded}
        title={isAdded ? "Remove from collection" : "Add to collection"}
      >
        {isAdded ? (
          <Check size={15} aria-hidden="true" />
        ) : (
          <Plus size={15} aria-hidden="true" />
        )}
        {!iconOnly && (
          compact
            ? isAdded ? "Saved" : loading ? "Adding…" : "Add"
            : isAdded ? "In collection" : loading ? "Adding…" : "Add to collection"
        )}
      </button>
      {errorMessage && <span role="alert">{errorMessage}</span>}
    </div>
  );
}
