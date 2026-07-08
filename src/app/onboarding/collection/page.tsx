"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { searchRawgGames, type RawgGame } from "@/lib/rawg";
import { supabase } from "@/lib/supabase";

export default function OnboardingCollectionPage() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RawgGame[]>([]);
  const [addedGames, setAddedGames] = useState<RawgGame[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const value = query.trim();

    if (value.length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearching(true);

      try {
        const games = await searchRawgGames(value);
        setResults(games);
      } catch (error) {
        console.error(error);
        alert("Failed to search games.");
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

  function addGame(game: RawgGame) {
    if (addedGames.some((item) => item.id === game.id)) return;

    setAddedGames([...addedGames, game]);
  }

  function removeGame(gameId: number) {
    setAddedGames(addedGames.filter((game) => game.id !== gameId));
  }

  async function finishOnboarding() {
    setSaving(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      alert("Please log in again.");
      router.push("/login");
      return;
    }

    for (const game of addedGames) {
      const { data: savedGame, error: gameError } = await supabase
        .from("games")
        .upsert(
          {
            rawg_id: game.id,
            title: game.name,
            slug: game.slug,
            background_image: game.background_image,
            released: game.released,
            rating: game.rating,
            playtime: game.playtime,
            genres: game.genres?.map((genre) => genre.name) ?? [],
            platforms:
              game.platforms?.map((item) => item.platform.name) ?? [],
            tags: game.tags?.map((tag) => tag.name) ?? [],
          },
          { onConflict: "rawg_id" }
        )
        .select("id")
        .single();

      if (gameError) {
        alert(gameError.message);
        setSaving(false);
        return;
      }

      const { error: userGameError } = await supabase.from("user_games").upsert(
        {
          user_id: userData.user.id,
          game_id: savedGame.id,
          status: "backlog",
        },
        {
          onConflict: "user_id,game_id",
          ignoreDuplicates: true,
        }
      );

      if (userGameError) {
        alert(userGameError.message);
        setSaving(false);
        return;
      }
    }

    const { error: profileError } = await supabase.from("profiles").upsert(
    {
        id: userData.user.id,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
    );

    if (profileError) {
    alert(profileError.message);
    setSaving(false);
    return;
    }

    router.push("/dashboard");
  }

  return (
    <OnboardingShell
      step={3}
      totalSteps={3}
      title="Build your collection"
      description="Search for games you own. PlayNext will recommend from your real library."
      backHref="/onboarding/platforms"
      nextLabel="Start using PlayNext"
      nextDisabled={addedGames.length === 0 || saving}
      loading={saving}
      onNext={finishOnboarding}
    >
      <div className="collection-onboarding">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search games..."
          className="collection-search"
        />

        <div className="collection-layout">
          <section className="collection-panel">
            <div className="collection-panel-header">
              <h3>
                {query.trim().length < 2
                  ? "Search RAWG"
                  : searching
                  ? "Searching..."
                  : "Search results"}
              </h3>
              <span>{results.length} games</span>
            </div>

            {query.trim().length < 2 ? (
              <div className="collection-empty">
                <p>Search for any game</p>
                <span>Try Hades, Elden Ring, Cyberpunk, or Stardew Valley.</span>
              </div>
            ) : results.length === 0 && !searching ? (
              <div className="collection-empty">
                <p>No games found</p>
                <span>Try another search term.</span>
              </div>
            ) : (
              <div className="collection-results">
                {results.map((game) => {
                  const added = addedGames.some((item) => item.id === game.id);

                  return (
                    <button
                      key={game.id}
                      onClick={() => addGame(game)}
                      className="collection-game-row"
                    >
                      {game.background_image ? (
                        <img src={game.background_image} alt={game.name} />
                      ) : (
                        <div className="collection-game-placeholder" />
                      )}

                      <div>
                        <p>{game.name}</p>
                        <span>
                          {game.genres?.slice(0, 2).map((genre) => genre.name).join(" • ") ||
                            "Game"}
                        </span>
                      </div>

                      <strong>{added ? "Added" : "+"}</strong>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="collection-panel">
            <div className="collection-panel-header">
              <h3>Added games</h3>
              <span>{addedGames.length}</span>
            </div>

            {addedGames.length === 0 ? (
              <div className="collection-empty">
                <p>No games added yet</p>
                <span>Search on the left and add a few games you own.</span>
              </div>
            ) : (
              <div className="collection-added-list">
                {addedGames.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => removeGame(game.id)}
                    className="collection-added-game"
                  >
                    {game.background_image ? (
                      <img src={game.background_image} alt={game.name} />
                    ) : (
                      <div className="collection-game-placeholder" />
                    )}

                    <span>{game.name}</span>
                    <strong>Remove</strong>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <button
          onClick={finishOnboarding}
          disabled={saving}
          className="collection-skip"
        >
          Skip for now
        </button>
      </div>
    </OnboardingShell>
  );
}