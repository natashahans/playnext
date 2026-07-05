"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingShell from "@/components/onboarding/OnboardingShell";

import { GENRES, ONBOARDING_TOTAL_STEPS } from "@/lib/onboarding";

export default function GenresPage() {
  const router = useRouter();
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  function toggleGenre(genre: string) {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter((item) => item !== genre));
      return;
    }

    if (selectedGenres.length >= 5) return;

    setSelectedGenres([...selectedGenres, genre]);
  }

  return (
    <OnboardingShell
      step={1}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title="Which genres do you enjoy most?"
      description="Choose up to 5 genres. We'll use these to personalize your recommendations."
      nextLabel="Continue"
      nextDisabled={selectedGenres.length === 0}
      onNext={() => router.push("/onboarding/platforms")}
    >
      <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-3">
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