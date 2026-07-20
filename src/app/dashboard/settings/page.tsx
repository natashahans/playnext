"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  Clock3,
  Feather,
  Flame,
  Gamepad2,
  Gauge,
  KeyRound,
  Monitor,
  RotateCcw,
  Scale,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { GENRES, PLATFORMS } from "@/lib/onboarding";
import { supabase } from "@/lib/supabase";

type AccountInfo = {
  email: string;
  createdAt: string | null;
};

type PreferenceState = {
  favoriteGenres: string[];
  preferredPlatforms: string[];
  playStyle: string;
  difficultyPreference: string;
  sessionLengthPreference: string;
};

const playStyleOptions = [
  { value: "story", label: "Story-focused", description: "Characters, world and narrative come first.", icon: BookOpen },
  { value: "gameplay", label: "Gameplay-focused", description: "Mechanics, challenge and moment-to-moment play.", icon: Gamepad2 },
  { value: "balanced", label: "Balanced", description: "A strong mix of story and gameplay.", icon: Scale },
] as const;

const difficultyOptions = [
  { value: "easy", label: "Forgiving", description: "Relaxed challenge and lower friction.", icon: Feather },
  { value: "normal", label: "Balanced", description: "A fair challenge without being punishing.", icon: Gauge },
  { value: "hard", label: "Challenging", description: "Demanding games that reward mastery.", icon: Flame },
] as const;

const sessionOptions = [
  { value: "short", label: "Short", description: "Usually under 45 minutes.", icon: Clock3 },
  { value: "medium", label: "Medium", description: "Around one to two hours.", icon: Target },
  { value: "long", label: "Long", description: "Deep sessions of two hours or more.", icon: Sparkles },
] as const;

function serializePreferences(state: PreferenceState) {
  return JSON.stringify({
    ...state,
    favoriteGenres: [...state.favoriteGenres].sort(),
    preferredPlatforms: [...state.preferredPlatforms].sort(),
  });
}

