"use client";

import { useEffect, useState } from "react";
import { Check, Gamepad2, Gauge, Monitor, Settings2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { PLATFORMS } from "@/lib/onboarding";
import { supabase } from "@/lib/supabase";

const genreOptions = [
  "Action",
  "Adventure",
  "RPG",
  "Open World",
  "Shooter",
  "Racing",
  "Sports",
  "Platformer",
  "Strategy",
  "Simulation",
  "Puzzle",
  "Roguelike",
  "Horror",
  "Survival",
  "Cozy",
  "Indie",
];

export default function SettingsPage() {
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [preferredPlatforms, setPreferredPlatforms] = useState<string[]>([]);
  const [playStyle, setPlayStyle] = useState("");
  const [difficultyPreference, setDifficultyPreference] = useState("");
  const [sessionLengthPreference, setSessionLengthPreference] = useState("");
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchPreferences() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user || !active) {
        setLoadingPreferences(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setErrorMessage("We couldn’t load your preferences.");
        setLoadingPreferences(false);
        return;
      }

      if (data) {
        setFavoriteGenres(data.favorite_genres ?? []);
        setPreferredPlatforms(data.preferred_platforms ?? []);
        setPlayStyle(data.play_style ?? "");
        setDifficultyPreference(data.difficulty_preference ?? "");
        setSessionLengthPreference(data.session_length_preference ?? "");
      }

      setLoadingPreferences(false);
    }

    fetchPreferences();

    return () => {
      active = false;
    };
  }, []);

  function toggleGenre(genre: string) {
    setSaved(false);
    setFavoriteGenres((current) => {
      if (current.includes(genre)) return current.filter((item) => item !== genre);
      if (current.length >= 5) return current;
      return [...current, genre];
    });
  }

  function togglePlatform(platform: string) {
    setSaved(false);
    setPreferredPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
  }

  async function handleSave() {
    if (saving) return;

    setSaving(true);
    setSaved(false);
    setErrorMessage("");

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setErrorMessage("Your session has expired. Please log in again.");
      setSaving(false);
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
      { onConflict: "user_id" }
    );

    if (error) {
      setErrorMessage("Your preferences couldn’t be saved. Please try again.");
      setSaving(false);
      return;
    }

    setSaved(true);
    setSaving(false);
  }

  if (loadingPreferences) {
    return (
      <div className="pn-page-loading" role="status">
        <span className="dashboard-loading-dot" aria-hidden="true" />
        Loading your preferences…
      </div>
    );
  }

  return (
    <div className="pn-page settings-page">
      <div className="pn-page-intro">
        <div>
          <span className="pn-kicker">
            <Settings2 size={14} aria-hidden="true" />
            Recommendation preferences
          </span>
          <h2>Shape how PlayNext decides</h2>
          <p>
            These preferences support your live mood and time context. They guide
            recommendations without overriding what you ask for in the moment.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="pn-inline-error" role="alert">
          <strong>Preferences not saved</strong>
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="settings-layout">
        <Card className="settings-section">
          <div className="settings-section-heading">
            <span><Gamepad2 size={17} aria-hidden="true" /></span>
            <div>
              <h3>Favourite genres</h3>
              <p>Choose up to five. {favoriteGenres.length}/5 selected.</p>
            </div>
          </div>

          <div className="settings-chip-grid">
            {genreOptions.map((genre) => {
              const selected = favoriteGenres.includes(genre);
              const unavailable = favoriteGenres.length >= 5 && !selected;

              return (
                <button
                  type="button"
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  disabled={unavailable}
                  aria-pressed={selected}
                  className={selected ? "settings-chip settings-chip-active" : "settings-chip"}
                >
                  {selected && <Check size={12} aria-hidden="true" />}
                  {genre}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="settings-section">
          <div className="settings-section-heading">
            <span><Monitor size={17} aria-hidden="true" /></span>
            <div>
              <h3>Preferred platforms</h3>
              <p>Select every platform you regularly use.</p>
            </div>
          </div>

          <div className="settings-chip-grid">
            {PLATFORMS.map((platform) => {
              const selected = preferredPlatforms.includes(platform);

              return (
                <button
                  type="button"
                  key={platform}
                  onClick={() => togglePlatform(platform)}
                  aria-pressed={selected}
                  className={selected ? "settings-chip settings-chip-active" : "settings-chip"}
                >
                  {selected && <Check size={12} aria-hidden="true" />}
                  {platform}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="settings-section settings-section-wide">
          <div className="settings-section-heading">
            <span><Gauge size={17} aria-hidden="true" /></span>
            <div>
              <h3>Play preferences</h3>
              <p>Use these as tie-breakers when several games fit your context.</p>
            </div>
          </div>

          <div className="settings-fields">
            <label className="pn-form-field">
              <span>Play style</span>
              <select
                value={playStyle}
                onChange={(event) => {
                  setPlayStyle(event.target.value);
                  setSaved(false);
                }}
              >
                <option value="">No preference</option>
                <option value="story">Story-focused</option>
                <option value="gameplay">Gameplay-focused</option>
                <option value="balanced">Balanced</option>
              </select>
            </label>

            <label className="pn-form-field">
              <span>Difficulty</span>
              <select
                value={difficultyPreference}
                onChange={(event) => {
                  setDifficultyPreference(event.target.value);
                  setSaved(false);
                }}
              >
                <option value="">No preference</option>
                <option value="easy">Easy and forgiving</option>
                <option value="normal">Balanced</option>
                <option value="hard">Challenging</option>
              </select>
            </label>

            <label className="pn-form-field">
              <span>Typical session length</span>
              <select
                value={sessionLengthPreference}
                onChange={(event) => {
                  setSessionLengthPreference(event.target.value);
                  setSaved(false);
                }}
              >
                <option value="">No preference</option>
                <option value="short">Short sessions</option>
                <option value="medium">Medium sessions</option>
                <option value="long">Long sessions</option>
              </select>
            </label>
          </div>
        </Card>
      </div>

      <div className="settings-save-bar">
        <div>
          {saved ? (
            <span className="settings-saved-message">
              <Check size={13} aria-hidden="true" />
              Preferences saved
            </span>
          ) : (
            <span>Changes affect future recommendations.</span>
          )}
        </div>
        <Button onClick={handleSave} loading={saving}>
          {saving ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </div>
  );
}
