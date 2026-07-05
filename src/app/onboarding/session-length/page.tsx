"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { ONBOARDING_TOTAL_STEPS, SESSION_LENGTHS } from "@/lib/onboarding";

export default function SessionLengthPage() {
  const router = useRouter();
  const [selectedSessionLength, setSelectedSessionLength] = useState("");

  return (
    <OnboardingShell
      step={4}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title="How long do you usually play?"
      description="Pick the session length that feels closest to your normal gaming time."
      backHref="/onboarding/priorities"
      nextLabel="Continue"
      nextDisabled={!selectedSessionLength}
      onNext={() => router.push("/onboarding/finish")}
    >
      <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-3">
        {SESSION_LENGTHS.map((sessionLength) => {
          const selected = selectedSessionLength === sessionLength;

          return (
            <button
              key={sessionLength}
              onClick={() => setSelectedSessionLength(sessionLength)}
              className={`choice-chip ${selected ? "choice-chip-selected" : ""}`}
            >
              {sessionLength}
            </button>
          );
        })}
      </div>
    </OnboardingShell>
  );
}