"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { GAME_PRIORITIES, ONBOARDING_TOTAL_STEPS } from "@/lib/onboarding";

export default function PrioritiesPage() {
  const router = useRouter();
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);

  function togglePriority(priority: string) {
    if (selectedPriorities.includes(priority)) {
      setSelectedPriorities(selectedPriorities.filter((item) => item !== priority));
      return;
    }

    if (selectedPriorities.length >= 3) return;

    setSelectedPriorities([...selectedPriorities, priority]);
  }

  return (
    <OnboardingShell
      step={3}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title="What matters most when choosing a game?"
      description="Choose up to 3. This helps PlayNext understand what kind of experience you usually want."
      backHref="/onboarding/platforms"
      nextLabel="Continue"
      nextDisabled={selectedPriorities.length === 0}
      onNext={() => router.push("/onboarding/session-length")}
    >
      <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-3">
        {GAME_PRIORITIES.map((priority) => {
          const selected = selectedPriorities.includes(priority);

          return (
            <button
              key={priority}
              onClick={() => togglePriority(priority)}
              className={`choice-chip ${selected ? "choice-chip-selected" : ""}`}
            >
              {priority}
            </button>
          );
        })}
      </div>
    </OnboardingShell>
  );
}