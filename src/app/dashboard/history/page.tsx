"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CalendarDays, ChevronDown, Clock3, Compass, Gamepad2, History, Library } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

type Relation<T> = T | T[] | null;

type HistoryItem = {
  id: string;
  created_at: string;
  score: number;
  explanation: string;
  recommendation_sessions: Relation<{
    user_input: string;
    recommendation_mode: "collection" | "discovery";
  }>;
  games: Relation<{ title: string; background_image: string | null }>;
  feedback: { feedback_type: string }[] | null;
  score_breakdown: { label: string; points: number }[] | null;
};

function one<T>(relation: Relation<T>) {
  return Array.isArray(relation) ? relation[0] : relation;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchHistory() {
      const { data: userData } = await supabase.auth.getUser();

      if (!active) return;

      if (!userData.user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("recommendations")
        .select(`
          id,
          created_at,
          score,
          explanation,
          score_breakdown,
          games ( title, background_image ),
          recommendation_sessions ( user_input, recommendation_mode ),
          feedback ( feedback_type )
        `)
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (error) {
        setErrorMessage("We couldn’t load your recommendation history.");
        setLoading(false);
        return;
      }

      setHistory((data ?? []) as unknown as HistoryItem[]);
      setLoading(false);
    }

    fetchHistory();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="pn-page-loading" role="status">
        <span className="dashboard-loading-dot" aria-hidden="true" />
        Loading recommendation history…
      </div>
    );
  }

  if (errorMessage) {
    return (
      <Card className="pn-state-card">
        <h2>History unavailable</h2>
        <p>{errorMessage}</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </Card>
    );
  }

  return (
    <div className="pn-page">
      <div className="pn-page-intro">
        <div>
          <span className="pn-kicker">
            <History size={14} aria-hidden="true" />
            {history.length} past {history.length === 1 ? "decision" : "decisions"}
          </span>
          <h2>Your recommendation history</h2>
          <p>
            Review what PlayNext suggested, why it matched, and the feedback that
            will shape future recommendations.
          </p>
        </div>
        <Button href="/dashboard/recommend">Make a new decision</Button>
      </div>

      {history.length === 0 ? (
        <Card className="pn-empty-state pn-empty-state-large">
          <span className="pn-empty-icon" aria-hidden="true">
            <Clock3 size={23} />
          </span>
          <h3>No recommendations yet</h3>
          <p>Your completed PlayNext decisions will appear here.</p>
          <Button href="/dashboard/recommend">Get your first recommendation</Button>
        </Card>
      ) : (
        <div className="history-list">
          {history.map((item) => {
            const game = one(item.games);
            const session = one(item.recommendation_sessions);
            const feedback = item.feedback?.[0]?.feedback_type;
            const mode = session?.recommendation_mode ?? "collection";

            return (
              <article key={item.id} className="history-card">
                <div className="history-artwork">
                  {game?.background_image ? (
                    <Image
                      src={game.background_image}
                      alt=""
                      fill
                      sizes="112px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="game-artwork-placeholder">
                      <Gamepad2 size={21} aria-hidden="true" />
                    </div>
                  )}
                </div>

                <div className="history-content">
                  <div className="history-heading">
                    <div>
                      <span className="pn-eyebrow">
                        {mode === "discovery" ? <Compass size={12} /> : <Library size={12} />}
                        {mode === "discovery" ? "New discovery" : "From your collection"}
                      </span>
                      <h2>{game?.title ?? "Unknown game"}</h2>
                    </div>
                    <div className="history-score">
                      <strong>{item.score}%</strong>
                      <span>fit</span>
                    </div>
                  </div>

                  <p className="history-context">“{session?.user_input ?? "No context recorded"}”</p>
                  <p className="history-explanation">{item.explanation}</p>

                  <div className="history-meta">
                    <span>
                      <CalendarDays size={13} aria-hidden="true" />
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <Badge>{feedback ? feedback.replaceAll("_", " ") : "No feedback"}</Badge>
                  </div>

                  {item.score_breakdown && item.score_breakdown.length > 0 && (
                    <details className="history-details">
                      <summary>
                        Score details
                        <ChevronDown size={14} aria-hidden="true" />
                      </summary>
                      <div>
                        {item.score_breakdown.map((scoreItem, index) => (
                          <span key={`${scoreItem.label}-${index}`}>
                            {scoreItem.label}
                            <strong className={scoreItem.points >= 0 ? "score-positive" : "score-negative"}>
                              {scoreItem.points >= 0 ? "+" : ""}
                              {scoreItem.points}
                            </strong>
                          </span>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
