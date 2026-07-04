"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

type HistoryItem = {
  id: string;
  user_input: string;
  mood: string | null;
  available_time: number | null;
  energy_level: string | null;
  desired_experience: string | null;
  difficulty_preference: string | null;
  created_at: string;
  recommendations:
    | {
        score: number;
        explanation: string | null;
        games:
          | {
              title: string;
              background_image: string | null;
              genres: string[] | null;
            }
          | {
              title: string;
              background_image: string | null;
              genres: string[] | null;
            }[]
          | null;
      }[]
    | null;
};

export default function HistoryPage() {
  const [sessions, setSessions] = useState<HistoryItem[]>([]);
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
        .select(`
          id,
          user_input,
          mood,
          available_time,
          energy_level,
          desired_experience,
          difficulty_preference,
          created_at,
          recommendations (
            score,
            explanation,
            games (
              title,
              background_image,
              genres
            )
          )
        `)
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      setSessions((data ?? []) as unknown as HistoryItem[]);
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
          Review previous decision-support sessions, extracted context, and the
          game PlayNext selected.
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
          {sessions.map((session) => {
            const recommendation = session.recommendations?.[0];
            const game = Array.isArray(recommendation?.games)
              ? recommendation?.games[0]
              : recommendation?.games;

            return (
              <Card key={session.id}>
                <div className="grid gap-5 lg:grid-cols-[180px_1fr]">
                  {game?.background_image ? (
                    <img
                      src={game.background_image}
                      alt={game.title}
                      className="h-48 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-500">
                      No image
                    </div>
                  )}

                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-400">
                          {new Date(session.created_at).toLocaleString()}
                        </p>

                        <h2 className="mt-2 text-xl font-semibold">
                          {game?.title ?? "No recommendation saved"}
                        </h2>
                      </div>

                      {recommendation && (
                        <Badge>{recommendation.score}% fit</Badge>
                      )}
                    </div>

                    <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
                      “{session.user_input}”
                    </p>

                    {recommendation?.explanation && (
                      <p className="mt-4 text-sm leading-6 text-slate-400">
                        {recommendation.explanation}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge>{session.mood ?? "Mood pending"}</Badge>
                      <Badge>
                        {session.available_time
                          ? `${session.available_time} min`
                          : "Time pending"}
                      </Badge>
                      <Badge>{session.energy_level ?? "Energy pending"}</Badge>
                      <Badge>
                        {session.desired_experience ?? "Experience pending"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}