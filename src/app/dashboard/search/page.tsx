"use client";

import { useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import AddGameButton from "@/components/games/AddGameButton";
import { supabase } from "@/lib/supabase";
import type { Game } from "@/types/game";

const filters = ["All", "Action", "RPG", "Simulation", "Platformer", "Relaxing"];

type UserGameRow = {
  game_id: string;
};

export default function SearchPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [addedGameIds, setAddedGameIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGames() {
      const { data: gamesData, error: gamesError } = await supabase
        .from("games")
        .select("*")
        .order("title");

      if (gamesError) {
        alert(gamesError.message);
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();

      if (userData.user) {
        const { data: userGamesData, error: userGamesError } = await supabase
          .from("user_games")
          .select("game_id")
          .eq("user_id", userData.user.id);

        if (userGamesError) {
          alert(userGamesError.message);
          setLoading(false);
          return;
        }

        setAddedGameIds(
          ((userGamesData ?? []) as UserGameRow[]).map((item) => item.game_id)
        );
      }

      setGames((gamesData ?? []) as Game[]);
      setLoading(false);
    }

    fetchGames();
  }, []);

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesSearch = game.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      const matchesFilter =
        activeFilter === "All" || game.genres?.includes(activeFilter);

      return matchesSearch && matchesFilter;
    });
  }, [games, searchQuery, activeFilter]);

  function handleGameAdded(gameId: string) {
    setAddedGameIds((currentIds) => [...currentIds, gameId]);
  }

  if (loading) {
    return <p className="text-slate-400">Loading games...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">Add Games</p>
        <h1 className="mt-2 text-3xl font-bold">Browse games</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Search and add games to your PlayNext collection. Later this page will
          use the RAWG API for live game discovery.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <input
          type="text"
          placeholder="Search games..."
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

      {filteredGames.length === 0 ? (
        <Card>
          <h2 className="text-xl font-semibold">No games found</h2>
          <p className="mt-2 text-slate-400">
            Try a different search term or filter.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGames.map((game) => {
            const isAdded = addedGameIds.includes(game.id);

            return (
              <Card key={game.id} className="overflow-hidden p-0">
                {game.background_image ? (
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
                    <h2 className="text-xl font-semibold">{game.title}</h2>

                    {isAdded && <Badge>Added</Badge>}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {game.genres?.slice(0, 3).map((genre) => (
                      <Badge key={genre}>{genre}</Badge>
                    ))}
                  </div>

                  <p className="mt-4 text-sm text-slate-400">
                    Rating: {game.rating ?? "N/A"}
                  </p>

                  <AddGameButton
                    gameId={game.id}
                    alreadyAdded={isAdded}
                    onAdded={() => handleGameAdded(game.id)}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}