export default function SettingsPage() {
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [preferredPlatforms, setPreferredPlatforms] = useState<string[]>([]);
  const [playStyle, setPlayStyle] = useState("");
  const [difficultyPreference, setDifficultyPreference] = useState("");
  const [sessionLengthPreference, setSessionLengthPreference] = useState("");
  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [initialDisplayName, setInitialDisplayName] = useState("");
  const [account, setAccount] = useState<AccountInfo>({ email: "", createdAt: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchSettings() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || !active) {
        setLoading(false);
        return;
      }

      const [preferencesResult, profileResult] = await Promise.all([
        supabase.from("user_preferences").select("*").eq("user_id", userData.user.id).maybeSingle(),
        supabase.from("profiles").select("email, created_at").eq("id", userData.user.id).maybeSingle(),
      ]);

      if (!active) return;

      if (preferencesResult.error || profileResult.error) {
        setErrorMessage("We couldn’t load all of your settings.");
      }

      const data = preferencesResult.data;
      const loaded: PreferenceState = {
        favoriteGenres: data?.favorite_genres ?? [],
        preferredPlatforms: data?.preferred_platforms ?? [],
        playStyle: data?.play_style ?? "",
        difficultyPreference: data?.difficulty_preference ?? "",
        sessionLengthPreference: data?.session_length_preference ?? "",
      };

      setFavoriteGenres(loaded.favoriteGenres);
      setPreferredPlatforms(loaded.preferredPlatforms);
      setPlayStyle(loaded.playStyle);
      setDifficultyPreference(loaded.difficultyPreference);
      setSessionLengthPreference(loaded.sessionLengthPreference);
      setInitialSnapshot(serializePreferences(loaded));
      const loadedName = typeof userData.user.user_metadata?.full_name === "string"
        ? userData.user.user_metadata.full_name.trim().slice(0, 80)
        : "";
      setDisplayName(loadedName);
      setInitialDisplayName(loadedName);
      setAccount({
        email: profileResult.data?.email ?? userData.user.email ?? "No email available",
        createdAt: profileResult.data?.created_at ?? userData.user.created_at ?? null,
      });
      setLoading(false);
    }

    fetchSettings();
    return () => { active = false; };
  }, []);

  const currentPreferences = useMemo<PreferenceState>(() => ({
    favoriteGenres,
    preferredPlatforms,
    playStyle,
    difficultyPreference,
    sessionLengthPreference,
  }), [favoriteGenres, preferredPlatforms, playStyle, difficultyPreference, sessionLengthPreference]);

  const hasChanges = initialSnapshot !== "" && (
    serializePreferences(currentPreferences) !== initialSnapshot ||
    displayName.trim() !== initialDisplayName
  );

  const profileStrength = useMemo(() => {
    const signals = [
      favoriteGenres.length > 0,
      preferredPlatforms.length > 0,
      Boolean(playStyle),
      Boolean(difficultyPreference),
      Boolean(sessionLengthPreference),
    ];
    return Math.round((signals.filter(Boolean).length / signals.length) * 100);
  }, [favoriteGenres, preferredPlatforms, playStyle, difficultyPreference, sessionLengthPreference]);

  function markChanged() {
    setSaved(false);
    setErrorMessage("");
  }

  function toggleGenre(genre: string) {
    markChanged();
    setFavoriteGenres((current) => {
      if (current.includes(genre)) return current.filter((item) => item !== genre);
      if (current.length >= 5) return current;
      return [...current, genre];
    });
  }

  function togglePlatform(platform: string) {
    markChanged();
    setPreferredPlatforms((current) => current.includes(platform)
      ? current.filter((item) => item !== platform)
      : [...current, platform]
    );
  }

  function resetPreferences() {
    setFavoriteGenres([]);
    setPreferredPlatforms([]);
    setPlayStyle("");
    setDifficultyPreference("");
    setSessionLengthPreference("");
    setSaved(false);
    setErrorMessage("");
  }

  async function handleSave() {
    if (saving || !hasChanges) return;
    setSaving(true);
    setSaved(false);
    setErrorMessage("");

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setErrorMessage("Your session has expired. Please log in again.");
      setSaving(false);
      return;
    }

    const cleanedDisplayName = displayName.trim().slice(0, 80);
    if (!cleanedDisplayName) {
      setErrorMessage("Please enter the name PlayNext should use for you.");
      setSaving(false);
      return;
    }

    const [preferencesResult, accountResult] = await Promise.all([
      supabase.from("user_preferences").upsert({
        user_id: userData.user.id,
        favorite_genres: favoriteGenres,
        preferred_platforms: preferredPlatforms,
        play_style: playStyle,
        difficulty_preference: difficultyPreference,
        session_length_preference: sessionLengthPreference,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" }),
      supabase.auth.updateUser({ data: { full_name: cleanedDisplayName } }),
    ]);

    if (preferencesResult.error || accountResult.error) {
      setErrorMessage("Your settings couldn’t be saved completely. Please try again.");
    } else {
      setInitialSnapshot(serializePreferences(currentPreferences));
      setDisplayName(cleanedDisplayName);
      setInitialDisplayName(cleanedDisplayName);
      setSaved(true);
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="pn-page-loading" role="status"><span className="dashboard-loading-dot" />Loading your settings…</div>;
  }

  return (
    <div className="lib-page settings-v2">
      <header className="lib-page-header">
        <div>
          <span className="lib-kicker"><Settings2 size={14} /> Settings</span>
          <h1>Build a recommendation profile that feels like you.</h1>
          <p>These are long-term preferences, used as supporting signals. What you ask for in the moment still takes priority.</p>
        </div>
      </header>

      {errorMessage && <div className="lib-inline-error" role="alert"><strong>Settings need attention</strong><span>{errorMessage}</span></div>}

      <div className="settings-v2-layout">
        <aside className="settings-v2-sidebar">
          <section className="settings-profile-card">
            <div className="settings-avatar"><UserRound size={25} /></div>
            <span>Signed-in account</span>
            <label className="settings-name-field">
              <span>Display name</span>
              <input
                type="text"
                value={displayName}
                maxLength={80}
                autoComplete="name"
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  markChanged();
                }}
                placeholder="Your name"
              />
            </label>
            <h2>{account.email}</h2>
            <p>{account.createdAt ? `Member since ${new Date(account.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}` : "PlayNext member"}</p>

            <div className="settings-strength">
              <div><span>Recommendation profile</span><strong>{profileStrength}%</strong></div>
              <i><b style={{ width: `${profileStrength}%` }} /></i>
              <p>{profileStrength === 100 ? "Your preference profile is complete." : "Add more preferences for stronger tie-breaking."}</p>
            </div>

            <div className="settings-profile-summary">
              <span><Gamepad2 size={14} /> {favoriteGenres.length} favourite genres</span>
              <span><Monitor size={14} /> {preferredPlatforms.length} platforms</span>
              <span><SlidersHorizontal size={14} /> {playStyle || "No play style"}</span>
            </div>

            <Button href="/login/forgot-password" variant="secondary"><KeyRound size={14} /> Change password</Button>
          </section>

          <section className="settings-principle-card">
            <ShieldCheck size={19} />
            <div><strong>Live context comes first</strong><p>Mood, time and energy from the Decide conversation can override these defaults.</p></div>
          </section>
        </aside>

        <main className="settings-v2-main">
          <section className="settings-v2-section">
            <div className="settings-v2-heading">
              <span><Gamepad2 size={18} /></span>
              <div><small>Taste profile</small><h2>Favourite genres</h2><p>Choose up to five genres PlayNext should recognise as your long-term taste.</p></div>
              <strong>{favoriteGenres.length}/5</strong>
            </div>
            <div className="settings-v2-chip-grid">
              {GENRES.map((genre) => {
                const selected = favoriteGenres.includes(genre);
                const unavailable = favoriteGenres.length >= 5 && !selected;
                return <button type="button" key={genre} disabled={unavailable} aria-pressed={selected} className={selected ? "is-active" : ""} onClick={() => toggleGenre(genre)}>{selected && <Check size={13} />}{genre}</button>;
              })}
            </div>
          </section>

          <section className="settings-v2-section">
            <div className="settings-v2-heading">
              <span><Monitor size={18} /></span>
              <div><small>Availability</small><h2>Preferred platforms</h2><p>Select the platforms you can realistically play on.</p></div>
            </div>
            <div className="settings-platform-grid">
              {PLATFORMS.map((platform) => {
                const selected = preferredPlatforms.includes(platform);
                return <button type="button" key={platform} aria-pressed={selected} className={selected ? "is-active" : ""} onClick={() => togglePlatform(platform)}><span><Monitor size={18} /></span><div><strong>{platform}</strong><small>{selected ? "Included in recommendations" : "Not currently preferred"}</small></div>{selected && <Check size={15} />}</button>;
              })}
            </div>
          </section>

          <section className="settings-v2-section">
            <div className="settings-v2-heading">
              <span><SlidersHorizontal size={18} /></span>
              <div><small>Recommendation defaults</small><h2>How you usually like to play</h2><p>These settings act as tie-breakers when several games fit equally well.</p></div>
            </div>

            <div className="settings-choice-group">
              <div><strong>Play style</strong><button type="button" onClick={() => { setPlayStyle(""); markChanged(); }}>Clear</button></div>
              <div className="settings-choice-grid">
                {playStyleOptions.map((option) => {
                  const Icon = option.icon;
                  return <button type="button" key={option.value} aria-pressed={playStyle === option.value} className={playStyle === option.value ? "is-active" : ""} onClick={() => { setPlayStyle(option.value); markChanged(); }}><Icon size={18} /><strong>{option.label}</strong><span>{option.description}</span>{playStyle === option.value && <Check size={14} />}</button>;
                })}
              </div>
            </div>

            <div className="settings-choice-group">
              <div><strong>Difficulty</strong><button type="button" onClick={() => { setDifficultyPreference(""); markChanged(); }}>Clear</button></div>
              <div className="settings-choice-grid">
                {difficultyOptions.map((option) => {
                  const Icon = option.icon;
                  return <button type="button" key={option.value} aria-pressed={difficultyPreference === option.value} className={difficultyPreference === option.value ? "is-active" : ""} onClick={() => { setDifficultyPreference(option.value); markChanged(); }}><Icon size={18} /><strong>{option.label}</strong><span>{option.description}</span>{difficultyPreference === option.value && <Check size={14} />}</button>;
                })}
              </div>
            </div>

            <div className="settings-choice-group">
              <div><strong>Typical session length</strong><button type="button" onClick={() => { setSessionLengthPreference(""); markChanged(); }}>Clear</button></div>
              <div className="settings-choice-grid">
                {sessionOptions.map((option) => {
                  const Icon = option.icon;
                  return <button type="button" key={option.value} aria-pressed={sessionLengthPreference === option.value} className={sessionLengthPreference === option.value ? "is-active" : ""} onClick={() => { setSessionLengthPreference(option.value); markChanged(); }}><Icon size={18} /><strong>{option.label}</strong><span>{option.description}</span>{sessionLengthPreference === option.value && <Check size={14} />}</button>;
                })}
              </div>
            </div>
          </section>

          <section className="settings-reset-card">
            <div><RotateCcw size={18} /><span><strong>Reset recommendation preferences</strong><p>Clear your saved taste defaults and rely only on live conversation context.</p></span></div>
            <Button variant="secondary" onClick={resetPreferences}>Reset preferences</Button>
          </section>
        </main>
      </div>

      <div className="settings-v2-savebar">
        <div>
          {saved ? <span className="is-saved"><Check size={15} /> Settings saved successfully</span> : hasChanges ? <span><Sparkles size={15} /> You have unsaved changes</span> : <span>Everything is up to date</span>}
          <small>Changes affect future recommendations, not past history.</small>
        </div>
        <Button onClick={handleSave} loading={saving} disabled={!hasChanges}>{saving ? "Saving…" : "Save changes"}</Button>
      </div>
    </div>
  );
}
