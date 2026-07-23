"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Ban, Check, Clock3, Gauge, Meh, ThumbsUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

const feedbackOptions = [
  { type: "liked", label: "Great match", icon: ThumbsUp },
  { type: "not_in_mood", label: "Not my mood", icon: Meh },
  { type: "too_long", label: "Too long", icon: Clock3 },
  { type: "too_difficult", label: "Too difficult", icon: Gauge },
  { type: "not_interested", label: "Not interested", icon: Ban },
] as const;

type FeedbackType = (typeof feedbackOptions)[number]["type"];

type FeedbackButtonsProps = {
  recommendationId: string;
  onSaved?: (feedbackType: string) => void;
  onFindAnother?: () => void;
};

function withTimeout<T>(task: PromiseLike<T>, milliseconds = 12_000): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    Promise.resolve(task),
    new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error("The request timed out.")), milliseconds);
    }),
  ]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

export default function FeedbackButtons({ recommendationId, onSaved, onFindAnother }: FeedbackButtonsProps) {
  const [selected, setSelected] = useState<FeedbackType | null>(null);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState<FeedbackType | null>(null);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadExistingFeedback() {
      try {
        const { data } = await withTimeout(
          supabase
            .from("feedback")
            .select("feedback_type")
            .eq("recommendation_id", recommendationId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        );

        if (active && data?.feedback_type) {
          setSelected(data.feedback_type as FeedbackType);
          setSaved(true);
        }
      } catch {
        if (active) setErrorMessage("Feedback status is unavailable.");
      } finally {
        if (active) setChecking(false);
      }
    }

    loadExistingFeedback();
    return () => {
      active = false;
    };
  }, [recommendationId]);

  async function saveFeedback(feedbackType: FeedbackType) {
    if (saving || saved) return;

    setSelected(feedbackType);
    setSaving(feedbackType);
    setErrorMessage("");

    try {
      const { data: userData } = await withTimeout(supabase.auth.getUser());
      if (!userData.user) throw new Error("Your session has expired.");

      const { error } = await withTimeout(
        supabase.from("feedback").insert({
          user_id: userData.user.id,
          recommendation_id: recommendationId,
          feedback_type: feedbackType,
          reason: null,
        })
      );

      if (error && error.code !== "23505") throw error;

      setSaved(true);
      onSaved?.(feedbackType);
    } catch {
      setSelected(null);
      setErrorMessage("Feedback could not be saved. Try again.");
    } finally {
      setSaving(null);
    }
  }

  const selectedLabel = feedbackOptions.find((option) => option.type === selected)?.label;

  if (checking) {
    return <div className="ai-feedback-loading">Loading feedback…</div>;
  }

  return (
    <section className="ai-feedback ai-feedback-compact" aria-label="Recommendation feedback">
      <div className="ai-feedback-heading">
        <div>
          <span>Quick feedback</span>
          <h3>Was this a good call?</h3>
        </div>
      </div>

      <div className="ai-feedback-row">
        <div className="ai-feedback-options">
          {feedbackOptions.map((option) => {
            const Icon = option.icon;
            const active = selected === option.type;
            return (
              <button
                type="button"
                key={option.type}
                onClick={() => saveFeedback(option.type)}
                disabled={Boolean(saving) || saved}
                aria-pressed={active}
                className={active ? "ai-feedback-option ai-feedback-option-active" : "ai-feedback-option"}
              >
                {active && saved ? <Check size={14} aria-hidden="true" /> : <Icon size={14} aria-hidden="true" />}
                {saving === option.type ? "Saving…" : option.label}
              </button>
            );
          })}
        </div>

        <div className="ai-feedback-status" aria-live="polite">
          {saved && selectedLabel ? <span><Check size={14} /> Feedback saved</span> : null}
          {saved && selected !== "liked" && onFindAnother ? (
            <button type="button" onClick={onFindAnother}>Try another <ArrowRight size={13} /></button>
          ) : null}
        </div>
      </div>

      {errorMessage ? <p className="ai-feedback-error" role="alert">{errorMessage}</p> : null}
    </section>
  );
}
