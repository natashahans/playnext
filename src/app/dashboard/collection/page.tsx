"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Gamepad2, Library, Plus, Search, SlidersHorizontal } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import RemoveGameButton from "@/components/games/RemoveGameButton";
import { supabase } from "@/lib/supabase";

type GameDetails = {
  id: string;
  title: string;
  background_image: string | null;
  rating: number | null;
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

export default function CollectionPage() {
  const [collection, setCollection] = useState<CollectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
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
            title,
            background_image,
            rating,
            genres,
            platforms
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

      setCollection((data ?? []) as unknown as CollectionRow[]);
      setLoading(false);
    }

    fetchCollection();

    return () => {
      active = false;
    };
  }, []);

  const availableGenres = useMemo(() => {
    const genres = new Set<string>();

    collection.forEach((item) => {
      const game = Array.isArray(item.games) ? item.games[0] : item.games;
      game?.genres?.forEach((genre) => genres.add(genre));
    });

    return ["All", ...Array.from(genres).sort((a, b) => a.localeCompare(b))];
  }, [collection]);

  const filteredCollection = useMemo(() => {
    return collection
      .filter((item) => {
        const game = Array.isArray(item.games) ? item.games[0] : item.games;
        if (!game) return false;

        const matchesSearch = game.title
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase());
        const matchesFilter =
          activeFilter === "All" || game.genres?.includes(activeFilter);

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        const gameA = Array.isArray(a.games) ? a.games[0] : a.games;
        const gameB = Array.isArray(b.games) ? b.games[0] : b.games;

        if (sortBy === "title") {
          return (gameA?.title ?? "").localeCompare(gameB?.title ?? "");
        }

        if (sortBy === "rating") {
          return (gameB?.rating ?? 0) - (gameA?.rating ?? 0);
        }

        return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
      });
  }, [collection, searchQuery, activeFilter, sortBy]);

  if (loading) {
    return (
      <div className="pn-page-loading" role="status">
        <span className="dashboard-loading-dot" aria-hidden="true" />
        Loading your collection…
      </div>
    );
  }

  if (errorMessage) {
    return (
      <Card className="pn-state-card">
        <h2>Collection unavailable</h2>
        <p>{errorMessage}</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </Card>
    );
  }

  return (
    <div className="pn-page">
      <div className="pn-page-intro">
        <div>
          <span className="pn-kicker">
            <Library size={14} aria-hidden="true" />
            {collection.length} {collection.length === 1 ? "game" : "games"}
          </span>
          <h2>Your decision library</h2>
          <p>
            Every recommendation starts here. Keep this collection focused on
            games you can genuinely choose to play.
          </p>
        </div>

        <Button href="/dashboard/search">
          <Plus size={15} aria-hidden="true" />
          Add games
        </Button>
      </div>

      {collection.length === 0 ? (
        <Card className="pn-empty-state pn-empty-state-large">
          <span className="pn-empty-icon" aria-hidden="true">
            <Gamepad2 size={24} />
          </span>
          <h3>Your collection is empty</h3>
          <p>
            Add games you own or want to play so PlayNext has a meaningful set
            of choices to evaluate.
          </p>
          <Button href="/dashboard/search">Add your first games</Button>
        </Card>
      ) : (
        <>
          <div className="collection-toolbar">
            <label className="pn-search-field">
              <Search size={16} aria-hidden="true" />
              <span className="sr-only">Search collection</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search your collection"
              />
            </label>

            <label className="pn-select-field collection-sort">
              <SlidersHorizontal size={15} aria-hidden="true" />
              <span className="sr-only">Sort collection</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}>
                <option value="recent">Recently added</option>
                <option value="title">Title A–Z</option>
                <option value="rating">Highest rated</option>
              </select>
            </label>
          </div>

          <div className="collection-filters" aria-label="Filter by genre">
            {availableGenres.map((filter) => (
              <button
                type="button"
                key={filter}
                onClick={() => setActiveFilter(filter)}
                aria-pressed={activeFilter === filter}
                className={activeFilter === filter ? "filter-chip filter-chip-active" : "filter-chip"}
              >
                {filter}
              </button>
            ))}
          </div>

          {filteredCollection.length === 0 ? (
            <Card className="pn-empty-state">
              <span className="pn-empty-icon" aria-hidden="true">
                <Search size={21} />
              </span>
              <h3>No matching games</h3>
              <p>Try a different title or genre filter.</p>
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter("All");
                }}
              >
                Clear filters
              </Button>
            </Card>
          ) : (
            <div className="game-card-grid collection-card-grid">
              {filteredCollection.map((item) => {
                const game = Array.isArray(item.games) ? item.games[0] : item.games;
                if (!game) return null;

                return (
                  <article key={item.id} className="game-card collection-game-card">
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
                      <span className="game-status-badge">{item.status}</span>
                    </div>

                    <div className="game-card-body">
                      <div className="game-card-title-row">
                        <h3>{game.title}</h3>
                        {game.rating !== null && <span>{game.rating.toFixed(1)}</span>}
                      </div>

                      <div className="game-card-badges">
                        {game.genres?.slice(0, 2).map((genre) => (
                          <Badge key={genre}>{genre}</Badge>
                        ))}
                      </div>

                      <RemoveGameButton
                        userGameId={item.id}
                        gameTitle={game.title}
                        onRemoved={() =>
                          setCollection((current) => current.filter((row) => row.id !== item.id))
                        }
                      />
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
