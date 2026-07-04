"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { searchRawgGames, type RawgGame } from "@/lib/rawg";
import AddRawgGameButton from "@/components/games/AddRawgGameButton";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [games, setGames] = useState<RawgGame[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!query.trim()) return;

    setLoading(true);

    try {
      const results = await searchRawgGames(query);
      setGames(results);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Something went wrong.");
    }

    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">Add Games</p>
        <h1 className="mt-2 text-3xl font-bold">Search RAWG games</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Search for games using RAWG metadata. Next, we’ll let users add these
          results to their PlayNext collection.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            placeholder="Search for a game..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500"
          />

          <button className="rounded-xl bg-white px-5 py-3 font-medium text-slate-950">
            {loading ? "Searching..." : "Search"}
          </button>
        </form>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <Card key={game.id} className="overflow-hidden p-0">
            {game.background_image ? (
              <img
                src={game.background_image}
                alt={game.name}
                className="h-52 w-full object-cover"
              />
            ) : (
              <div className="flex h-52 items-center justify-center bg-slate-950 text-slate-500">
                No image
              </div>
            )}

            <div className="p-5">
              <h2 className="text-xl font-semibold">{game.name}</h2>

              <div className="mt-3 flex flex-wrap gap-2">
                {game.genres?.slice(0, 3).map((genre) => (
                  <Badge key={genre.id}>{genre.name}</Badge>
                ))}
              </div>

              <p className="mt-4 text-sm text-slate-400">
                Rating: {game.rating ?? "N/A"}
              </p>

              <AddRawgGameButton game={game} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}