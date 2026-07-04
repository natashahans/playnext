"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

const genreOptions = ["Action", "RPG", "Simulation", "Platformer", "Relaxing"];
const platformOptions = ["PC", "PlayStation", "Xbox", "Nintendo Switch"];

export default function SettingsPage() {
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [preferredPlatforms, setPreferredPlatforms] = useState<string[]>([]);
  const [playStyle, setPlayStyle] = useState("");
  const [difficultyPreference, setDifficultyPreference] = useState("");
  const [sessionLengthPreference, setSessionLengthPreference] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchPreferences() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) return;

      const { data } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userData.user.id)
        .single();

      if (data) {
        setFavoriteGenres(data.favorite_genres ?? []);
        setPreferredPlatforms(data.preferred_platforms ?? []);
        setPlayStyle(data.play_style ?? "");
        setDifficultyPreference(data.difficulty_preference ?? "");
        setSessionLengthPreference(data.session_length_preference ?? "");
      }
    }

    fetchPreferences();
  }, []);

  function toggleValue(value: string, current: string[], setter: (items: string[]) => void) {
    if (current.includes(value)) {
      setter(current.filter((item) => item !== value));
    } else {
      setter([...current, value]);
    }
  }

  async function handleSave() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      alert("You must be logged in.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("user_preferences").upsert(
      {
        user_id: userData.user.id,
        favorite_genres: favoriteGenres,
        preferred_platforms: preferredPlatforms,
        play_style: playStyle,
        difficulty_preference: difficultyPreference,
        session_length_preference: sessionLengthPreference,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    alert("Preferences saved.");
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">Settings</p>
        <h1 className="mt-2 text-3xl font-bold">Preferences</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          These preferences will later help PlayNext score games more accurately.
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
            <p className="text-sm font-medium text-slate-300">Preferred platforms</p>
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
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
          >
            <option value="">Select play style</option>
            <option value="story">Story-focused</option>
            <option value="gameplay">Gameplay-focused</option>
            <option value="balanced">Balanced</option>
          </select>

          <select
            value={difficultyPreference}
            onChange={(event) => setDifficultyPreference(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
          >
            <option value="">Select difficulty preference</option>
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
          </select>

          <select
            value={sessionLengthPreference}
            onChange={(event) => setSessionLengthPreference(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
          >
            <option value="">Select session length preference</option>
            <option value="short">Short sessions</option>
            <option value="medium">Medium sessions</option>
            <option value="long">Long sessions</option>
          </select>

          <Button onClick={handleSave}>
            {loading ? "Saving..." : "Save preferences"}
          </Button>
        </div>
      </Card>
    </div>
  );
}