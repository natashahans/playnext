"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Clock3,
  Gamepad2,
  ListFilter,
  PlayCircle,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import RemoveGameButton from "@/components/games/RemoveGameButton";
import { supabase } from "@/lib/supabase";

type GameDetails = {
  id: string;
  slug: string | null;
  title: string;
  background_image: string | null;
  released: string | null;
  rating: number | null;
  playtime: number | null;
  genres: string[] | null;
  platforms: string[] | null;
};

type CollectionRow = {
  id: string;
  status: string;
  added_at: string;
  games: GameDetails | GameDetails[] | null;
};

type CollectionTotals = {
  total: number;
  backlog: number;
  playing: number;
  completed: number;
};

type SortOption = "recent" | "title" | "rating";
type StatusFilter = "all" | "backlog" | "playing" | "completed";
type CollectionStatus = Exclude<StatusFilter, "all">;
const COLLECTION_PAGE_SIZE = 48;

const statusOptions = [
  { value: "backlog", label: "Want to play" },
  { value: "playing", label: "Playing" },
  { value: "completed", label: "Finished" },
] as const;

function oneGame(row: CollectionRow) {
  return Array.isArray(row.games) ? row.games[0] : row.games;
}

function statusLabel(status: string) {
  return statusOptions.find((option) => option.value === status)?.label ?? "Backlog";
}

function isTrackedStatus(status: string): status is CollectionStatus {
  return status === "backlog" || status === "playing" || status === "completed";
}

