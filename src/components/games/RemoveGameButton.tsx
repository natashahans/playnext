"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RemoveGameButton({
  userGameId,
}: {
  userGameId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    const confirmed = confirm("Remove this game from your collection?");

    if (!confirmed) return;

    setLoading(true);

    const { error } = await supabase
      .from("user_games")
      .delete()
      .eq("id", userGameId);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="mt-4 w-full rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Removing..." : "Remove from collection"}
    </button>
  );
}