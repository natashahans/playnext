"use client";

import { useEffect, useState } from "react";
import { Ban, Check, Clock3, Gauge, Meh, ThumbsUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

const feedbackOptions = [
  {
    type: "liked",
    label: "Great match",
    icon: ThumbsUp,
    impact: "Adds a positive signal for this game and similar games.",
  },
  {
    type: "not_in_mood",
    label: "Not my mood",
    icon: Meh,
    impact: "Temporarily lowers this game. It can return when your mood or request changes.",
  },
  {
    type: "too_long",
    label: "Too long",
    icon: Clock3,
    impact: "Lowers long games only when you ask for a shorter session.",
  },
  {
    type: "too_difficult",
    label: "Too difficult",
    icon: Gauge,
    impact: "Lowers difficult games unless you later ask for a challenging session.",
  },
  {
    type: "not_interested",
    label: "Not interested",
    icon: Ban,
    impact: "Adds a stronger preference signal, but it still fades over time.",
  },
] as const;

export default function FeedbackButtons({ recommendationId }: { recommendationId: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadExistingFeedback() {
      const { data } = await supabase
        .from("feedback")
        .select("feedback_type, reason")
        .eq("recommendation_id", recommendationId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;

      if (data) {
        setSelected(data.feedback_type);
        setReason(data.reason ?? "");
        setSaved(true);
      }
      setChecking(false);
    }

    loadExistingFeedback();
    return () => { active = false; };
  }, [recommendationId]);

  async function handleSave() {
    if (!selected || saving || saved) return;

    setSaving(true);
    setErrorMessage("");

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setErrorMessage("Your session has expired. Please log in again.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("feedback").insert({
      user_id: userData.user.id,
      recommendation_id: recommendationId,
      feedback_type: selected,
      reason: reason.trim() || null,
    });

    if (error) {
      setErrorMessage("Your feedback could not be saved. Please try again.");
      setSaving(false);
      return;
    }

    setSaved(true);
    setSaving(false);
  }

  const selectedOption = feedbackOptions.find((option) => option.type === selected);

  if (checking) {
    return <div className="ai-feedback-loading">Checking saved feedback…</div>;
  }

  if (saved && selectedOption) {
    return (
      <div className="ai-feedback-success" role="status">
        <Check size={17} aria-hidden="true" />
        <div>
          <strong>Feedback saved · {selectedOption.label}</strong>
          <span>{selectedOption.impact}</span>
        </div>
      </div>
    );
  }

  return (
    <section className="ai-feedback">
      <div className="ai-feedback-heading">
        <div>
          <span>Improve future recommendations</span>
          <h3>How did this recommendation feel?</h3>
        </div>
        <p>Choose the reason that best describes this result.</p>
      </div>

      <div className="ai-feedback-options">
        {feedbackOptions.map((option) => {
          const Icon = option.icon;
          return (
            <button
              type="button"
              key={option.type}
              onClick={() => {
                setSelected(option.type);
                setErrorMessage("");
              }}
              aria-pressed={selected === option.type}
              className={selected === option.type ? "ai-feedback-option ai-feedback-option-active" : "ai-feedback-option"}
            >
              <Icon size={14} aria-hidden="true" />
              {option.label}
            </button>
          );
        })}
      </div>

      {selectedOption && (
        <div className="ai-feedback-detail">
          <p className="ai-feedback-impact"><Check size={13} /> {selectedOption.impact}</p>

          {selectedOption.type !== "liked" && (
            <>
              <label htmlFor="feedback-reason">Optional note <span>Useful for reviewing why this result missed</span></label>
              <textarea
                id="feedback-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="For example: I wanted less combat tonight…"
                maxLength={240}
              />
            </>
          )}

          <div>
            <span>{selectedOption.type === "liked" ? "The selected reason controls ranking." : `${reason.length}/240 · The selected reason controls ranking.`}</span>
            <button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save feedback"}
            </button>
          </div>
        </div>
      )}

      {errorMessage && <p className="ai-feedback-error" role="alert">{errorMessage}</p>}
    </section>
  );
}