export default function CollectionPage() {
  const [collection, setCollection] = useState<CollectionRow[]>([]);
  const [collectionTotals, setCollectionTotals] = useState<CollectionTotals>({
    total: 0,
    backlog: 0,
    playing: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusError, setStatusError] = useState("");
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchCollection() {
      const { data: userData } = await supabase.auth.getUser();
      if (!active) return;

      if (!userData.user) {
        setLoading(false);
        return;
      }

      const rowsQuery = supabase
        .from("user_games")
        .select(`
          id,
          status,
          added_at,
          games (
            id,
            slug,
            title,
            background_image,
            released,
            rating,
            playtime,
            genres,
            platforms
          )
        `)
        .eq("user_id", userData.user.id)
        .order("added_at", { ascending: false })
        .range(0, COLLECTION_PAGE_SIZE - 1);

      const countByStatus = (status?: string) => {
        let query = supabase
          .from("user_games")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userData.user.id);
        if (status) query = query.eq("status", status);
        return query;
      };

      const [rowsResult, totalResult, backlogResult, playingResult, completedResult] = await Promise.all([
        rowsQuery,
        countByStatus(),
        countByStatus("backlog"),
        countByStatus("playing"),
        countByStatus("completed"),
      ]);

      if (!active) return;

      const countError = totalResult.error || backlogResult.error || playingResult.error || completedResult.error;
      if (rowsResult.error || countError) {
        setErrorMessage("We couldn’t load your collection. Please refresh and try again.");
      } else {
        const rows = (rowsResult.data ?? []) as unknown as CollectionRow[];
        setCollection(rows);
        setCollectionTotals({
          total: totalResult.count ?? rows.length,
          backlog: backlogResult.count ?? 0,
          playing: playingResult.count ?? 0,
          completed: completedResult.count ?? 0,
        });
        setHasMore(rows.length === COLLECTION_PAGE_SIZE);
      }
      setLoading(false);
    }

    fetchCollection();
    return () => { active = false; };
  }, []);

  const genres = useMemo(() => {
    const values = new Set<string>();
    collection.forEach((row) => oneGame(row)?.genres?.forEach((genre) => values.add(genre)));
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [collection]);

  const filteredCollection = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return collection
      .filter((row) => {
        const game = oneGame(row);
        if (!game) return false;

        const matchesSearch = !query ||
          game.title.toLowerCase().includes(query) ||
          game.genres?.some((genre) => genre.toLowerCase().includes(query)) ||
          game.platforms?.some((platform) => platform.toLowerCase().includes(query));
        const matchesStatus = statusFilter === "all" || row.status === statusFilter;
        const matchesGenre = genreFilter === "all" || game.genres?.includes(genreFilter);

        return matchesSearch && matchesStatus && matchesGenre;
      })
      .sort((a, b) => {
        const gameA = oneGame(a);
        const gameB = oneGame(b);
        if (sortBy === "title") return (gameA?.title ?? "").localeCompare(gameB?.title ?? "");
        if (sortBy === "rating") return (gameB?.rating ?? 0) - (gameA?.rating ?? 0);
        return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
      });
  }, [collection, searchQuery, statusFilter, genreFilter, sortBy]);

  async function updateStatus(userGameId: string, nextStatus: CollectionStatus) {
    const previousStatus = collection.find((row) => row.id === userGameId)?.status ?? "backlog";
    setStatusError("");
    setUpdatingStatusId(userGameId);
    setCollection((current) => current.map((row) =>
      row.id === userGameId ? { ...row, status: nextStatus } : row
    ));
    if (previousStatus !== nextStatus) {
      setCollectionTotals((current) => {
        const next = { ...current, [nextStatus]: current[nextStatus] + 1 };
        if (isTrackedStatus(previousStatus)) next[previousStatus] = Math.max(0, current[previousStatus] - 1);
        return next;
      });
    }

    const { error } = await supabase
      .from("user_games")
      .update({ status: nextStatus })
      .eq("id", userGameId);

    if (error) {
      setCollection((current) => current.map((row) =>
        row.id === userGameId ? { ...row, status: previousStatus } : row
      ));
      if (previousStatus !== nextStatus) {
        setCollectionTotals((current) => {
          const next = { ...current, [nextStatus]: Math.max(0, current[nextStatus] - 1) };
          if (isTrackedStatus(previousStatus)) next[previousStatus] = current[previousStatus] + 1;
          return next;
        });
      }
      setStatusError("That status could not be updated. Please try again.");
    }
    setUpdatingStatusId(null);
  }

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("all");
    setGenreFilter("all");
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setStatusError("");

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setStatusError("Your session has expired. Please log in again.");
      setLoadingMore(false);
      return;
    }

    const from = collection.length;
    const { data, error } = await supabase
      .from("user_games")
      .select(`
        id,
        status,
        added_at,
        games ( id, slug, title, background_image, released, rating, playtime, genres, platforms )
      `)
      .eq("user_id", userData.user.id)
      .order("added_at", { ascending: false })
      .range(from, from + COLLECTION_PAGE_SIZE - 1);

    if (error) {
      setStatusError("More games could not be loaded. Please try again.");
    } else {
      const rows = (data ?? []) as unknown as CollectionRow[];
      setCollection((current) => [...current, ...rows]);
      setHasMore(rows.length === COLLECTION_PAGE_SIZE);
    }
    setLoadingMore(false);
  }

  if (loading) {
    return <div className="pn-page-loading" role="status"><span className="dashboard-loading-dot" />Loading your collection…</div>;
  }

  if (errorMessage) {
    return (
      <Card className="pn-state-card">
        <h2>Collection unavailable</h2><p>{errorMessage}</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </Card>
    );
  }

  return (
    <div className="pn-library-page">
      <header className="pn-library-header">
        <div>
          <h1>My library</h1>
          <p>{collectionTotals.total} {collectionTotals.total === 1 ? "saved game" : "saved games"} in your library.</p>
        </div>
        <div className="pn-library-header-actions">
          <Button href="/dashboard/recommend" variant="secondary"><PlayCircle size={15} /> Decide what to play</Button>
          <Button href="/dashboard/search"><Plus size={15} /> Add games</Button>
        </div>
      </header>

      {collection.length === 0 ? (
        <Card className="lib-empty-state">
          <span><Gamepad2 size={27} /></span>
          <h2>Build your decision library</h2>
          <p>Add games you own or genuinely want to play. PlayNext will use this collection when you choose the collection recommendation mode.</p>
          <Button href="/dashboard/search"><Plus size={15} /> Add your first games</Button>
        </Card>
      ) : (
        <>
          <section className="pn-library-toolbar" aria-label="Library filters">
            <div className="pn-library-filter-row">
              <label className="pn-library-search">
                <Search size={17} /><span className="sr-only">Search collection</span>
                <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search your library" />
              </label>

              <label className="pn-library-select">
                <ListFilter size={16} /><span className="sr-only">Filter by genre</span>
                <select value={genreFilter} onChange={(event) => setGenreFilter(event.target.value)}>
                  <option value="all">All genres</option>
                  {genres.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
                </select>
              </label>

              <label className="pn-library-select">
                <SlidersHorizontal size={16} /><span className="sr-only">Sort collection</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}>
                  <option value="recent">Recently added</option>
                  <option value="title">Title A–Z</option>
                  <option value="rating">Highest rated</option>
                </select>
              </label>
            </div>

            <div className="pn-library-tabs" role="tablist" aria-label="Filter by collection status">
              {(["all", "backlog", "playing", "completed"] as StatusFilter[]).map((status) => {
                const count = status === "all" ? collectionTotals.total : collectionTotals[status];
                return (
                  <button key={status} type="button" role="tab" aria-selected={statusFilter === status} className={statusFilter === status ? "is-active" : ""} onClick={() => setStatusFilter(status)}>
                    {status === "all" ? "All" : statusLabel(status)} <span>{count}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {statusError && <div className="pn-library-error" role="alert">{statusError}</div>}

          <div className="pn-library-results-heading">
            <h2>{filteredCollection.length} {filteredCollection.length === 1 ? "game" : "games"}</h2>
            {(searchQuery || statusFilter !== "all" || genreFilter !== "all") && <button type="button" onClick={clearFilters}>Clear filters</button>}
          </div>

          {filteredCollection.length === 0 ? (
            <Card className="lib-filter-empty">
              <Search size={24} /><h3>No matching games</h3><p>Try a different search, status or genre.</p>
              <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>
            </Card>
          ) : (
            <div className="pn-library-grid">
              {filteredCollection.map((row) => {
                const game = oneGame(row);
                if (!game) return null;
                const detailHref = game.slug ? `/dashboard/search/${game.slug}` : null;

                return (
                  <article key={row.id} className="pn-library-card">
                    {detailHref && (
                      <Link className="pn-library-card-link" href={detailHref} aria-label={`Open details for ${game.title}`}>
                        <span className="sr-only">Open details for {game.title}</span>
                      </Link>
                    )}

                    <div className="pn-library-artwork">
                      {game.background_image ? (
                        <Image src={game.background_image} alt={`${game.title} artwork`} fill sizes="(max-width: 680px) 50vw, (max-width: 1080px) 33vw, 25vw" className="object-cover" />
                      ) : <div className="game-artwork-placeholder"><Gamepad2 size={28} /></div>}
                    </div>

                    <div className="pn-library-card-body">
                      <h3 title={game.title}>{game.title}</h3>
                      <div className="pn-library-card-meta">
                        <span>{game.genres?.slice(0, 2).join(" · ") || "Game"}</span>
                        {game.playtime != null && game.playtime > 0 && <span><Clock3 size={13} /> {game.playtime}h</span>}
                      </div>
                    </div>

                    <footer className="pn-library-card-controls">
                      <label className={`pn-library-card-status${updatingStatusId === row.id ? " is-updating" : ""}`}>
                        <span>Status</span>
                        <select value={statusOptions.some((option) => option.value === row.status) ? row.status : "backlog"} disabled={updatingStatusId === row.id} onChange={(event) => updateStatus(row.id, event.target.value as CollectionStatus)} aria-label={`Status for ${game.title}`}>
                          {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>

                      <div className="pn-library-card-remove">
                        <RemoveGameButton
                          userGameId={row.id}
                          gameTitle={game.title}
                          onRemoved={() => {
                            setCollection((current) => current.filter((item) => item.id !== row.id));
                            setCollectionTotals((current) => {
                              const next = { ...current, total: Math.max(0, current.total - 1) };
                              if (isTrackedStatus(row.status)) next[row.status] = Math.max(0, current[row.status] - 1);
                              return next;
                            });
                          }}
                        />
                      </div>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
          {hasMore && !searchQuery && statusFilter === "all" && genreFilter === "all" && (
            <div className="pn-library-load-more">
              <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                {loadingMore ? "Loading more…" : "Load more games"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
