"use client";

import { useState } from "react";
import {
  Ban,
  Check,
  Clock3,
  Gauge,
  Meh,
  ThumbsUp,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const feedbackOptions = [
  { type: "liked", label: "Great match", icon: ThumbsUp },
  { type: "not_in_mood", label: "Not my mood", icon: Meh },
  { type: "too_long", label: "Too long", icon: Clock3 },
  { type: "too_difficult", label: "Too difficult", icon: Gauge },
  { type: "not_interested", label: "Not interested", icon: Ban },
];

export default function FeedbackButtons({
  recommendationId,
}: {
  recommendationId: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

  if (saved) {
    return (
      <div className="ai-feedback-success" role="status">
        <Check size={16} aria-hidden="true" />
        <div>
          <strong>Feedback saved</strong>
          <span>Future recommendations will use this signal.</span>
        </div>
      </div>
    );
  }

  return (
    <section className="ai-feedback">
      <div className="ai-feedback-heading">
        <div>
          <span>Teach PlayNext</span>
          <h3>Was this recommendation useful?</h3>
        </div>
        <p>Your response becomes a weighted signal next time.</p>
      </div>

      <div className="ai-feedback-options">
        {feedbackOptions.map((option) => {
          const Icon = option.icon;
          return (
            <button
              type="button"
              key={option.type}
              onClick={() => setSelected(option.type)}
              aria-pressed={selected === option.type}
              className={selected === option.type ? "ai-feedback-option ai-feedback-option-active" : "ai-feedback-option"}
            >
              <Icon size={14} aria-hidden="true" />
              {option.label}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="ai-feedback-detail">
          <label htmlFor="feedback-reason">Anything else? <span>Optional</span></label>
          <textarea
            id="feedback-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="For example: I wanted less combat tonight…"
            maxLength={240}
          />
          <div>
            <span>{reason.length}/240</span>
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
