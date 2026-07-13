"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Clock3,
  Compass,
  Gamepad2,
  Library,
  MoonStar,
  Plus,
  Sparkles,
  Star,
  Swords,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

type Game = {
  id: string;
  rawg_id: number | null;
  title: string;
  slug: string | null;
  background_image: string | null;
  rating: number | null;
  genres: string[] | null;
  platforms: string[] | null;
  playtime: number | null;
};

type UserGameRow = {
  id: string;
  status: string;
  added_at: string;
  games: Game | Game[] | null;
};

type LatestRecommendation = {
  id: string;
  created_at: string;
  score: number;
  explanation: string;
  games:
    | Pick<Game, "id" | "title" | "slug" | "background_image">
    | Pick<Game, "id" | "title" | "slug" | "background_image">[]
    | null;
  recommendation_sessions:
    | { user_input: string }
    | { user_input: string }[]
    | null;
};

type GenreCount = {
  name: string;
  count: number;
  percentage: number;
};

const sessionStarters = [
  {
    icon: Clock3,
    title: "A quick session",
    description: "Find something satisfying for the time you actually have.",
    hint: "15–45 minutes",
  },
  {
    icon: MoonStar,
    title: "Low-energy evening",
    description: "Let PlayNext find something calm, familiar or story-led.",
    hint: "Relaxed mood",
  },
  {
    icon: Swords,
    title: "I want a challenge",
    description: "Choose something demanding enough to hold your attention.",
    hint: "High energy",
  },
];

function one<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

