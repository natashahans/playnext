"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AddRecommendedGameButton({ gameId }: { gameId: string }) {
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleAdd() {
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
      { user_id: userData.user.id, game_id: gameId, status: "backlog" },
      { onConflict: "user_id,game_id", ignoreDuplicates: true }
    );

    if (error) {
      setErrorMessage("This game could not be added to your collection.");
    } else {
      setAdded(true);
    }
    setLoading(false);
  }

  return (
    <div className="ai-discovery-add">
      <button type="button" onClick={handleAdd} disabled={loading || added}>
        {added ? <Check size={15} /> : <Plus size={15} />}
        {added ? "Added to collection" : loading ? "Adding…" : "Add to my collection"}
      </button>
      {errorMessage && <span role="alert">{errorMessage}</span>}
    </div>
  );
}
