"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, Gamepad2, Search, X } from "lucide-react";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { saveCatalogueGame } from "@/lib/catalogue-client";
import { searchRawgGames, type DiscoveryPayload, type RawgGame } from "@/lib/rawg";
import { supabase } from "@/lib/supabase";

export default function OnboardingCollectionPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RawgGame[]>([]);
  const [suggested, setSuggested] = useState<RawgGame[]>([]);
  const [addedGames, setAddedGames] = useState<RawgGame[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    authenticatedFetch("/api/games/discover")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load suggestions.");
        const payload = (await response.json()) as DiscoveryPayload;
        const games = payload.sections.find((section) => section.id === "popular")?.games
          ?? payload.sections[0]?.games
          ?? [];
        if (active) setSuggested(games.slice(0, 12));
      })
      .catch(() => { if (active) setErrorMessage("Suggestions are unavailable, but search still works."); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) return;

    let active = true;
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      setErrorMessage("");
      try {
        const games = await searchRawgGames(value);
        if (active) setResults(games);
      } catch {
        if (active) setErrorMessage("Search is taking a break. Please try again.");
      } finally {
        if (active) setSearching(false);
      }
    }, 280);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [query]);

  const gamesToShow = query.trim().length >= 2 ? results : suggested;
  const selectedIds = useMemo(() => new Set(addedGames.map((game) => game.id)), [addedGames]);

  function toggleGame(game: RawgGame) {
    setAddedGames((current) => current.some((item) => item.id === game.id)
      ? current.filter((item) => item.id !== game.id)
      : [...current, game]
    );
  }

  async function finishOnboarding() {
    if (saving) return;
    setSaving(true);
    setErrorMessage("");

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("Your session expired. Please log in again.");

      if (addedGames.length > 0) {
        const savedGames = await Promise.all(addedGames.map((game) => saveCatalogueGame(game.slug)));
        const { error: userGameError } = await supabase.from("user_games").upsert(
          savedGames.map((game) => ({ user_id: userData.user.id, game_id: game.id, status: "backlog" })),
          { onConflict: "user_id,game_id", ignoreDuplicates: true }
        );
        if (userGameError) throw userGameError;
      }

      const { error: profileError } = await supabase.from("profiles").upsert(
        { id: userData.user.id, email: userData.user.email, onboarding_completed: true },
        { onConflict: "id" }
      );
      if (profileError) throw profileError;
      router.replace("/dashboard");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Your library could not be saved.");
      setSaving(false);
    }
  }

  return (
    <OnboardingShell
      step={3}
      totalSteps={3}
      eyebrow="Make it personal"
      title="Add games you know"
      description="A few familiar games help PlayNext understand your taste. You can add more later."
      backHref="/onboarding/platforms"
      nextLabel={addedGames.length > 0 ? `Finish with ${addedGames.length} ${addedGames.length === 1 ? "game" : "games"}` : "Finish setup"}
      loading={saving}
      onNext={finishOnboarding}
      selectionStatus={<span className="onboarding-library-count"><strong>{addedGames.length}</strong> selected</span>}
    >
      <div className="onboarding-library">
        <label className="onboarding-library-search">
          <Search aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by game title" autoComplete="off" />
          {query ? <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X aria-hidden="true" /></button> : null}
        </label>

        <div className="onboarding-library-heading">
          <h2>{query.trim().length >= 2 ? "Search results" : "Popular games"}</h2>
          <span>{searching ? "Searching…" : `${gamesToShow.length} shown`}</span>
        </div>

        {errorMessage ? <p className="onboarding-inline-error" role="alert">{errorMessage}</p> : null}

        {!searching && gamesToShow.length === 0 ? (
          <div className="onboarding-library-empty"><Gamepad2 aria-hidden="true" /><h3>No games found</h3><p>Check the title or try a shorter search.</p></div>
        ) : (
          <div className="onboarding-library-grid" aria-busy={searching}>
            {gamesToShow.map((game) => {
              const selected = selectedIds.has(game.id);
              return (
                <button key={game.id} type="button" onClick={() => toggleGame(game)} aria-pressed={selected} className={`onboarding-game-card ${selected ? "onboarding-game-card-selected" : ""}`}>
                  <span className="onboarding-game-art">
                    {game.background_image ? <Image src={game.background_image} alt="" fill sizes="(max-width: 600px) 50vw, 200px" className="object-cover" /> : <Gamepad2 aria-hidden="true" />}
                    <i>{selected ? <Check aria-hidden="true" /> : "+"}</i>
                  </span>
                  <span className="onboarding-game-name">{game.name}</span>
                </button>
              );
            })}
          </div>
        )}

        <button type="button" onClick={finishOnboarding} disabled={saving} className="collection-skip">Skip this for now</button>
      </div>
    </OnboardingShell>
  );
}
