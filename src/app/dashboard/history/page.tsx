"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

type RecommendationSession = {
  id: string;
  user_input: string;
  mood: string | null;
  available_time: number | null;
  energy_level: string | null;
  desired_experience: string | null;
  difficulty_preference: string | null;
  created_at: string;
};

export default function HistoryPage() {
  const [sessions, setSessions] = useState<RecommendationSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("recommendation_sessions")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      setSessions((data ?? []) as RecommendationSession[]);
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
        <h1 className="mt-2 text-3xl font-bold">Recommendation history</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Previous decision-support sessions are stored here so users can review
          what they asked for and how their preferences changed over time.
        </p>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <h2 className="text-xl font-semibold">No sessions yet</h2>
          <p className="mt-2 text-slate-400">
            Start a recommendation session to create your first history entry.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card key={session.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-400">
                    {new Date(session.created_at).toLocaleString()}
                  </p>

                  <h2 className="mt-2 text-xl font-semibold">
                    “{session.user_input}”
                  </h2>
                </div>

                <Badge>Session</Badge>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-xs text-slate-500">Mood</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {session.mood ?? "Pending"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-xs text-slate-500">Time</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {session.available_time
                      ? `${session.available_time} min`
                      : "Pending"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-xs text-slate-500">Energy</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {session.energy_level ?? "Pending"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-xs text-slate-500">Experience</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {session.desired_experience ?? "Pending"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-xs text-slate-500">Difficulty</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {session.difficulty_preference ?? "Pending"}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}