"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import RemoveGameButton from "@/components/games/RemoveGameButton";

type GameDetails = {
  id: string;
  title: string;
  background_image: string | null;
  rating: number | null;
  genres: string[] | null;
  platforms: string[] | null;
};

type CollectionRow = {
  id: string;
  status: string;
  added_at: string;
  games: GameDetails | GameDetails[] | null;
};

export default function CollectionPage() {
  const [collection, setCollection] = useState<CollectionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCollection() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_games")
        .select(`
          id,
          status,
          added_at,
          games (
            id,
            title,
            background_image,
            rating,
            genres,
            platforms
          )
        `)
        .eq("user_id", userData.user.id)
        .order("added_at", { ascending: false });

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      setCollection((data ?? []) as unknown as CollectionRow[]);
      setLoading(false);
    }

    fetchCollection();
  }, []);

  if (loading) {
    return <p className="text-slate-400">Loading collection...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">My Collection</p>
        <h1 className="mt-2 text-3xl font-bold">Saved games</h1>
        <p className="mt-3 text-slate-400">
          Games you have added to your PlayNext collection.
        </p>
      </div>

      {collection.length === 0 ? (
        <Card>
          <h2 className="text-xl font-semibold">No games yet</h2>
          <p className="mt-2 text-slate-400">
            Add games first so PlayNext can recommend from your collection.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collection.map((item) => {
            const game = Array.isArray(item.games)
              ? item.games[0]
              : item.games;

            return (
              <Card key={item.id} className="overflow-hidden p-0">
                {game?.background_image ? (
                  <img
                    src={game.background_image}
                    alt={game.title}
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center bg-slate-950 text-slate-500">
                    No image
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-xl font-semibold">
                      {game?.title ?? "Unknown game"}
                    </h2>

                    <Badge>{item.status}</Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {game?.genres?.slice(0, 3).map((genre) => (
                      <Badge key={genre}>{genre}</Badge>
                    ))}
                  </div>

                  <p className="mt-4 text-sm text-slate-400">
                    Rating: {game?.rating ?? "N/A"}
                  </p>

                  <RemoveGameButton userGameId={item.id} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}