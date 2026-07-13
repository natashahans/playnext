"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  Gamepad2,
  Library,
  ListFilter,
  PlayCircle,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
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

type SortOption = "recent" | "title" | "rating";
type StatusFilter = "all" | "backlog" | "playing" | "completed";

const statusOptions = [
  { value: "backlog", label: "Backlog" },
  { value: "playing", label: "Playing" },
  { value: "completed", label: "Completed" },
] as const;

function oneGame(row: CollectionRow) {
  return Array.isArray(row.games) ? row.games[0] : row.games;
}

function statusLabel(status: string) {
  return statusOptions.find((option) => option.value === status)?.label ?? "Backlog";
}

export default function CollectionPage() {
  const [collection, setCollection] = useState<CollectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusError, setStatusError] = useState("");
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  useEffect(() => {
    let active = true;

    async function fetchCollection() {
      const { data: userData } = await supabase.auth.getUser();
      if (!active) return;

      if (!userData.user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
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
        .order("added_at", { ascending: false });

      if (!active) return;

      if (error) {
        setErrorMessage("We couldn’t load your collection. Please refresh and try again.");
      } else {
        setCollection((data ?? []) as unknown as CollectionRow[]);
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

  const stats = useMemo(() => {
    const ratings = collection
      .map((row) => oneGame(row)?.rating)
      .filter((rating): rating is number => rating != null && rating > 0);

    return {
      total: collection.length,
      backlog: collection.filter((row) => row.status === "backlog").length,
      playing: collection.filter((row) => row.status === "playing").length,
      completed: collection.filter((row) => row.status === "completed").length,
      averageRating: ratings.length
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : 0,
    };
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

  async function updateStatus(userGameId: string, nextStatus: string) {
    const previousStatus = collection.find((row) => row.id === userGameId)?.status ?? "backlog";
    setStatusError("");
    setUpdatingStatusId(userGameId);
    setCollection((current) => current.map((row) =>
      row.id === userGameId ? { ...row, status: nextStatus } : row
    ));

    const { error } = await supabase
      .from("user_games")
      .update({ status: nextStatus })
      .eq("id", userGameId);

    if (error) {
      setCollection((current) => current.map((row) =>
        row.id === userGameId ? { ...row, status: previousStatus } : row
      ));
      setStatusError("That status could not be updated. Please try again.");
    }
    setUpdatingStatusId(null);
  }

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("all");
    setGenreFilter("all");
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
    <div className="lib-page collection-v2">
      <header className="lib-page-header">
        <div>
          <span className="lib-kicker"><Library size={14} /> My collection</span>
          <h1>Your games, organised around what comes next.</h1>
          <p>Manage your backlog, track what you are playing, and keep PlayNext’s recommendation pool accurate.</p>
        </div>
        <div className="lib-header-actions">
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
          <section className="lib-stat-grid" aria-label="Collection overview">
            <article><span className="lib-stat-icon"><Library size={17} /></span><div><small>Total games</small><strong>{stats.total}</strong><p>Available to organise</p></div></article>
            <article><span className="lib-stat-icon"><Clock3 size={17} /></span><div><small>Backlog</small><strong>{stats.backlog}</strong><p>Waiting to be played</p></div></article>
            <article><span className="lib-stat-icon"><PlayCircle size={17} /></span><div><small>Playing now</small><strong>{stats.playing}</strong><p>Easy to resume</p></div></article>
            <article><span className="lib-stat-icon"><CheckCircle2 size={17} /></span><div><small>Completed</small><strong>{stats.completed}</strong><p>Excluded from most picks</p></div></article>
            <article><span className="lib-stat-icon"><Star size={17} /></span><div><small>Average rating</small><strong>{stats.averageRating ? stats.averageRating.toFixed(1) : "—"}</strong><p>Across rated games</p></div></article>
          </section>

          <section className="lib-control-panel">
            <div className="lib-search-row">
              <label className="lib-search-box">
                <Search size={17} /><span className="sr-only">Search collection</span>
                <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by title, genre or platform" />
              </label>

              <label className="lib-select-box">
                <ListFilter size={16} /><span className="sr-only">Filter by genre</span>
                <select value={genreFilter} onChange={(event) => setGenreFilter(event.target.value)}>
                  <option value="all">All genres</option>
                  {genres.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
                </select>
              </label>

              <label className="lib-select-box">
                <SlidersHorizontal size={16} /><span className="sr-only">Sort collection</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}>
                  <option value="recent">Recently added</option>
                  <option value="title">Title A–Z</option>
                  <option value="rating">Highest rated</option>
                </select>
              </label>
            </div>

            <div className="lib-status-tabs" role="tablist" aria-label="Filter by collection status">
              {(["all", "backlog", "playing", "completed"] as StatusFilter[]).map((status) => {
                const count = status === "all" ? stats.total : collection.filter((row) => row.status === status).length;
                return (
                  <button key={status} type="button" role="tab" aria-selected={statusFilter === status} className={statusFilter === status ? "is-active" : ""} onClick={() => setStatusFilter(status)}>
                    {status === "all" ? "All games" : statusLabel(status)} <span>{count}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {statusError && <div className="lib-inline-error" role="alert">{statusError}</div>}

          <div className="lib-results-heading">
            <div><span>Library</span><h2>{filteredCollection.length} {filteredCollection.length === 1 ? "game" : "games"}</h2></div>
            {(searchQuery || statusFilter !== "all" || genreFilter !== "all") && <button type="button" onClick={clearFilters}>Clear filters</button>}
          </div>

          {filteredCollection.length === 0 ? (
            <Card className="lib-filter-empty">
              <Search size={24} /><h3>No matching games</h3><p>Try a different search, status or genre.</p>
              <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>
            </Card>
          ) : (
            <div className="collection-v2-grid">
              {filteredCollection.map((row) => {
                const game = oneGame(row);
                if (!game) return null;

                return (
                  <article key={row.id} className="collection-v2-card">
                    <div className="collection-v2-artwork">
                      {game.background_image ? (
                        <Image src={game.background_image} alt="" fill sizes="(max-width: 700px) 100vw, (max-width: 1180px) 50vw, 33vw" className="object-cover" unoptimized />
                      ) : <div className="game-artwork-placeholder"><Gamepad2 size={28} /></div>}
                      <span className={`collection-status collection-status-${row.status}`}>{statusLabel(row.status)}</span>
                      {game.rating != null && game.rating > 0 && <span className="collection-rating"><Star size={12} fill="currentColor" /> {game.rating.toFixed(1)}</span>}
                    </div>

                    <div className="collection-v2-body">
                      <div className="collection-v2-title"><h3>{game.title}</h3><span>Added {new Date(row.added_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span></div>

                      <div className="collection-v2-badges">
                        {game.genres?.slice(0, 3).map((genre) => <Badge key={genre}>{genre}</Badge>)}
                      </div>

                      <div className="collection-v2-meta">
                        <span>{game.platforms?.slice(0, 2).join(" · ") || "Platform unavailable"}</span>
                        {game.playtime != null && game.playtime > 0 && <span><Clock3 size={13} /> {game.playtime}h average</span>}
                      </div>

                      <label className="collection-status-control">
                        <span>Collection status</span>
                        <select value={statusOptions.some((option) => option.value === row.status) ? row.status : "backlog"} disabled={updatingStatusId === row.id} onChange={(event) => updateStatus(row.id, event.target.value)}>
                          {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>

                      <div className="collection-v2-actions">
                        {game.slug ? <Link href={`/dashboard/search/${game.slug}`}>View details</Link> : <span />}
                        <RemoveGameButton userGameId={row.id} gameTitle={game.title} onRemoved={() => setCollection((current) => current.filter((item) => item.id !== row.id))} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
