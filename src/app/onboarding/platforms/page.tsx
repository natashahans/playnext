"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { ONBOARDING_TOTAL_STEPS, PLATFORMS } from "@/lib/onboarding";

export default function PlatformsPage() {
  const router = useRouter();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  function togglePlatform(platform: string) {
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(selectedPlatforms.filter((item) => item !== platform));
      return;
    }

    setSelectedPlatforms([...selectedPlatforms, platform]);
  }

  return (
    <OnboardingShell
      step={2}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title="Where do you usually play?"
      description="Choose every platform you regularly play on."
      backHref="/onboarding/genres"
      nextLabel="Continue"
      nextDisabled={selectedPlatforms.length === 0}
      onNext={() => router.push("/onboarding/collection")}
    >
      <div className="onboarding-section">
        <div className="choice-grid">
          {PLATFORMS.map((platform) => {
            const selected = selectedPlatforms.includes(platform);

            return (
              <button
                key={platform}
                onClick={() => togglePlatform(platform)}
                className={`choice-chip ${selected ? "choice-chip-selected" : ""}`}
              >
                {platform}
              </button>
            );
          })}
        </div>
      </div>
    </OnboardingShell>
  );
}