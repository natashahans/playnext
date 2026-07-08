"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

type Game = {
  id: string;
  title: string;
  background_image: string | null;
  rating: number | null;
  genres: string[] | null;
};

type UserGameRow = {
  id: string;
  added_at: string;
  games: Game | Game[] | null;
};

export default function DashboardPage() {
  const [collection, setCollection] = useState<UserGameRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_games")
        .select(`
          id,
          added_at,
          games (
            id,
            title,
            background_image,
            rating,
            genres
          )
        `)
        .eq("user_id", userData.user.id)
        .order("added_at", { ascending: false });

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      setCollection((data ?? []) as unknown as UserGameRow[]);
      setLoading(false);
    }

    fetchDashboardData();
  }, []);

  const recentGames = collection.slice(0, 4);

  if (loading) {
    return <p className="text-slate-400">Loading dashboard...</p>;
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-8">
          <Badge>Decide now</Badge>

          <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight">
            What should you play next?
          </h1>

          <p className="mt-4 max-w-2xl text-slate-400">
            Tell PlayNext your mood, available time, energy, and what kind of
            experience you want. It will recommend from your real collection.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/dashboard/recommend">Start recommendation</Button>
            <Button href="/dashboard/collection" variant="secondary">
              View collection
            </Button>
          </div>
        </div>

        <Card>
          <p className="text-sm text-slate-400">Collection</p>

          <h2 className="mt-3 text-4xl font-bold">
            {collection.length} {collection.length === 1 ? "game" : "games"}
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            These are the games PlayNext can currently recommend from.
          </p>

          <div className="mt-5">
            <Button href="/dashboard/collection" variant="secondary">
              Manage collection
            </Button>
          </div>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-sm text-slate-400">Recently added</p>
            <h2 className="mt-1 text-2xl font-semibold">Your saved games</h2>
          </div>

          <Button href="/dashboard/collection" variant="ghost">
            View collection
          </Button>
        </div>

        {recentGames.length === 0 ? (
          <Card>
            <h2 className="text-xl font-semibold">No games yet</h2>
            <p className="mt-2 text-slate-400">
              Add games to your collection so PlayNext can start making useful
              recommendations.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentGames.map((item) => {
              const game = Array.isArray(item.games)
                ? item.games[0]
                : item.games;

              if (!game) return null;

              return (
                <Card key={item.id} className="overflow-hidden p-0">
                  {game.background_image ? (
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

                  <div className="p-4">
                    <h3 className="font-semibold text-white">{game.title}</h3>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {game.genres?.slice(0, 2).map((genre) => (
                        <Badge key={genre}>{genre}</Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}