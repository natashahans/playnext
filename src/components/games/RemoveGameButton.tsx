"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function RemoveGameButton({
  userGameId,
  gameTitle = "this game",
  onRemoved,
}: {
  userGameId: string;
  gameTitle?: string;
  onRemoved?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleRemove() {
    setLoading(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("user_games")
      .delete()
      .eq("id", userGameId);

    if (error) {
      setErrorMessage("This game couldn’t be removed. Please try again.");
      setLoading(false);
      return;
    }

    setLoading(false);
    setConfirming(false);
    onRemoved?.();
  }

  if (confirming) {
    return (
      <div className="remove-confirmation">
        <p>
          Remove <strong>{gameTitle}</strong>?
        </p>
        <div>
          <button type="button" onClick={() => setConfirming(false)} disabled={loading}>
            Cancel
          </button>
          <button type="button" onClick={handleRemove} disabled={loading}>
            {loading ? "Removing…" : "Remove"}
          </button>
        </div>
        {errorMessage && <span role="alert">{errorMessage}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="game-remove-button"
    >
      <Trash2 size={14} aria-hidden="true" />
      Remove
    </button>
  );
}
