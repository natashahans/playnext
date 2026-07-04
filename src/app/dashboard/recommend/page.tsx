"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { mockExtractIntent, type ExtractedIntent } from "@/lib/mockIntentExtraction";
import { supabase } from "@/lib/supabase";

export default function RecommendPage() {
  const [prompt, setPrompt] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [extractedIntent, setExtractedIntent] =
    useState<ExtractedIntent | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      alert("You must be logged in.");
      setLoading(false);
      return;
    }

    const intent = mockExtractIntent(prompt);

    const { error } = await supabase.from("recommendation_sessions").insert({
      user_id: userData.user.id,
      user_input: prompt,
      mood: intent.mood,
      available_time: intent.availableTime,
      energy_level: intent.energyLevel,
      desired_experience: intent.desiredExperience,
      difficulty_preference: intent.difficultyPreference,
      preferred_genres: intent.preferredGenres,
      reference_games: intent.referenceGames,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setSubmittedPrompt(prompt);
    setExtractedIntent(intent);
    setPrompt("");
    setLoading(false);
  }

  const intentItems = extractedIntent
    ? [
        ["Mood", extractedIntent.mood],
        [
          "Available time",
          extractedIntent.availableTime
            ? `${extractedIntent.availableTime} minutes`
            : "Unknown",
        ],
        ["Energy level", extractedIntent.energyLevel],
        ["Desired experience", extractedIntent.desiredExperience],
        ["Difficulty preference", extractedIntent.difficultyPreference],
        [
          "Reference games",
          extractedIntent.referenceGames.length > 0
            ? extractedIntent.referenceGames.join(", ")
            : "None",
        ],
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">Decide</p>
        <h1 className="mt-2 text-3xl font-bold">
          What should I play right now?
        </h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Describe your current mood, available time, energy level, and what
          kind of experience you want. This mock version extracts structured
          intent before the real AI integration is added.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-300">
            Describe your current context
          </label>

          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Example: I'm tired, I only have 45 minutes, and I want something relaxing and not too difficult."
            className="min-h-36 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500"
            required
          />

          <Button>{loading ? "Saving..." : "Continue"}</Button>
        </form>
      </Card>

      {submittedPrompt && extractedIntent && (
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Saved session</p>
              <h2 className="mt-2 text-xl font-semibold">
                Structured intent extracted
              </h2>
            </div>

            <Badge>Mock extraction</Badge>
          </div>

          <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-300">
            “{submittedPrompt}”
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {intentItems.map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <p className="text-sm text-slate-400">{label}</p>
                <p className="mt-1 text-sm text-white">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}