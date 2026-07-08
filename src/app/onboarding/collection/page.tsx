"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingShell from "@/components/onboarding/OnboardingShell";

const popularGames = [
  {
    id: "cyberpunk-2077",
    title: "Cyberpunk 2077",
    meta: "RPG • Open World",
    image: "https://images.igdb.com/igdb/image/upload/t_cover_big/co7497.jpg",
  },
  {
    id: "elden-ring",
    title: "Elden Ring",
    meta: "RPG • Souls-like",
    image: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg",
  },
  {
    id: "hades",
    title: "Hades",
    meta: "Roguelike • Action",
    image: "https://images.igdb.com/igdb/image/upload/t_cover_big/co39vc.jpg",
  },
  {
    id: "red-dead-redemption-2",
    title: "Red Dead Redemption 2",
    meta: "Adventure • Open World",
    image: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1q1f.jpg",
  },
  {
    id: "hollow-knight",
    title: "Hollow Knight",
    meta: "Platformer • Adventure",
    image: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1rgi.jpg",
  },
  {
    id: "stardew-valley",
    title: "Stardew Valley",
    meta: "Cozy • Simulation",
    image: "https://images.igdb.com/igdb/image/upload/t_cover_big/co49w1.jpg",
  },
];

export default function OnboardingCollectionPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [addedGames, setAddedGames] = useState<typeof popularGames>([]);

  const filteredGames = useMemo(() => {
    const value = query.trim().toLowerCase();

    if (!value) return popularGames;

    return popularGames.filter((game) =>
      game.title.toLowerCase().includes(value)
    );
  }, [query]);

  function addGame(game: (typeof popularGames)[number]) {
    if (addedGames.some((item) => item.id === game.id)) return;

    setAddedGames([...addedGames, game]);
  }

  function removeGame(gameId: string) {
    setAddedGames(addedGames.filter((game) => game.id !== gameId));
  }

  return (
    <OnboardingShell
      step={3}
      totalSteps={3}
      title="Build your collection"
      description="Add a few games you own. PlayNext will recommend from your real library."
      backHref="/onboarding/platforms"
      nextLabel="Start using PlayNext"
      onNext={() => router.push("/dashboard")}
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
              <h3>{query ? "Search results" : "Popular games"}</h3>
              <span>{filteredGames.length} games</span>
            </div>

            <div className="collection-results">
              {filteredGames.map((game) => {
                const added = addedGames.some((item) => item.id === game.id);

                return (
                  <button
                    key={game.id}
                    onClick={() => addGame(game)}
                    className="collection-game-row"
                  >
                    <img src={game.image} alt={game.title} />

                    <div>
                      <p>{game.title}</p>
                      <span>{game.meta}</span>
                    </div>

                    <strong>{added ? "Added" : "+"}</strong>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="collection-panel">
            <div className="collection-panel-header">
              <h3>Added games</h3>
              <span>{addedGames.length}</span>
            </div>

            {addedGames.length === 0 ? (
              <div className="collection-empty">
                <p>No games added yet</p>
                <span>Choose from popular games or search above.</span>
              </div>
            ) : (
              <div className="collection-added-list">
                {addedGames.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => removeGame(game.id)}
                    className="collection-added-game"
                  >
                    <img src={game.image} alt={game.title} />
                    <span>{game.title}</span>
                    <strong>Remove</strong>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <button
          onClick={() => router.push("/dashboard")}
          className="collection-skip"
        >
          Skip for now
        </button>
      </div>
    </OnboardingShell>
  );
}