"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Check,
  RotateCcw,
  Sparkles,
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

type EditorKey = "favoriteGenres" | "preferredPlatforms";

function serializePreferences(state: PreferenceState) {
  return JSON.stringify({
    ...state,
    favoriteGenres: [...state.favoriteGenres].sort(),
    preferredPlatforms: [...state.preferredPlatforms].sort(),
  });
}

function renderPreferenceSummary(items: string[], maxVisible = 3): ReactNode {
  if (items.length === 0) return "Not set";
  if (items.length <= maxVisible) return items.join(" • ");

  const visible = items.slice(0, maxVisible).join(" • ");
  const remaining = items.length - maxVisible;

  return (
    <>
      <span>{visible}</span>
      <small>+{remaining} more</small>
    </>
  );
}

export default function SettingsPage() {
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [preferredPlatforms, setPreferredPlatforms] = useState<string[]>([]);
  const [playStyle, setPlayStyle] = useState("");
  const [difficultyPreference, setDifficultyPreference] = useState("");
  const [sessionLengthPreference, setSessionLengthPreference] = useState("");
  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [account, setAccount] = useState<AccountInfo>({ email: "", createdAt: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeEditor, setActiveEditor] = useState<EditorKey | null>(null);
  const [draftGenres, setDraftGenres] = useState<string[]>([]);
  const [draftPlatforms, setDraftPlatforms] = useState<string[]>([]);

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
      setAccount({
        email: profileResult.data?.email ?? userData.user.email ?? "No email available",
        createdAt: profileResult.data?.created_at ?? userData.user.created_at ?? null,
      });
      setLoading(false);
    }

    fetchSettings();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!activeEditor) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveEditor(null);
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [activeEditor]);

  const currentPreferences = useMemo<PreferenceState>(() => ({
    favoriteGenres,
    preferredPlatforms,
    playStyle,
    difficultyPreference,
    sessionLengthPreference,
  }), [favoriteGenres, preferredPlatforms, playStyle, difficultyPreference, sessionLengthPreference]);

  const hasChanges = initialSnapshot !== "" && serializePreferences(currentPreferences) !== initialSnapshot;
  const favoriteGenresSummary = renderPreferenceSummary(favoriteGenres);
  const preferredPlatformsSummary = renderPreferenceSummary(preferredPlatforms);

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

  function openEditor(editor: EditorKey) {
    if (editor === "favoriteGenres") {
      setDraftGenres(favoriteGenres);
    } else {
      setDraftPlatforms(preferredPlatforms);
    }
    setActiveEditor(editor);
  }

  function toggleDraftGenre(genre: string) {
    setDraftGenres((current) => {
      if (current.includes(genre)) return current.filter((item) => item !== genre);
      if (current.length >= 5) return current;
      return [...current, genre];
    });
  }

  function toggleDraftPlatform(platform: string) {
    setDraftPlatforms((current) => current.includes(platform)
      ? current.filter((item) => item !== platform)
      : [...current, platform]
    );
  }

  function applyEditor() {
    if (!activeEditor) return;

    if (activeEditor === "favoriteGenres") {
      const changed = serializePreferences({
        ...currentPreferences,
        favoriteGenres: draftGenres,
      }) !== serializePreferences(currentPreferences);
      if (changed) {
        setFavoriteGenres(draftGenres);
        markChanged();
      }
    }

    if (activeEditor === "preferredPlatforms") {
      const changed = serializePreferences({
        ...currentPreferences,
        preferredPlatforms: draftPlatforms,
      }) !== serializePreferences(currentPreferences);
      if (changed) {
        setPreferredPlatforms(draftPlatforms);
        markChanged();
      }
    }

    setActiveEditor(null);
  }

  function resetPreferences() {
    setFavoriteGenres([]);
    setPreferredPlatforms([]);
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

    const { error } = await supabase.from("user_preferences").upsert({
      user_id: userData.user.id,
      favorite_genres: favoriteGenres,
      preferred_platforms: preferredPlatforms,
      play_style: playStyle,
      difficulty_preference: difficultyPreference,
      session_length_preference: sessionLengthPreference,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (error) {
      setErrorMessage("Your settings couldn’t be saved completely. Please try again.");
    } else {
      setInitialSnapshot(serializePreferences(currentPreferences));
      setSaved(true);
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="pn-page-loading" role="status"><span className="dashboard-loading-dot" />Loading your settings…</div>;
  }

  const accountName = displayName || account.email.split("@")[0] || "Player";
  const accountInitial = accountName.trim().charAt(0).toUpperCase() || "P";

  const editorTitle = activeEditor === "favoriteGenres"
    ? "Favourite genres"
    : "Preferred platforms";

  const editorDescription = activeEditor === "favoriteGenres"
    ? "Choose up to five genres you enjoy the most."
    : "Select the platforms you can play on.";

  return (
    <div className="lib-page settings-summary-page">
      <header className="lib-page-header settings-summary-header">
        <div>
          <h1>Settings</h1>
          <p>Manage the preferences PlayNext uses when choosing games for you.</p>
        </div>
      </header>

      {errorMessage && <div className="lib-inline-error" role="alert"><strong>Settings need attention</strong><span>{errorMessage}</span></div>}

      <section className="settings-summary-account" aria-label="Account">
        <div className="settings-summary-account-avatar" aria-hidden="true">{accountInitial}</div>
        <div className="settings-summary-account-copy">
          <strong>{accountName}</strong>
          <span>{account.email}</span>
          <small>{account.createdAt ? `Member since ${new Date(account.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}` : "PlayNext member"}</small>
        </div>
      </section>

      <main className="settings-summary-main">
        <section className="settings-summary-card" aria-label="Settings summary">
          <header className="settings-summary-card-head">
            <h2>Recommendation preferences</h2>
            <p>These defaults help PlayNext narrow down relevant games before considering your live mood, time and context.</p>
          </header>

          <button
            type="button"
            className="settings-summary-row"
            onClick={() => openEditor("favoriteGenres")}
          >
            <div>
              <h3>Favourite genres</h3>
              <p>{favoriteGenresSummary}</p>
            </div>
            <span className="settings-summary-edit">Edit <span aria-hidden="true">→</span></span>
          </button>

          <button
            type="button"
            className="settings-summary-row"
            onClick={() => openEditor("preferredPlatforms")}
          >
            <div>
              <h3>Preferred platforms</h3>
              <p>{preferredPlatformsSummary}</p>
            </div>
            <span className="settings-summary-edit">Edit <span aria-hidden="true">→</span></span>
          </button>
        </section>

        <section className="settings-summary-reset" aria-label="Reset recommendation preferences">
          <div>
            <strong>Reset recommendation preferences</strong>
            <p>Clear your saved defaults and rely only on live conversation context.</p>
          </div>
          <Button variant="secondary" onClick={resetPreferences}><RotateCcw size={14} /> Reset preferences</Button>
        </section>
      </main>

      {activeEditor && (
        <div className="settings-editor-overlay" role="dialog" aria-modal="true" aria-labelledby="settings-editor-title" onClick={() => setActiveEditor(null)}>
          <section className="settings-editor-panel" onClick={(event) => event.stopPropagation()}>
            <header className="settings-editor-header">
              <div>
                <h2 id="settings-editor-title">{editorTitle}</h2>
                <p>{editorDescription}</p>
              </div>
              <button type="button" className="settings-editor-close" onClick={() => setActiveEditor(null)}>Cancel</button>
            </header>

            <div className="settings-editor-body">
              {activeEditor === "favoriteGenres" && (
                <>
                  <div className="settings-editor-meta"><strong>{draftGenres.length}/5 selected</strong></div>
                  <div className="settings-v2-chip-grid settings-editor-chips">
                    {GENRES.map((genre) => {
                      const selected = draftGenres.includes(genre);
                      const unavailable = draftGenres.length >= 5 && !selected;
                      return (
                        <button type="button" key={genre} disabled={unavailable} aria-pressed={selected} className={selected ? "is-active" : ""} onClick={() => toggleDraftGenre(genre)}>
                          {selected && <Check size={13} />}
                          {genre}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {activeEditor === "preferredPlatforms" && (
                <div className="settings-platform-grid settings-editor-platforms">
                  {PLATFORMS.map((platform) => {
                    const selected = draftPlatforms.includes(platform);
                    return (
                      <button type="button" key={platform} aria-pressed={selected} className={selected ? "is-active" : ""} onClick={() => toggleDraftPlatform(platform)}>
                        <span>{platform.slice(0, 1)}</span>
                        <div>
                          <strong>{platform}</strong>
                          <small>{selected ? "Included in recommendations" : "Not currently preferred"}</small>
                        </div>
                        {selected && <Check size={15} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

              <footer className="settings-editor-footer">
                <Button variant="secondary" onClick={() => setActiveEditor(null)}>Cancel</Button>
                <Button onClick={applyEditor}>Done</Button>
              </footer>
          </section>
        </div>
      )}

      <div className={`settings-v2-savebar ${hasChanges ? "is-active" : "is-idle"}`}>
        <div>
          {saved ? <span className="is-saved"><Check size={15} /> Settings saved successfully</span> : hasChanges ? <span><Sparkles size={15} /> You have unsaved changes</span> : <span>Everything is up to date</span>}
        </div>
        <Button onClick={handleSave} loading={saving} disabled={!hasChanges}>{saving ? "Saving…" : "Save changes"}</Button>
      </div>
    </div>
  );
}
