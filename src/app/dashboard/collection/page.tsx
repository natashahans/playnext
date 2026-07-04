"use client";

import { useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import RemoveGameButton from "@/components/games/RemoveGameButton";

const filters = ["All", "Action", "RPG", "Simulation", "Platformer", "Relaxing"];

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
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

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

  const filteredCollection = useMemo(() => {
    return collection.filter((item) => {
      const game = Array.isArray(item.games) ? item.games[0] : item.games;

      if (!game) return false;

      const matchesSearch = game.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      const matchesFilter =
        activeFilter === "All" || game.genres?.includes(activeFilter);

      return matchesSearch && matchesFilter;
    });
  }, [collection, searchQuery, activeFilter]);

  if (loading) {
    return <p className="text-slate-400">Loading collection...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">My Collection</p>
        <h1 className="mt-2 text-3xl font-bold">Saved games</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Browse the games you have added to PlayNext. This collection becomes
          the decision space for recommendations.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <input
          type="text"
          placeholder="Search your collection..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                activeFilter === filter
                  ? "border-white bg-white text-slate-950"
                  : "border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {collection.length === 0 ? (
        <Card>
          <h2 className="text-xl font-semibold">No games yet</h2>
          <p className="mt-2 text-slate-400">
            Add games first so PlayNext can recommend from your collection.
          </p>
        </Card>
      ) : filteredCollection.length === 0 ? (
        <Card>
          <h2 className="text-xl font-semibold">No matching games</h2>
          <p className="mt-2 text-slate-400">
            Try a different search term or filter.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCollection.map((item) => {
            const game = Array.isArray(item.games)
              ? item.games[0]
              : item.games;

            return (
              <Card key={item.id} className="overflow-hidden p-0">
                {game?.background_image ? (
                  <img
                    src={game.background_image}
                    alt={game.title}
                    className="h-52 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-52 items-center justify-center bg-slate-950 text-slate-500">
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