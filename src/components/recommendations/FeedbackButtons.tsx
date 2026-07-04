"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const feedbackOptions = [
  { type: "liked", label: "Liked" },
  { type: "not_in_mood", label: "Not in mood" },
  { type: "too_long", label: "Too long" },
  { type: "too_difficult", label: "Too difficult" },
  { type: "not_interested", label: "Not interested" },
];

export default function FeedbackButtons({
  recommendationId,
}: {
  recommendationId: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  async function handleFeedback(type: string) {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      alert("You must be logged in.");
      return;
    }

    const { error } = await supabase.from("feedback").insert({
      user_id: userData.user.id,
      recommendation_id: recommendationId,
      feedback_type: type,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setSelected(type);
  }

  return (
    <div className="mt-6">
      <p className="text-sm text-slate-400">Was this recommendation useful?</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {feedbackOptions.map((option) => (
          <button
            key={option.type}
            onClick={() => handleFeedback(option.type)}
            disabled={selected !== null}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              selected === option.type
                ? "border-white bg-white text-slate-950"
                : "border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {selected && (
        <p className="mt-3 text-sm text-slate-500">
          Feedback saved. This will help improve future recommendations.
        </p>
      )}
    </div>
  );
}