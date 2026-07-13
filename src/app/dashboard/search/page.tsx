"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Gamepad2, Search } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import AddRawgGameButton from "@/components/games/AddRawgGameButton";
import { searchRawgGames, type RawgGame } from "@/lib/rawg";
import { supabase } from "@/lib/supabase";

type ExistingGameRow = {
  games: { rawg_id: number | null } | { rawg_id: number | null }[] | null;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [games, setGames] = useState<RawgGame[]>([]);
  const [existingRawgIds, setExistingRawgIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadExistingGames() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || !active) return;

      const { data } = await supabase
        .from("user_games")
        .select("games ( rawg_id )")
        .eq("user_id", userData.user.id);

      if (!active) return;

      const rows = (data ?? []) as unknown as ExistingGameRow[];
      const ids = rows
        .map((row) => (Array.isArray(row.games) ? row.games[0] : row.games)?.rawg_id)
        .filter((id): id is number => typeof id === "number");

      setExistingRawgIds(new Set(ids));
    }

    loadExistingGames();

    return () => {
      active = false;
    };
  }, []);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedQuery = query.trim();
    if (!cleanedQuery || loading) return;

    setLoading(true);
    setErrorMessage("");
    setSubmittedQuery(cleanedQuery);

    try {
      const results = await searchRawgGames(cleanedQuery);
      setGames(results);
    } catch (error) {
      setGames([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We couldn’t search the game catalogue. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pn-page">
      <div className="pn-page-intro">
        <div>
          <h2>Add games to your library</h2>
          <p>
            Search for games you own or genuinely want to play. Your collection
            becomes the decision space for every PlayNext recommendation.
          </p>
        </div>
      </div>

      <Card className="catalog-search-card">
        <form onSubmit={handleSearch}>
          <label htmlFor="catalog-search">Search the game catalogue</label>
          <div className="catalog-search-row">
            <div className="pn-search-field">
              <Search size={17} aria-hidden="true" />
              <input
                id="catalog-search"
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setErrorMessage("");
                }}
                placeholder="Try Elden Ring, Stardew Valley, Hades…"
                autoComplete="off"
              />
            </div>
            <Button type="submit" loading={loading} disabled={!query.trim()}>
              {loading ? "Searching…" : "Search"}
            </Button>
          </div>
        </form>
      </Card>

      {errorMessage && (
        <div className="pn-inline-error" role="alert">
          <strong>Search unavailable</strong>
          <span>{errorMessage}</span>
        </div>
      )}

      {!submittedQuery && !loading && (
        <Card className="pn-empty-state pn-empty-state-large">
          <span className="pn-empty-icon" aria-hidden="true">
            <Search size={22} />
          </span>
          <h3>Find your next possibilities</h3>
          <p>Search above to start building a focused, personal game library.</p>
        </Card>
      )}

      {submittedQuery && !loading && !errorMessage && (
        <section className="pn-section">
          <div className="pn-section-header">
            <div>
              <span className="pn-eyebrow">Search results</span>
              <h2>{games.length > 0 ? `Results for “${submittedQuery}”` : "No games found"}</h2>
            </div>
            <span className="pn-result-count">{games.length} results</span>
          </div>

          {games.length === 0 ? (
            <Card className="pn-empty-state">
              <span className="pn-empty-icon" aria-hidden="true">
                <Gamepad2 size={22} />
              </span>
              <h3>Nothing matched that title</h3>
              <p>Check the spelling or try a shorter game title.</p>
            </Card>
          ) : (
            <div className="game-card-grid catalog-card-grid">
              {games.map((game) => (
                <article key={game.id} className="game-card catalog-game-card">
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
                    <div className="game-card-title-row">
                      <h3>{game.name}</h3>
                      {game.rating !== null && <span>{game.rating.toFixed(1)}</span>}
                    </div>

                    <div className="game-card-badges">
                      {game.genres?.slice(0, 2).map((genre) => (
                        <Badge key={genre.id}>{genre.name}</Badge>
                      ))}
                    </div>

                    <AddRawgGameButton
                      game={game}
                      alreadyAdded={existingRawgIds.has(game.id)}
                      onAdded={() =>
                        setExistingRawgIds((current) => new Set([...current, game.id]))
                      }
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
