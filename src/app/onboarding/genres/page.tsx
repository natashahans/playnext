"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { supabase } from "@/lib/supabase";
import { ONBOARDING_TOTAL_STEPS } from "@/lib/onboarding";

const GENRE_OPTIONS = [
  "Action",
  "Adventure",
  "RPG",
  "Open World",
  "Shooter",
  "Racing",
  "Sports",
  "Platformer",
  "Strategy",
  "Simulation",
  "Puzzle",
  "Roguelike",
  "Horror",
  "Survival",
  "Cozy",
  "Indie",
];

export default function GenresPage() {
  const router = useRouter();

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function toggleGenre(genre: string) {
    setSelectedGenres((currentGenres) => {
      if (currentGenres.includes(genre)) {
        return currentGenres.filter((item) => item !== genre);
      }

      if (currentGenres.length >= 5) {
        return currentGenres;
      }

      return [...currentGenres, genre];
    });
  }

  async function saveGenres() {
    setLoading(true);

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      setLoading(false);
      alert("Please log in again.");
      router.push("/login");
      return;
    }

    const { data: existingPreference, error: preferenceError } =
      await supabase
        .from("user_preferences")
        .select("id")
        .eq("user_id", userData.user.id)
        .maybeSingle();

    if (preferenceError) {
      setLoading(false);
      alert(preferenceError.message);
      return;
    }

    if (existingPreference) {
      const { error } = await supabase
        .from("user_preferences")
        .update({
          favorite_genres: selectedGenres,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userData.user.id);

      if (error) {
        setLoading(false);
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("user_preferences")
        .insert({
          user_id: userData.user.id,
          favorite_genres: selectedGenres,
        });

      if (error) {
        setLoading(false);
        alert(error.message);
        return;
      }
    }

    router.push("/onboarding/platforms");
  }

  const selectionLimit = 5;
  const selectedCount = selectedGenres.length;
  const remainingCount = selectionLimit - selectedCount;
  const reachedLimit = remainingCount === 0;

  return (
    <OnboardingShell
      step={1}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      eyebrow="Your gaming taste"
      title="Tell us what you enjoy playing"
      description="Choose up to five genres. PlayNext will combine your choices with your mood, available time, gaming history and current preferences."
      nextLabel="Continue"
      nextDisabled={selectedCount === 0 || loading}
      loading={loading}
      onNext={saveGenres}
      selectionStatus={
        <div className="genre-selection-status">
          <span className="genre-selection-summary">
            <strong>{selectedCount}</strong>/ {selectionLimit} selected
          </span>

          <span
            className={`genre-selection-remaining ${
              reachedLimit ? "genre-selection-complete" : ""
            }`}
          >
            {reachedLimit
              ? "Ready to continue"
              : `Choose ${remainingCount} more`}
          </span>

          <span className="genre-selection-edit">
            You can change these later.
          </span>
        </div>
      }
    >
      <div className="genre-groups">
        <div className="genre-grid">
          {GENRE_OPTIONS.map((genre) => {
            const selected = selectedGenres.includes(genre);
            const unavailable = reachedLimit && !selected;

            return (
              <button
                type="button"
                key={genre}
                onClick={() => {
                  if (!unavailable) {
                    toggleGenre(genre);
                  }
                }}
                aria-pressed={selected}
                aria-disabled={unavailable}
                className={`genre-card ${
                  selected ? "genre-card-selected" : ""
                } ${
                  unavailable ? "genre-card-unavailable" : ""
                }`}
              >
                <span className="genre-card-name">{genre}</span>
              </button>
            );
          })}
        </div>
      </div>
    </OnboardingShell>
  );
}