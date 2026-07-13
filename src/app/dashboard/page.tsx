"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, Gamepad2, Library, Plus } from "lucide-react";
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
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchDashboardData() {
      const { data: userData } = await supabase.auth.getUser();

      if (!active) return;

      if (!userData.user) {
        setLoading(false);
        return;
      }

      const name = userData.user.user_metadata?.full_name;
      setDisplayName(typeof name === "string" ? name.split(" ")[0] : "");

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

      if (!active) return;

      if (error) {
        setErrorMessage("We couldn’t load your collection. Please refresh and try again.");
        setLoading(false);
        return;
      }

      setCollection((data ?? []) as unknown as UserGameRow[]);
      setLoading(false);
    }

    fetchDashboardData();

    return () => {
      active = false;
    };
  }, []);

  const recentGames = collection.slice(0, 4);

  if (loading) {
    return (
      <div className="pn-page-loading" role="status">
        <span className="dashboard-loading-dot" aria-hidden="true" />
        Loading your library…
      </div>
    );
  }

  if (errorMessage) {
    return (
      <Card className="pn-state-card">
        <h2>Something went wrong</h2>
        <p>{errorMessage}</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </Card>
    );
  }

  return (
    <div className="pn-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <h2>
            {displayName ? `${displayName}, what` : "What"} should you play next?
          </h2>

          <p>
            Get one clear recommendation from your collection, based on your mood
            and the time you have right now.
          </p>

          <div className="home-hero-actions">
            <Button href="/dashboard/recommend">
              Decide what to play
              <ArrowRight size={15} aria-hidden="true" />
            </Button>
            <Button href="/dashboard/collection" variant="secondary">
              View collection
            </Button>
          </div>
        </div>

        <div className="home-hero-stat" aria-label={`${collection.length} games in collection`}>
          <div className="home-hero-stat-icon">
            <Library size={20} aria-hidden="true" />
          </div>
          <span>Your decision library</span>
          <strong>{collection.length}</strong>
          <p>{collection.length === 1 ? "game ready" : "games ready"} to recommend</p>
        </div>
      </section>

      <section className="pn-section">
        <div className="pn-section-header">
          <div>
            <span className="pn-eyebrow">Your library</span>
            <h2>Recently added</h2>
          </div>

          {recentGames.length > 0 && (
            <Button href="/dashboard/collection" variant="ghost">
              View all
              <ArrowRight size={14} aria-hidden="true" />
            </Button>
          )}
        </div>

        {recentGames.length === 0 ? (
          <Card className="pn-empty-state">
            <span className="pn-empty-icon" aria-hidden="true">
              <Gamepad2 size={22} />
            </span>
            <h3>Build your decision library</h3>
            <p>
              Add a few games you own or want to play. PlayNext will recommend
              only from this collection.
            </p>
            <Button href="/dashboard/search">
              <Plus size={15} aria-hidden="true" />
              Add your first games
            </Button>
          </Card>
        ) : (
          <div className="game-card-grid">
            {recentGames.map((item) => {
              const game = Array.isArray(item.games) ? item.games[0] : item.games;

              if (!game) return null;

              return (
                <article key={item.id} className="game-card">
                  <div className="game-card-artwork">
                    {game.background_image ? (
                      <Image
                        src={game.background_image}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 25vw"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="game-artwork-placeholder">
                        <Gamepad2 size={24} aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  <div className="game-card-body">
                    <h3>{game.title}</h3>
                    <div className="game-card-badges">
                      {game.genres?.slice(0, 2).map((genre) => (
                        <Badge key={genre}>{genre}</Badge>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
