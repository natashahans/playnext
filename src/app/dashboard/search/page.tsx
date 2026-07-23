"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Gamepad2,
  Search,
  X,
} from "lucide-react";
import DiscoveryGameCard from "@/components/games/DiscoveryGameCard";
import GameRail from "@/components/games/GameRail";
import type { DiscoveryPayload, RawgGame } from "@/lib/rawg";
import { supabase } from "@/lib/supabase";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

type ExistingGameRow = {
  id: string;
  games: { rawg_id: number | null } | { rawg_id: number | null }[] | null;
};

type SearchPayload = { results: RawgGame[] };

function normalizeSearchQuery(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function releaseYear(value: string | null | undefined) {
  if (!value) return null;
  const year = new Date(`${value}T00:00:00`).getFullYear();
  return Number.isFinite(year) ? String(year) : null;
}

export default function SearchPage() {
  const router = useRouter();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const liveDebounceRef = useRef<number | undefined>(undefined);
  const liveAbortRef = useRef<AbortController | null>(null);
  const submittedAbortRef = useRef<AbortController | null>(null);
  const liveRequestIdRef = useRef(0);
  const submittedRequestIdRef = useRef(0);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [discovery, setDiscovery] = useState<DiscoveryPayload | null>(null);
  const [searchResults, setSearchResults] = useState<RawgGame[]>([]);
  const [liveResults, setLiveResults] = useState<RawgGame[]>([]);
  const [liveSearching, setLiveSearching] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [collectionEntries, setCollectionEntries] = useState<Map<number, string>>(new Map());
  const [loadingDiscovery, setLoadingDiscovery] = useState(true);
  const [searching, setSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const normalizedQuery = useMemo(() => normalizeSearchQuery(query), [query]);

  function closeLivePanel() {
    setLiveOpen(false);
    setActiveSuggestionIndex(-1);
  }

  async function fetchSearchResults(value: string, options: { signal?: AbortSignal; limit?: number } = {}) {
    const params = new URLSearchParams({ search: value });
    if (options.limit) params.set("limit", String(options.limit));

    const response = await authenticatedFetch(`/api/games/discover?${params.toString()}`, {
      signal: options.signal,
    });
    if (!response.ok) throw new Error("Search failed");
    const data = (await response.json()) as SearchPayload;
    return data.results;
  }

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
          .select("id, games ( rawg_id )")
          .eq("user_id", user.id);

        if (!active) return;

        const rows = (data ?? []) as unknown as ExistingGameRow[];
        const entries = new Map<number, string>();
        rows.forEach((row) => {
          const rawgId = (Array.isArray(row.games) ? row.games[0] : row.games)?.rawg_id;
          if (typeof rawgId === "number") entries.set(rawgId, row.id);
        });
        setCollectionEntries(entries);
      }

      if (active) setLoadingDiscovery(false);
    }

    loadPage().catch(() => {
      if (!active) return;
      setErrorMessage("The game catalogue is taking a break. Please try again shortly.");
      setLoadingDiscovery(false);
    });

    const initialQuery = new URLSearchParams(window.location.search).get("q")?.trim();
    if (initialQuery) {
      setQuery(initialQuery);
      void runSearch(initialQuery, false, active);
    }

    return () => {
      active = false;
      liveAbortRef.current?.abort();
      submittedAbortRef.current?.abort();
      if (liveDebounceRef.current) window.clearTimeout(liveDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      liveAbortRef.current?.abort();
      if (liveDebounceRef.current) window.clearTimeout(liveDebounceRef.current);
      setLiveSearching(false);
      setLiveResults([]);
      setActiveSuggestionIndex(-1);
      setLiveOpen(false);
      return;
    }

    if (liveDebounceRef.current) window.clearTimeout(liveDebounceRef.current);
    setLiveOpen(true);
    setLiveSearching(true);

    liveDebounceRef.current = window.setTimeout(async () => {
      liveAbortRef.current?.abort();
      const controller = new AbortController();
      liveAbortRef.current = controller;
      const requestId = liveRequestIdRef.current + 1;
      liveRequestIdRef.current = requestId;

      try {
        const results = await fetchSearchResults(normalizedQuery, {
          signal: controller.signal,
          limit: 8,
        });
        if (requestId !== liveRequestIdRef.current) return;
        setLiveResults(results);
        setActiveSuggestionIndex(-1);
      } catch (error) {
        if (controller.signal.aborted) return;
        setLiveResults([]);
      } finally {
        if (requestId === liveRequestIdRef.current) setLiveSearching(false);
      }
    }, 350);

    return () => {
      if (liveDebounceRef.current) window.clearTimeout(liveDebounceRef.current);
    };
  }, [normalizedQuery]);

  useEffect(() => {
    if (!liveOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (searchContainerRef.current?.contains(target)) return;
      closeLivePanel();
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      closeLivePanel();
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [liveOpen]);

  function handleCollectionChange(gameId: number, userGameId: string | null) {
    setCollectionEntries((current) => {
      const next = new Map(current);
      if (userGameId) next.set(gameId, userGameId);
      else next.delete(gameId);
      return next;
    });
  }

  async function runSearch(inputValue: string, updateUrl = true, isActive = true) {
    const cleanedQuery = normalizeSearchQuery(inputValue);
    if (cleanedQuery.length < 2) return;

    setSearching(true);
    setErrorMessage("");
    closeLivePanel();
    setLiveResults([]);
    liveAbortRef.current?.abort();
    setSubmittedQuery(cleanedQuery);
    if (updateUrl) router.replace(`/dashboard/search?q=${encodeURIComponent(cleanedQuery)}`, { scroll: false });

    submittedAbortRef.current?.abort();
    const controller = new AbortController();
    submittedAbortRef.current = controller;
    const requestId = submittedRequestIdRef.current + 1;
    submittedRequestIdRef.current = requestId;

    try {
      const results = await fetchSearchResults(cleanedQuery, {
        signal: controller.signal,
      });
      if (requestId !== submittedRequestIdRef.current || !isActive) return;
      setSearchResults(results);
    } catch {
      if (controller.signal.aborted || !isActive) return;
      setSearchResults([]);
      setErrorMessage("We could not complete that search. Please try again.");
    } finally {
      if (requestId === submittedRequestIdRef.current && isActive) setSearching(false);
    }
  }

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (normalizedQuery.length < 2 || searching) return;
    await runSearch(normalizedQuery);
  }

  function clearSearch() {
    liveAbortRef.current?.abort();
    submittedAbortRef.current?.abort();
    setQuery("");
    setSubmittedQuery("");
    setSearchResults([]);
    setLiveResults([]);
    setLiveSearching(false);
    setActiveSuggestionIndex(-1);
    setLiveOpen(false);
    setErrorMessage("");
    router.replace("/dashboard/search", { scroll: false });
  }

  function openSuggestion(game: RawgGame) {
    closeLivePanel();
    if (game.slug) router.push(`/dashboard/search/${game.slug}`);
  }

  function handleQueryKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      closeLivePanel();
      return;
    }

    if (!liveOpen || liveResults.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current + 1) % liveResults.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current <= 0 ? liveResults.length - 1 : current - 1));
      return;
    }

    if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      openSuggestion(liveResults[activeSuggestionIndex]);
    }
  }

  const catalogueSections = discovery?.sections ?? [];
  const canSubmitSearch = normalizedQuery.length >= 2 && !searching;
  const showLivePanel = liveOpen && normalizedQuery.length >= 2;

  return (
    <div className="discover-page">
      <header className="discover-header">
        <div>
          <h1>Discover games</h1>
        </div>

        <div className="discover-search-wrap" ref={searchContainerRef}>
          <form className="discover-search" onSubmit={handleSearch}>
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleQueryKeyDown}
              placeholder="Search games, series or studios"
              aria-label="Search the game catalogue"
              autoComplete="off"
              aria-expanded={showLivePanel}
              aria-controls="discover-live-results"
              aria-activedescendant={activeSuggestionIndex >= 0 ? `discover-live-option-${activeSuggestionIndex}` : undefined}
            />
            {query && (
              <button type="button" onClick={clearSearch} aria-label="Clear search">
                <X size={16} aria-hidden="true" />
              </button>
            )}
            <button type="submit" disabled={!canSubmitSearch}>
              {searching ? "Searching…" : "Search"}
            </button>
          </form>

          {showLivePanel && (
            <section id="discover-live-results" className="discover-live-panel" role="listbox" aria-label="Live search suggestions">
              {liveSearching ? (
                <div className="discover-live-state">Searching games…</div>
              ) : liveResults.length === 0 ? (
                <div className="discover-live-state">No games found</div>
              ) : (
                <ul>
                  {liveResults.map((game, index) => {
                    const genres = game.genres.map((genre) => genre.name).filter(Boolean).slice(0, 2);
                    return (
                      <li key={game.id}>
                        <button
                          id={`discover-live-option-${index}`}
                          type="button"
                          role="option"
                          aria-selected={index === activeSuggestionIndex}
                          className={index === activeSuggestionIndex ? "is-active" : ""}
                          onMouseEnter={() => setActiveSuggestionIndex(index)}
                          onClick={() => openSuggestion(game)}
                        >
                          <span className="discover-live-art">
                            {game.background_image ? (
                              <Image
                                src={game.background_image}
                                alt=""
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            ) : (
                              <Gamepad2 size={16} aria-hidden="true" />
                            )}
                          </span>
                          <span className="discover-live-copy">
                            <strong>{game.name}</strong>
                            <small>
                              {releaseYear(game.released) ?? "Unknown year"}
                              {genres.length > 0 ? ` • ${genres.join(" • ")}` : ""}
                            </small>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </div>
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
                  existingUserGameId={collectionEntries.get(game.id)}
                  onCollectionChange={handleCollectionChange}
                />
              ))}
            </div>
          )}
        </section>
      ) : loadingDiscovery ? (
        <DiscoverySkeleton />
      ) : (
        <>
          <div className="discover-shelves">
            {catalogueSections.map((section) => (
              <GameRail
                key={section.id}
                section={section}
                collectionEntries={collectionEntries}
                onCollectionChange={handleCollectionChange}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DiscoverySkeleton() {
  return (
    <div className="discover-loading" aria-label="Loading games" role="status">
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
