"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  ExternalLink,
  Gamepad2,
  Monitor,
  Play,
  Star,
} from "lucide-react";
import AddRawgGameButton from "@/components/games/AddRawgGameButton";
import GameRail from "@/components/games/GameRail";
import type { GameDetailPayload } from "@/lib/rawg";
import { supabase } from "@/lib/supabase";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

type ExistingGameRow = {
  games: { rawg_id: number | null } | { rawg_id: number | null }[] | null;
};

function formatReleaseDate(value: string | null) {
  if (!value) return "Release date unavailable";

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default function GameDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [details, setDetails] = useState<GameDetailPayload | null>(null);
  const [existingRawgIds, setExistingRawgIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDetails() {
      const [detailsResponse, userResult] = await Promise.all([
        authenticatedFetch(`/api/games/${encodeURIComponent(slug)}`),
        supabase.auth.getUser(),
      ]);

      if (!detailsResponse.ok) throw new Error("Game unavailable");

      const payload = (await detailsResponse.json()) as GameDetailPayload;
      if (!active) return;
      setDetails(payload);

      const user = userResult.data.user;
      if (user) {
        const { data } = await supabase
          .from("user_games")
          .select("games ( rawg_id )")
          .eq("user_id", user.id);

        if (!active) return;

        const rows = (data ?? []) as unknown as ExistingGameRow[];
        const ids = rows
          .map((row) =>
            (Array.isArray(row.games) ? row.games[0] : row.games)?.rawg_id
          )
          .filter((id): id is number => typeof id === "number");

        setExistingRawgIds(new Set(ids));
      }

      if (active) setLoading(false);
    }

    loadDetails().catch(() => {
      if (!active) return;
      setErrorMessage("We could not load this game right now.");
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [slug]);

  function handleAdded(gameId: number) {
    setExistingRawgIds((current) => new Set([...current, gameId]));
  }

  if (loading) {
    return <GameDetailsSkeleton />;
  }

  if (errorMessage || !details) {
    return (
      <div className="game-detail-error">
        <Gamepad2 size={28} aria-hidden="true" />
        <h1>This game could not be loaded</h1>
        <p>{errorMessage || "Please return to the catalogue and try another game."}</p>
        <Link href="/dashboard/search"><ArrowLeft size={16} /> Back to Add games</Link>
      </div>
    );
  }

  const { game, screenshots, similar } = details;
  const trailerUrl =
    game.clip?.clips?.full ??
    game.clip?.video ??
    game.clip?.clip ??
    null;
  const heroImage = game.background_image ?? screenshots[0]?.image ?? null;

  return (
    <article className="game-detail-page">
      <section className="game-detail-hero">
        {heroImage && (
          <Image
            src={heroImage}
            alt=""
            fill
            sizes="(max-width: 900px) 100vw, 80vw"
            className="object-cover"
            priority
            unoptimized
          />
        )}
        <div className="game-detail-hero-scrim" />

        <Link href="/dashboard/search" className="game-detail-back">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Add games
        </Link>

        <div className="game-detail-hero-content">
          <div className="game-detail-genres">
            {game.genres.slice(0, 3).map((genre) => (
              <span key={genre.id}>{genre.name}</span>
            ))}
          </div>

          <h1>{game.name}</h1>

          <div className="game-detail-summary">
            {game.rating !== null && game.rating > 0 && (
              <span><Star size={14} fill="currentColor" /> {game.rating.toFixed(1)} player rating</span>
            )}
            {game.metacritic && <span>{game.metacritic} Metacritic</span>}
            <span><CalendarDays size={14} /> {formatReleaseDate(game.released)}</span>
          </div>

          <div className="game-detail-actions">
            <AddRawgGameButton
              game={game}
              alreadyAdded={existingRawgIds.has(game.id)}
              onAdded={() => handleAdded(game.id)}
            />
            {game.website && (
              <a href={game.website} target="_blank" rel="noreferrer">
                Official website <ExternalLink size={15} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="game-detail-body">
        <main className="game-detail-main">
          <section className="game-detail-about">
            <span className="game-detail-eyebrow">About the game</span>
            <h2>Enter the world of {game.name}</h2>
            <p>{game.description_raw || "A full description is not available for this game yet."}</p>
          </section>

          {trailerUrl && (
            <section className="game-detail-media-section">
              <div className="game-detail-section-heading">
                <div>
                  <span className="game-detail-eyebrow">Watch</span>
                  <h2>Game trailer</h2>
                </div>
                <Play size={19} aria-hidden="true" />
              </div>
              <video controls preload="metadata" poster={game.clip?.preview ?? heroImage ?? undefined}>
                <source src={trailerUrl} />
                Your browser does not support video playback.
              </video>
            </section>
          )}

          {screenshots.length > 0 && (
            <section className="game-detail-media-section">
              <div className="game-detail-section-heading">
                <div>
                  <span className="game-detail-eyebrow">Inside the game</span>
                  <h2>Screenshots</h2>
                </div>
                <span>{screenshots.length} images</span>
              </div>
              <div className="game-detail-gallery">
                {screenshots.slice(0, 6).map((screenshot, index) => (
                  <div key={screenshot.id} className={index === 0 ? "game-detail-shot game-detail-shot-wide" : "game-detail-shot"}>
                    <Image
                      src={screenshot.image}
                      alt={`${game.name} screenshot ${index + 1}`}
                      fill
                      sizes="(max-width: 700px) 100vw, 50vw"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>

        <aside className="game-detail-sidebar">
          <div className="game-detail-fact-grid">
            <div>
              <Clock3 size={18} aria-hidden="true" />
              <span>Average playtime</span>
              <strong>{game.playtime ? `${game.playtime} hours` : "Not available"}</strong>
            </div>
            <div>
              <Monitor size={18} aria-hidden="true" />
              <span>Platforms</span>
              <strong>{game.platforms?.length ?? 0}</strong>
            </div>
          </div>

          <div className="game-detail-facts">
            <DetailFact label="Developers" values={game.developers.map((item) => item.name)} />
            <DetailFact label="Publishers" values={game.publishers.map((item) => item.name)} />
            <DetailFact label="Platforms" values={game.platforms?.map((item) => item.platform.name) ?? []} />
            <DetailFact label="Age rating" values={game.esrb_rating ? [game.esrb_rating.name] : []} />
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <div className="game-detail-similar">
          <GameRail
            section={{
              id: "similar-games",
              title: "You may also like",
              subtitle: `More games related to ${game.name}`,
              games: similar,
            }}
            existingRawgIds={existingRawgIds}
            onAdded={handleAdded}
          />
        </div>
      )}
    </article>
  );
}

function DetailFact({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <span>{label}</span>
      <p>{values.length > 0 ? values.join(", ") : "Not available"}</p>
    </div>
  );
}

function GameDetailsSkeleton() {
  return (
    <div className="game-detail-loading" role="status" aria-label="Loading game details">
      <div />
      <section>
        <i />
        <i />
        <i />
      </section>
    </div>
  );
}
