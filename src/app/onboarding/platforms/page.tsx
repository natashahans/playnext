"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { supabase } from "@/lib/supabase";
import { ONBOARDING_TOTAL_STEPS, PLATFORMS } from "@/lib/onboarding";

export default function PlatformsPage() {
  const router = useRouter();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function togglePlatform(platform: string) {
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(selectedPlatforms.filter((item) => item !== platform));
      return;
    }

    setSelectedPlatforms([...selectedPlatforms, platform]);
  }

  async function savePlatforms() {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      alert("Please log in again.");
      router.push("/login");
      return;
    }

    const { error } = await supabase
      .from("user_preferences")
      .update({
        preferred_platforms: selectedPlatforms,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userData.user.id);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    router.push("/onboarding/collection");
  }

  return (
    <OnboardingShell
      step={2}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title="Where do you usually play?"
      description="Choose every platform you regularly play on."
      backHref="/onboarding/genres"
      nextLabel="Continue"
      nextDisabled={selectedPlatforms.length === 0 || loading}
      loading={loading}
      onNext={savePlatforms}
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