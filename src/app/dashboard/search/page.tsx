"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Gamepad2,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import AddRawgGameButton from "@/components/games/AddRawgGameButton";
import DiscoveryGameCard from "@/components/games/DiscoveryGameCard";
import GameRail from "@/components/games/GameRail";
import type { DiscoveryPayload, RawgGame } from "@/lib/rawg";
import { supabase } from "@/lib/supabase";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

type ExistingGameRow = {
  games: { rawg_id: number | null } | { rawg_id: number | null }[] | null;
};

const genreLinks = [
  { label: "Trending", target: "trending" },
  { label: "New releases", target: "new-releases" },
  { label: "Top rated", target: "top-rated" },
  { label: "Action", target: "action" },
  { label: "RPG", target: "role-playing" },
  { label: "Indie", target: "indie" },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [discovery, setDiscovery] = useState<DiscoveryPayload | null>(null);
  const [searchResults, setSearchResults] = useState<RawgGame[]>([]);
  const [existingRawgIds, setExistingRawgIds] = useState<Set<number>>(new Set());
  const [loadingDiscovery, setLoadingDiscovery] = useState(true);
  const [searching, setSearching] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPage() {
      const [catalogueResponse, userResult] = await Promise.all([
        authenticatedFetch("/api/games/discover"),
        supabase.auth.getUser(),
      ]);

      if (!active) return;

      if (!catalogueResponse.ok) {
        setErrorMessage("The game catalogue is taking a break. Please try again shortly.");
      } else {
        setDiscovery((await catalogueResponse.json()) as DiscoveryPayload);
      }

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

      if (active) setLoadingDiscovery(false);
    }

    loadPage().catch(() => {
      if (!active) return;
      setErrorMessage("The game catalogue is taking a break. Please try again shortly.");
      setLoadingDiscovery(false);
    });

    return () => {
      active = false;
    };
  }, []);

  function handleAdded(gameId: number) {
    setExistingRawgIds((current) => new Set([...current, gameId]));
  }

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanedQuery = query.trim();

    if (!cleanedQuery || searching) return;

    setSearching(true);
    setErrorMessage("");
    setSubmittedQuery(cleanedQuery);

    try {
      const response = await authenticatedFetch(
        `/api/games/discover?search=${encodeURIComponent(cleanedQuery)}`
      );

      if (!response.ok) throw new Error("Search failed");

      const data = (await response.json()) as { results: RawgGame[] };
      setSearchResults(data.results);
    } catch {
      setSearchResults([]);
      setErrorMessage("We could not complete that search. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setQuery("");
    setSubmittedQuery("");
    setSearchResults([]);
    setErrorMessage("");
  }

  function scrollToSection(target: string) {
    const hiddenTarget = discovery?.sections
      .slice(3)
      .some((section) => section.id === target);

    if (hiddenTarget && !showAllCategories) {
      setShowAllCategories(true);
      window.setTimeout(() => {
        document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
      return;
    }

    document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const featured = discovery?.featured ?? null;
  const catalogueSections = discovery?.sections ?? [];
  const visibleSections = showAllCategories
    ? catalogueSections
    : catalogueSections.slice(0, 3);
  const hasAdditionalCategories = catalogueSections.length > 3;

  return (
    <div className="discover-page">
      <header className="discover-header">
        <div>
          <span className="discover-eyebrow">
            <Sparkles size={13} aria-hidden="true" />
            Explore the catalogue
          </span>
          <h1>Find something worth playing.</h1>
          <p>Browse standout games, open the details, then add the right ones to your collection.</p>
        </div>

        <form className="discover-search" onSubmit={handleSearch}>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search games, series or studios"
            aria-label="Search the game catalogue"
            autoComplete="off"
          />
          {query && (
            <button type="button" onClick={clearSearch} aria-label="Clear search">
              <X size={16} aria-hidden="true" />
            </button>
          )}
          <button type="submit" disabled={!query.trim() || searching}>
            {searching ? "Searching…" : "Search"}
          </button>
        </form>
      </header>

      {errorMessage && (
        <div className="discover-error" role="alert">
          <Gamepad2 size={18} aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {submittedQuery ? (
        <section className="discover-results">
          <div className="discover-results-header">
            <div>
              <span>Search results</span>
              <h2>{searching ? "Searching the catalogue…" : `Games matching “${submittedQuery}”`}</h2>
            </div>
            <button type="button" onClick={clearSearch}>Back to discover</button>
          </div>

          {!searching && searchResults.length === 0 && !errorMessage ? (
            <div className="discover-empty">
              <Search size={24} aria-hidden="true" />
              <h3>No games found</h3>
              <p>Try a shorter title or check the spelling.</p>
            </div>
          ) : (
            <div className="discover-results-grid">
              {searchResults.map((game) => (
                <DiscoveryGameCard
                  key={game.id}
                  game={game}
                  alreadyAdded={existingRawgIds.has(game.id)}
                  onAdded={handleAdded}
                />
              ))}
            </div>
          )}
        </section>
      ) : loadingDiscovery ? (
        <DiscoverySkeleton />
      ) : (
        <>
          {featured && (
            <section className="discover-hero">
              {featured.background_image && (
                <Image
                  src={featured.background_image}
                  alt=""
                  fill
                  sizes="(max-width: 900px) 100vw, 80vw"
                  className="object-cover"
                  priority
                />
              )}
              <div className="discover-hero-scrim" />

              <div className="discover-hero-content">
                <span className="discover-featured-label">Featured this week</span>
                <h2>{featured.name}</h2>
                <div className="discover-hero-meta">
                  {featured.rating !== null && featured.rating > 0 && (
                    <span><Star size={13} fill="currentColor" /> {featured.rating.toFixed(1)}</span>
                  )}
                  {featured.genres?.slice(0, 2).map((genre) => (
                    <span key={genre.id}>{genre.name}</span>
                  ))}
                </div>
                <p>A standout game players are adding to their lists right now.</p>
                <div className="discover-hero-actions">
                  <Link href={`/dashboard/search/${featured.slug}`}>
                    View details <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <AddRawgGameButton
                    game={featured}
                    alreadyAdded={existingRawgIds.has(featured.id)}
                    onAdded={() => handleAdded(featured.id)}
                  />
                </div>
              </div>
            </section>
          )}

          <nav className="discover-chips" aria-label="Browse categories">
            {genreLinks.map((item) => (
              <button key={item.target} type="button" onClick={() => scrollToSection(item.target)}>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="discover-shelves">
            {visibleSections.map((section) => (
              <GameRail
                key={section.id}
                section={section}
                existingRawgIds={existingRawgIds}
                onAdded={handleAdded}
              />
            ))}
          </div>

          {hasAdditionalCategories && (
            <button
              type="button"
              className="discover-more-categories"
              aria-expanded={showAllCategories}
              onClick={() => {
                setShowAllCategories((current) => !current);
                if (showAllCategories) {
                  document.querySelector(".discover-chips")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
            >
              <span>
                <strong>{showAllCategories ? "Show fewer categories" : "Explore more categories"}</strong>
                <small>{showAllCategories ? "Return to the essential discovery shelves" : "Action, role-playing and independent discoveries"}</small>
              </span>
              {showAllCategories ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function DiscoverySkeleton() {
  return (
    <div className="discover-loading" aria-label="Loading games" role="status">
      <div className="discover-loading-hero" />
      {[0, 1, 2].map((row) => (
        <div key={row} className="discover-loading-row">
          <span />
          <div>
            {[0, 1, 2, 3].map((card) => <i key={card} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
