"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Compass, Gamepad2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

type Game = {
  id: string;
  title: string;
  slug: string | null;
  background_image: string | null;
  rating: number | null;
  genres: string[] | null;
};

type UserGameRow = { id: string; added_at: string; games: Game | Game[] | null };
type LatestRecommendation = {
  id: string;
  created_at: string;
  score: number;
  games: Pick<Game, "id" | "title" | "slug" | "background_image"> | Pick<Game, "id" | "title" | "slug" | "background_image">[] | null;
};

function one<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] : value;
}

export default function DashboardPage() {
  const [collection, setCollection] = useState<UserGameRow[]>([]);
  const [latest, setLatest] = useState<LatestRecommendation | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!active || !userData.user) return;

      const metadata = userData.user.user_metadata ?? {};
      const name = metadata.full_name ?? metadata.name ?? "";
      setDisplayName(typeof name === "string" ? name.split(" ")[0] : "");

      const [collectionResult, recommendationResult] = await Promise.all([
        supabase
          .from("user_games")
          .select("id, added_at, games ( id, title, slug, background_image, rating, genres )")
          .eq("user_id", userData.user.id)
          .order("added_at", { ascending: false }),
        supabase
          .from("recommendations")
          .select("id, created_at, score, games ( id, title, slug, background_image )")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      if (!active) return;
      if (collectionResult.error) {
        setErrorMessage("Your home screen could not be loaded. Please try again.");
      } else {
        setCollection((collectionResult.data ?? []) as unknown as UserGameRow[]);
        if (!recommendationResult.error) {
          setLatest(((recommendationResult.data ?? [])[0] ?? null) as unknown as LatestRecommendation | null);
        }
      }
      setLoading(false);
    }

    load();
    return () => { active = false; };
  }, []);

  const games = useMemo(
    () => collection.map((row) => one(row.games)).filter((game): game is Game => Boolean(game)),
    [collection]
  );
  const recentGames = games.slice(0, 5);
  const latestGame = latest ? one(latest.games) : null;

  if (loading) return <HomeLoading />;

  if (errorMessage) {
    return (
      <Card className="pn-state-card">
        <h2>Home is unavailable</h2><p>{errorMessage}</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </Card>
    );
  }

  return (
    <div className="pn-home pn-home-final">
      <header className="pn-home-final-heading">
        <p>Welcome back{displayName ? `, ${displayName}` : ""}</p>
      </header>

      <div className="pn-home-final-top">
        <section className="pn-home-hero pn-home-final-hero">
            <Image
              src="/playnext-home-hero.png"
              alt="A luminous futuristic horizon representing the next game to discover"
              fill
              priority
              sizes="(max-width: 760px) 100vw, 70vw"
              className="object-cover"
            />
            <div className="pn-home-hero-overlay" />
            <div className="pn-home-hero-copy">
              <h1>Find the right game for right now.</h1>
              <p>Share your mood and the time you have. PlayNext will choose one focused match from your library or help you discover something new.</p>
              <div className="pn-home-hero-actions">
                <Button href="/dashboard/recommend">Choose my next game <ArrowRight aria-hidden="true" /></Button>
                <Link href="/dashboard/search">Browse games</Link>
              </div>
            </div>
        </section>

        <aside className="pn-home-final-decision">
            <span className="pn-home-final-label"><Compass aria-hidden="true" /> Latest decision</span>
            {latest && latestGame ? (
              <>
                {latestGame.background_image && <div className="pn-home-final-decision-art"><Image src={latestGame.background_image} alt="" fill sizes="320px" className="object-cover" /></div>}
                <div className="pn-home-final-decision-copy">
                  <small>{Math.round(latest.score)}% match</small>
                  <h2>{latestGame.title}</h2>
                  <Link href="/dashboard/history">Open recommendation <ArrowRight aria-hidden="true" /></Link>
                </div>
              </>
            ) : (
              <div className="pn-home-final-empty"><Gamepad2 aria-hidden="true" /><h2>No decision yet</h2><p>Your latest recommendation will appear here.</p><Link href="/dashboard/recommend">Start deciding <ArrowRight aria-hidden="true" /></Link></div>
            )}
        </aside>
      </div>

      <section className="pn-home-section pn-home-final-library">
        <div className="pn-section-heading">
          <div><h2>Your library</h2><p>{games.length > 0 ? `${games.length} ${games.length === 1 ? "saved game" : "saved games"} in your library.` : "Build a collection to unlock personal recommendations."}</p></div>
          <Link href="/dashboard/collection">View library <ArrowRight aria-hidden="true" /></Link>
        </div>

        {recentGames.length === 0 ? (
          <div className="pn-empty-inline"><Gamepad2 aria-hidden="true" /><div><h3>Build your library</h3><p>Add a few games and PlayNext can start making personal recommendations.</p></div><Button href="/dashboard/search">Discover games</Button></div>
        ) : (
          <div className="pn-home-game-grid">
            {recentGames.map((game) => {
              const content = <><div className="pn-home-game-art">{game.background_image ? <Image src={game.background_image} alt="" fill sizes="(max-width: 600px) 50vw, 18vw" className="object-cover" /> : <Gamepad2 aria-hidden="true" />}</div><div className="pn-home-game-copy"><h3>{game.title}</h3><p>{game.genres?.slice(0, 2).join(" · ") || "Game"}</p></div></>;
              return game.slug ? <Link key={game.id} href={`/dashboard/search/${game.slug}`} className="pn-home-game">{content}</Link> : <article key={game.id} className="pn-home-game">{content}</article>;
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function HomeLoading() {
  return <div className="pn-home-loading" role="status" aria-label="Loading home"><i /><i /><i /></div>;
}
