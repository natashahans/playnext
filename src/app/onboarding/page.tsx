"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

const genreOptions = ["Action", "RPG", "Simulation", "Platformer", "Relaxing"];
const platformOptions = ["PC", "PlayStation", "Xbox", "Nintendo Switch"];

export default function OnboardingPage() {
  const router = useRouter();

  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [preferredPlatforms, setPreferredPlatforms] = useState<string[]>([]);
  const [playStyle, setPlayStyle] = useState("");
  const [difficultyPreference, setDifficultyPreference] = useState("");
  const [sessionLengthPreference, setSessionLengthPreference] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleValue(value: string, current: string[], setter: (items: string[]) => void) {
    if (current.includes(value)) {
      setter(current.filter((item) => item !== value));
    } else {
      setter([...current, value]);
    }
  }

  async function handleFinish() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/login");
      return;
    }

    const { error: preferencesError } = await supabase.from("user_preferences").upsert(
      {
        user_id: userData.user.id,
        favorite_genres: favoriteGenres,
        preferred_platforms: preferredPlatforms,
        play_style: playStyle,
        difficulty_preference: difficultyPreference,
        session_length_preference: sessionLengthPreference,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (preferencesError) {
      alert(preferencesError.message);
      setLoading(false);
      return;
    }

    router.push("/onboarding/add-games");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm text-slate-400">Welcome to PlayNext</p>
          <h1 className="mt-2 text-4xl font-bold">Set up your play preferences</h1>
          <p className="mt-3 text-slate-400">
            These answers help PlayNext understand what kind of games fit you.
          </p>
        </div>

        <Card>
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-slate-300">Favourite genres</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {genreOptions.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => toggleValue(genre, favoriteGenres, setFavoriteGenres)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      favoriteGenres.includes(genre)
                        ? "border-white bg-white text-slate-950"
                        : "border-slate-700 bg-slate-950 text-slate-300"
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-300">Platforms</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {platformOptions.map((platform) => (
                  <button
                    key={platform}
                    onClick={() =>
                      toggleValue(platform, preferredPlatforms, setPreferredPlatforms)
                    }
                    className={`rounded-full border px-3 py-1 text-xs ${
                      preferredPlatforms.includes(platform)
                        ? "border-white bg-white text-slate-950"
                        : "border-slate-700 bg-slate-950 text-slate-300"
                    }`}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            <select
              value={playStyle}
              onChange={(event) => setPlayStyle(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
            >
              <option value="">Select play style</option>
              <option value="story">Story-focused</option>
              <option value="gameplay">Gameplay-focused</option>
              <option value="balanced">Balanced</option>
            </select>

            <select
              value={difficultyPreference}
              onChange={(event) => setDifficultyPreference(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
            >
              <option value="">Select difficulty preference</option>
              <option value="easy">Easy</option>
              <option value="normal">Normal</option>
              <option value="hard">Hard</option>
            </select>

            <select
              value={sessionLengthPreference}
              onChange={(event) => setSessionLengthPreference(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
            >
              <option value="">Select session length</option>
              <option value="short">Short sessions</option>
              <option value="medium">Medium sessions</option>
              <option value="long">Long sessions</option>
            </select>

            <Button onClick={handleFinish}>
              {loading ? "Saving..." : "Finish setup"}
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}