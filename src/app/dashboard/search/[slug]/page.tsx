"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Gamepad2,
  Maximize2,
  Monitor,
  Star,
  X,
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
  const router = useRouter();
  const [details, setDetails] = useState<GameDetailPayload | null>(null);
  const [existingRawgIds, setExistingRawgIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [selectedScreenshotId, setSelectedScreenshotId] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

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

  useEffect(() => {
    if (!lightboxOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setLightboxOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxOpen]);

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
        <button type="button" onClick={() => router.back()}><ArrowLeft size={16} /> Back to games</button>
      </div>
    );
  }

  const { game, screenshots, similar } = details;
  const heroImage = game.background_image ?? screenshots[0]?.image ?? null;
  const description = game.description_raw || "A full description is not available for this game yet.";
  const descriptionIsLong = description.length > 760;
  const selectedScreenshotIndex = Math.max(
    0,
    screenshots.findIndex((screenshot) => screenshot.id === selectedScreenshotId)
  );
  const selectedScreenshot = screenshots[selectedScreenshotIndex] ?? screenshots[0] ?? null;

  function selectScreenshot(index: number) {
    const normalizedIndex = (index + screenshots.length) % screenshots.length;
    setSelectedScreenshotId(screenshots[normalizedIndex].id);
  }

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
          />
        )}
        <div className="game-detail-hero-scrim" />

        <button type="button" onClick={() => router.back()} className="game-detail-back">
          <ArrowLeft size={16} aria-hidden="true" />
          Back
        </button>

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
            <h2>About {game.name}</h2>
            <p className={!descriptionExpanded && descriptionIsLong ? "is-collapsed" : undefined}>
              {description}
            </p>
            {descriptionIsLong && (
              <button
                type="button"
                className="game-detail-description-toggle"
                onClick={() => setDescriptionExpanded((current) => !current)}
                aria-expanded={descriptionExpanded}
              >
                {descriptionExpanded ? "Show less" : "Read full description"}
              </button>
            )}
          </section>

          {screenshots.length > 0 && selectedScreenshot && (
            <section className="game-detail-media-section game-detail-gallery-section">
              <div className="game-detail-section-heading">
                <h2>Screenshots</h2>
                <span>{screenshots.length} images</span>
              </div>

              <button
                type="button"
                className="game-detail-gallery-feature"
                onClick={() => setLightboxOpen(true)}
                aria-label={`Open screenshot ${selectedScreenshotIndex + 1} of ${game.name}`}
              >
                <Image
                  src={selectedScreenshot.image}
                  alt={`${game.name} screenshot ${selectedScreenshotIndex + 1}`}
                  fill
                  sizes="(max-width: 900px) 100vw, 68vw"
                  className="object-cover"
                />
                <span><Maximize2 size={16} aria-hidden="true" /> View full screen</span>
              </button>

              <div className="game-detail-gallery-thumbnails" aria-label="Choose a screenshot">
                {screenshots.slice(0, 6).map((screenshot, index) => (
                  <button
                    type="button"
                    key={screenshot.id}
                    className={screenshot.id === selectedScreenshot.id ? "is-active" : undefined}
                    onClick={() => setSelectedScreenshotId(screenshot.id)}
                    aria-label={`Show screenshot ${index + 1}`}
                    aria-pressed={screenshot.id === selectedScreenshot.id}
                  >
                    <Image
                      src={screenshot.image}
                      alt=""
                      fill
                      sizes="160px"
                      className="object-cover"
                    />
                  </button>
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
              subtitle: "",
              games: similar,
            }}
            existingRawgIds={existingRawgIds}
            onAdded={handleAdded}
          />
        </div>
      )}

      {lightboxOpen && selectedScreenshot && (
        <div
          className="game-detail-modal game-detail-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${game.name} screenshot viewer`}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setLightboxOpen(false);
          }}
        >
          <button type="button" className="game-detail-modal-close" onClick={() => setLightboxOpen(false)} aria-label="Close screenshot viewer">
            <X size={21} aria-hidden="true" />
          </button>
          {screenshots.length > 1 && (
            <button type="button" className="game-detail-lightbox-previous" onClick={() => selectScreenshot(selectedScreenshotIndex - 1)} aria-label="Previous screenshot">
              <ChevronLeft size={24} aria-hidden="true" />
            </button>
          )}
          <div className="game-detail-lightbox-image">
            <Image
              src={selectedScreenshot.image}
              alt={`${game.name} screenshot ${selectedScreenshotIndex + 1}`}
              fill
              sizes="96vw"
              className="object-contain"
              priority
            />
          </div>
          {screenshots.length > 1 && (
            <button type="button" className="game-detail-lightbox-next" onClick={() => selectScreenshot(selectedScreenshotIndex + 1)} aria-label="Next screenshot">
              <ChevronRight size={24} aria-hidden="true" />
            </button>
          )}
          <span className="game-detail-lightbox-count">{selectedScreenshotIndex + 1} / {screenshots.length}</span>
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
