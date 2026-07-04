"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";

type HistoryItem = {
  id: string;
  created_at: string;
  score: number;
  explanation: string;
  recommendation_sessions: {
    user_input: string;
  } | null;
  games: {
    title: string;
  } | null;
  feedback:
    | {
        feedback_type: string;
      }[]
    | null;
  score_breakdown:
    | {
        label: string;
        points: number;
      }[]
    | null;
};

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) return;

      const { data, error } = await supabase
        .from("recommendations")
        .select(`
          id,
          created_at,
          score,
          explanation,
          score_breakdown,
          games (
            title
          ),
          recommendation_sessions (
            user_input
          ),
          feedback (
            feedback_type
          )
        `)
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      setHistory((data ?? []) as unknown as HistoryItem[]);
      setLoading(false);
    }

    fetchHistory();
  }, []);

  if (loading) {
    return <p className="text-slate-400">Loading history...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">History</p>
        <h1 className="mt-2 text-3xl font-bold">
          Recommendation history
        </h1>
        <p className="mt-3 text-slate-400">
          Every recommendation you've received.
        </p>
      </div>

      <div className="space-y-4">
        {history.map((item) => {
          const feedback = item.feedback?.[0]?.feedback_type;

          return (
            <Card key={item.id}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {item.games?.title}
                </h2>

                <p className="mt-2 text-slate-400">
                  "{item.recommendation_sessions?.user_input}"
                </p>
              </div>

              <Badge>{item.score}% fit</Badge>
            </div>

            <p className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-300">
              {item.explanation}
            </p>

            <p className="mt-4 text-sm text-slate-500">
              {new Date(item.created_at).toLocaleString()}
            </p>

            <p className="mt-3 text-sm text-slate-400">
              Feedback:{" "}
              <span className="text-white">
                {feedback ? feedback.replaceAll("_", " ") : "No feedback yet"}
              </span>
            </p>

            {item.score_breakdown && item.score_breakdown.length > 0 && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {item.score_breakdown.map((scoreItem) => (
                  <div
                    key={scoreItem.label}
                    className="rounded-lg border border-slate-800 bg-slate-950 p-3"
                  >
                    <p className="text-xs text-slate-500">{scoreItem.label}</p>
                    <p
                      className={`mt-1 text-sm font-medium ${
                        scoreItem.points >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {scoreItem.points >= 0 ? "+" : ""}
                      {scoreItem.points}
                    </p>
                  </div>
                ))}
              </div>
            )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}