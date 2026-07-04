"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AddGameButton({ gameId }: { gameId: string }) {
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
      alert(error.message);
      setLoading(false);
      return;
    }

    setAdded(true);
    setLoading(false);
  }

  return (
    <button
      onClick={handleAddGame}
      disabled={loading || added}
      className="mt-4 w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
    >
      {added ? "Added to collection" : loading ? "Adding..." : "Add to collection"}
    </button>
  );
}