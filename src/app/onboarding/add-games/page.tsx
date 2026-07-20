"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AddRawgGameButton from "@/components/games/AddRawgGameButton";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { searchRawgGames, type RawgGame } from "@/lib/rawg";
import { supabase } from "@/lib/supabase";

export default function OnboardingAddGamesPage() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [games, setGames] = useState<RawgGame[]>([]);
  const [addedCount, setAddedCount] = useState(0);
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

  async function handleFinish() {
    if (addedCount < 3) {
      alert("Please add at least 3 games before continuing.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", userData.user.id);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm text-slate-400">Onboarding</p>
          <h1 className="mt-2 text-4xl font-bold">
            Add at least 3 games to your collection
          </h1>
          <p className="mt-3 max-w-2xl text-slate-400">
            PlayNext needs a small collection before it can make useful
            recommendations.
          </p>
        </div>

        <Card>
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              placeholder="Search for games you own or want to play..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500"
            />

            <button className="rounded-xl bg-white px-5 py-3 font-medium text-slate-950">
              {loading ? "Searching..." : "Search"}
            </button>
          </form>
        </Card>

        <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-sm text-slate-300">
            Games added: <span className="font-semibold">{addedCount}</span>/3
          </p>

          <Button onClick={handleFinish}>
            Continue to Home
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <Card key={game.id} className="overflow-hidden p-0">
              {game.background_image ? (
                <div className="relative h-52 w-full">
                  <Image
                    src={game.background_image}
                    alt={game.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-52 items-center justify-center bg-slate-950 text-slate-500">
                  No image
                </div>
              )}

              <div className="p-5">
                <h2 className="text-xl font-semibold">{game.name}</h2>

                <p className="mt-3 text-sm text-slate-400">
                  Rating: {game.rating ?? "N/A"}
                </p>

                <AddRawgGameButton
                  game={game}
                  onAdded={() => setAddedCount((count) => count + 1)}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
