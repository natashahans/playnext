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
    setSelectedPlatforms((current) => current.includes(platform)
      ? current.filter((item) => item !== platform)
      : [...current, platform]
    );
  }

  async function savePlatforms() {
    setLoading(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      alert("Please log in again.");
      setLoading(false);
      router.push("/login");
      return;
    }

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userData.user.id,
        email: userData.user.email ?? null,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      alert(profileError.message);
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("user_preferences").upsert({
        user_id: userData.user.id,
        preferred_platforms: selectedPlatforms,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

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
      eyebrow="Your setup"
      title="Where do you play?"
      description="Choose the platforms you can actually use. We’ll avoid recommending games you cannot play."
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
