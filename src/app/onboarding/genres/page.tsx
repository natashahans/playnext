"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { supabase } from "@/lib/supabase";
import { GENRES, ONBOARDING_TOTAL_STEPS } from "@/lib/onboarding";

export default function GenresPage() {
  const router = useRouter();
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function toggleGenre(genre: string) {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter((item) => item !== genre));
      return;
    }

    if (selectedGenres.length >= 5) return;

    setSelectedGenres([...selectedGenres, genre]);
  }

  async function saveGenres() {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      alert("Please log in again.");
      router.push("/login");
      return;
    }

    const { data: existingPreference } = await supabase
      .from("user_preferences")
      .select("id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (existingPreference) {
      const { error } = await supabase
        .from("user_preferences")
        .update({
          favorite_genres: selectedGenres,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userData.user.id);

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.from("user_preferences").insert({
        user_id: userData.user.id,
        favorite_genres: selectedGenres,
      });

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }
    }

    router.push("/onboarding/platforms");
  }

  return (
    <OnboardingShell
      step={1}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title="Which genres do you enjoy most?"
      description="Choose up to 5 genres. We'll use these to personalize your recommendations."
      nextLabel="Continue"
      nextDisabled={selectedGenres.length === 0 || loading}
      loading={loading}
      onNext={saveGenres}
    >
      <div className="choice-grid">
        {GENRES.map((genre) => {
          const selected = selectedGenres.includes(genre);

          return (
            <button
              key={genre}
              onClick={() => toggleGenre(genre)}
              className={`choice-chip ${selected ? "choice-chip-selected" : ""}`}
            >
              {genre}
            </button>
          );
        })}
      </div>
    </OnboardingShell>
  );
}