export default function DashboardPage() {
  const [collection, setCollection] = useState<UserGameRow[]>([]);
  const [latestRecommendation, setLatestRecommendation] =
    useState<LatestRecommendation | null>(null);
  const [recommendationCount, setRecommendationCount] = useState(0);
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

      const [collectionResult, recommendationResult] = await Promise.all([
        supabase
          .from("user_games")
          .select(`
            id,
            status,
            added_at,
            games (
              id,
              rawg_id,
              title,
              slug,
              background_image,
              rating,
              genres,
              platforms,
              playtime
            )
          `)
          .eq("user_id", userData.user.id)
          .order("added_at", { ascending: false }),
        supabase
          .from("recommendations")
          .select(
            `
              id,
              created_at,
              score,
              explanation,
              games ( id, title, slug, background_image ),
              recommendation_sessions ( user_input )
            `,
            { count: "exact" }
          )
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      if (!active) return;

      if (collectionResult.error) {
        setErrorMessage("We couldn’t load your dashboard. Please refresh and try again.");
        setLoading(false);
        return;
      }

      setCollection(
        (collectionResult.data ?? []) as unknown as UserGameRow[]
      );

      if (!recommendationResult.error) {
        const recommendations = (recommendationResult.data ?? []) as unknown as LatestRecommendation[];
        setLatestRecommendation(recommendations[0] ?? null);
        setRecommendationCount(recommendationResult.count ?? 0);
      }

      setLoading(false);
    }

    fetchDashboardData();

    return () => {
      active = false;
    };
  }, []);

  const games = useMemo(
    () =>
      collection
        .map((item) => one(item.games))
        .filter((game): game is Game => Boolean(game)),
    [collection]
  );

  const recentGames = games.slice(0, 5);

  const averageRating = useMemo(() => {
    const ratings = games
      .map((game) => game.rating)
      .filter((rating): rating is number => typeof rating === "number" && rating > 0);

    if (ratings.length === 0) return null;
    return ratings.reduce((total, rating) => total + rating, 0) / ratings.length;
  }, [games]);

  const genreProfile = useMemo<GenreCount[]>(() => {
    const counts = new Map<string, number>();

    games.forEach((game) => {
      game.genres?.forEach((genre) => {
        counts.set(genre, (counts.get(genre) ?? 0) + 1);
      });
    });

    const highestCount = Math.max(...counts.values(), 1);

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / highestCount) * 100),
      }));
  }, [games]);

  const platformCount = useMemo(() => {
    const platforms = new Set<string>();
    games.forEach((game) => game.platforms?.forEach((platform) => platforms.add(platform)));
    return platforms.size;
  }, [games]);

  const uniqueGenreCount = useMemo(() => {
    const genres = new Set<string>();
    games.forEach((game) => game.genres?.forEach((genre) => genres.add(genre)));
    return genres.size;
  }, [games]);

  const heroGame = useMemo(
    () =>
      games
        .filter((game) => Boolean(game.background_image))
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0] ?? null,
    [games]
  );
  const latestGame = latestRecommendation ? one(latestRecommendation.games) : null;
  const latestContext = latestRecommendation
    ? one(latestRecommendation.recommendation_sessions)
    : null;

  if (loading) {
    return <HomeLoading />;
  }

  if (errorMessage) {
    return (
      <Card className="pn-state-card">
        <h2>Dashboard unavailable</h2>
        <p>{errorMessage}</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </Card>
    );
  }

  return (
    <div className="home-command-page">
      <header className="home-command-header">
        <div>
          <span className="home-command-kicker">Your PlayNext overview</span>
          <h1>{displayName ? `Good to see you, ${displayName}.` : "Welcome back."}</h1>
          <p>Your collection, recent decisions and fastest route to the right game.</p>
        </div>
        <Button href="/dashboard/search" variant="secondary">
          <Plus size={15} aria-hidden="true" />
          Add games
        </Button>
      </header>

      <section className="home-command-hero">
        {heroGame?.background_image && (
          <Image
            src={heroGame.background_image}
            alt=""
            fill
            sizes="(max-width: 900px) 100vw, 80vw"
            className="object-cover"
            priority
            unoptimized
          />
        )}
        <div className="home-command-hero-scrim" />

        <div className="home-command-hero-copy">
          <span><Sparkles size={13} aria-hidden="true" /> Context-aware decision</span>
          <h2>Make the next game count.</h2>
          <p>
            Tell PlayNext how you feel, how much time you have, and what kind of
            experience you want. Get one focused answer from your own library.
          </p>
          <div>
            <Button href="/dashboard/recommend">
              Decide what to play <ArrowRight size={15} aria-hidden="true" />
            </Button>
            <Button href="/dashboard/collection" variant="secondary">
              Open my library
            </Button>
          </div>
        </div>

        <div className="home-command-readiness">
          <div className="home-command-readiness-ring">
            <strong>{games.length}</strong>
            <span>games</span>
          </div>
          <div>
            <span>Decision library</span>
            <strong>{games.length >= 5 ? "Ready for variety" : games.length > 0 ? "Ready to decide" : "Start your library"}</strong>
            <p>{games.length >= 5 ? "A healthy range of choices is available." : "Add more games to improve recommendation variety."}</p>
          </div>
        </div>
      </section>

      <section className="home-command-metrics" aria-label="Library summary">
        <MetricCard icon={Library} label="In your library" value={String(games.length)} detail="games available" />
        <MetricCard icon={Compass} label="Genres covered" value={String(uniqueGenreCount)} detail={genreProfile[0]?.name ? `${genreProfile[0].name} leads` : "Build your profile"} />
        <MetricCard icon={Star} label="Average rating" value={averageRating ? `${averageRating.toFixed(1)}/5` : "—"} detail={platformCount > 0 ? `across ${platformCount} platforms` : "No ratings yet"} />
        <MetricCard icon={BarChart3} label="Decisions made" value={String(recommendationCount)} detail="recommendations saved" />
      </section>

      <section className="home-command-section">
        <div className="home-command-section-heading">
          <div>
            <span>Start with your situation</span>
            <h2>What kind of session is this?</h2>
          </div>
          <Link href="/dashboard/recommend">Describe something else <ArrowRight size={14} /></Link>
        </div>

        <div className="home-session-grid">
          {sessionStarters.map((starter) => {
            const Icon = starter.icon;
            return (
              <Link key={starter.title} href="/dashboard/recommend" className="home-session-card">
                <div className="home-session-icon"><Icon size={19} aria-hidden="true" /></div>
                <span>{starter.hint}</span>
                <h3>{starter.title}</h3>
                <p>{starter.description}</p>
                <strong>Start deciding <ArrowRight size={14} aria-hidden="true" /></strong>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="home-command-grid">
        <section className="home-command-panel home-recent-panel">
          <div className="home-command-panel-heading">
            <div>
              <span>Your library</span>
              <h2>Recently added</h2>
            </div>
            {recentGames.length > 0 && (
              <Link href="/dashboard/collection">View collection <ArrowRight size={14} /></Link>
            )}
          </div>

          {recentGames.length === 0 ? (
            <div className="home-command-empty">
              <Gamepad2 size={23} aria-hidden="true" />
              <h3>Your library is waiting</h3>
              <p>Add games you own or genuinely want to play.</p>
              <Button href="/dashboard/search"><Plus size={14} /> Add games</Button>
            </div>
          ) : (
            <div className="home-recent-list">
              {recentGames.map((game, index) => {
                const gameContent = (
                  <>
                    <div className="home-recent-artwork">
                      {game.background_image ? (
                        <Image src={game.background_image} alt="" fill sizes="92px" className="object-cover" unoptimized />
                      ) : (
                        <Gamepad2 size={19} aria-hidden="true" />
                      )}
                    </div>
                    <div className="home-recent-copy">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <h3>{game.title}</h3>
                      <p>{game.genres?.slice(0, 2).join(" · ") || "Genre unavailable"}</p>
                    </div>
                    {game.rating !== null && game.rating > 0 && (
                      <strong><Star size={11} fill="currentColor" /> {game.rating.toFixed(1)}</strong>
                    )}
                    <ArrowRight className="home-recent-arrow" size={15} aria-hidden="true" />
                  </>
                );

                return game.slug ? (
                  <Link key={game.id} href={`/dashboard/search/${game.slug}`} className="home-recent-row">
                    {gameContent}
                  </Link>
                ) : (
                  <div key={game.id} className="home-recent-row">{gameContent}</div>
                );
              })}
            </div>
          )}
        </section>

        <div className="home-command-side-stack">
          <section className="home-command-panel home-last-decision">
            <div className="home-command-panel-heading">
              <div>
                <span>Decision history</span>
                <h2>Latest recommendation</h2>
              </div>
              <Link href="/dashboard/history" aria-label="View recommendation history"><ArrowRight size={15} /></Link>
            </div>

            {latestRecommendation && latestGame ? (
              <div className="home-last-decision-card">
                <div className="home-last-decision-artwork">
                  {latestGame.background_image ? (
                    <Image src={latestGame.background_image} alt="" fill sizes="320px" className="object-cover" unoptimized />
                  ) : (
                    <Gamepad2 size={24} aria-hidden="true" />
                  )}
                  <span>{Math.round(latestRecommendation.score)}% fit</span>
                </div>
                <div className="home-last-decision-copy">
                  <span>{formatDate(latestRecommendation.created_at)}</span>
                  <h3>{latestGame.title}</h3>
                  <p>“{latestContext?.user_input ?? "No session context recorded"}”</p>
                  <Link href="/dashboard/history">See why it matched <ArrowRight size={13} /></Link>
                </div>
              </div>
            ) : (
              <div className="home-command-empty home-command-empty-compact">
                <Sparkles size={21} aria-hidden="true" />
                <h3>No decisions yet</h3>
                <p>Your latest PlayNext recommendation will appear here.</p>
                <Button href="/dashboard/recommend">Make a decision</Button>
              </div>
            )}
          </section>

          <section className="home-command-panel home-genre-panel">
            <div className="home-command-panel-heading">
              <div>
                <span>Collection profile</span>
                <h2>Your genre mix</h2>
              </div>
            </div>

            {genreProfile.length > 0 ? (
              <div className="home-genre-bars">
                {genreProfile.map((genre) => (
                  <div key={genre.name}>
                    <div><span>{genre.name}</span><strong>{genre.count}</strong></div>
                    <i><b style={{ width: `${genre.percentage}%` }} /></i>
                  </div>
                ))}
              </div>
            ) : (
              <p className="home-genre-placeholder">Add games to reveal the shape of your library.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Library;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="home-metric-card">
      <div><Icon size={17} aria-hidden="true" /></div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function HomeLoading() {
  return (
    <div className="home-command-loading" role="status" aria-label="Loading your dashboard">
      <div className="home-command-loading-header" />
      <div className="home-command-loading-hero" />
      <div className="home-command-loading-metrics">
        {[0, 1, 2, 3].map((item) => <i key={item} />)}
      </div>
    </div>
  );
}
