"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Compass,
  Gamepad2,
  History,
  Library,
  MessageSquareText,
  Search,
  Sparkles,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

type Relation<T> = T | T[] | null;
type ModeFilter = "all" | "collection" | "discovery";
type FeedbackFilter = "all" | "with_feedback" | "without_feedback";
const HISTORY_PAGE_SIZE = 30;

type HistoryItem = {
  id: string;
  created_at: string;
  score: number;
  explanation: string;
  recommendation_sessions: Relation<{
    user_input: string;
    recommendation_mode: "collection" | "discovery";
    mood: string | null;
    available_time: number | null;
    energy_level: string | null;
    desired_experience: string | null;
  }>;
  games: Relation<{
    title: string;
    slug: string | null;
    background_image: string | null;
    genres: string[] | null;
  }>;
  feedback: { feedback_type: string; reason: string | null }[] | null;
  score_breakdown: { category?: string; label: string; points: number; detail?: string }[] | null;
};

const feedbackLabels: Record<string, string> = {
  liked: "Great match",
  not_in_mood: "Not my mood",
  too_long: "Too long",
  too_difficult: "Too difficult",
  not_interested: "Not interested",
  already_played: "Already played",
};

function one<T>(relation: Relation<T>) {
  return Array.isArray(relation) ? relation[0] : relation;
}

function latestPrompt(input: string | undefined) {
  const messages = (input ?? "").split("\n").map((message) => message.trim()).filter(Boolean);
  return messages.at(-1) ?? "No session context recorded";
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [feedbackFilter, setFeedbackFilter] = useState<FeedbackFilter>("all");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

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
          games ( title, slug, background_image, genres ),
          recommendation_sessions (
            user_input,
            recommendation_mode,
            mood,
            available_time,
            energy_level,
            desired_experience
          ),
          feedback ( feedback_type, reason )
        `)
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false })
        .range(0, HISTORY_PAGE_SIZE - 1);

      if (!active) return;

      if (error) setErrorMessage("We couldn’t load your recommendation history.");
      else {
        const rows = (data ?? []) as unknown as HistoryItem[];
        setHistory(rows);
        setHasMore(rows.length === HISTORY_PAGE_SIZE);
      }
      setLoading(false);
    }

    fetchHistory();
    return () => { active = false; };
  }, []);

  const summary = useMemo(() => {
    const feedbackCount = history.filter((item) => (item.feedback?.length ?? 0) > 0).length;
    const discoveryCount = history.filter((item) => one(item.recommendation_sessions)?.recommendation_mode === "discovery").length;
    const likedCount = history.filter((item) => item.feedback?.[0]?.feedback_type === "liked").length;
    const averageScore = history.length
      ? Math.round(history.reduce((total, item) => total + item.score, 0) / history.length)
      : 0;

    return { feedbackCount, discoveryCount, likedCount, averageScore };
  }, [history]);

  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return history.filter((item) => {
      const game = one(item.games);
      const session = one(item.recommendation_sessions);
      const hasFeedback = (item.feedback?.length ?? 0) > 0;
      const matchesSearch = !query ||
        game?.title.toLowerCase().includes(query) ||
        session?.user_input.toLowerCase().includes(query) ||
        game?.genres?.some((genre) => genre.toLowerCase().includes(query));
      const matchesMode = modeFilter === "all" || session?.recommendation_mode === modeFilter;
      const matchesFeedback = feedbackFilter === "all" ||
        (feedbackFilter === "with_feedback" ? hasFeedback : !hasFeedback);

      return Boolean(matchesSearch && matchesMode && matchesFeedback);
    });
  }, [history, searchQuery, modeFilter, feedbackFilter]);

  function clearFilters() {
    setSearchQuery("");
    setModeFilter("all");
    setFeedbackFilter("all");
  }

  async function loadMoreHistory() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setLoadMoreError("");

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setLoadMoreError("Your session has expired. Please log in again.");
      setLoadingMore(false);
      return;
    }

    const from = history.length;
    const { data, error } = await supabase
      .from("recommendations")
      .select(`
        id, created_at, score, explanation, score_breakdown,
        games ( title, slug, background_image, genres ),
        recommendation_sessions ( user_input, recommendation_mode, mood, available_time, energy_level, desired_experience ),
        feedback ( feedback_type, reason )
      `)
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .range(from, from + HISTORY_PAGE_SIZE - 1);

    if (error) {
      setLoadMoreError("More history could not be loaded. Please try again.");
    } else {
      const rows = (data ?? []) as unknown as HistoryItem[];
      setHistory((current) => [...current, ...rows]);
      setHasMore(rows.length === HISTORY_PAGE_SIZE);
    }
    setLoadingMore(false);
  }

  if (loading) {
    return <div className="pn-page-loading" role="status"><span className="dashboard-loading-dot" />Loading recommendation history…</div>;
  }

  if (errorMessage) {
    return (
      <Card className="pn-state-card"><h2>History unavailable</h2><p>{errorMessage}</p><Button onClick={() => window.location.reload()}>Try again</Button></Card>
    );
  }

  return (
    <div className="lib-page history-v2">
      <header className="lib-page-header">
        <div>
          <span className="lib-kicker"><History size={14} /> Decision history</span>
          <h1>Every recommendation, with the reasoning intact.</h1>
          <p>Review the context behind past decisions, inspect their scores, and see how your feedback is shaping PlayNext.</p>
        </div>
        <Button href="/dashboard/recommend"><Sparkles size={15} /> Make a new decision</Button>
      </header>

      {history.length === 0 ? (
        <Card className="lib-empty-state">
          <span><Clock3 size={27} /></span><h2>Your decision journal starts here</h2>
          <p>Completed recommendations will appear here with their context, explanation and feedback.</p>
          <Button href="/dashboard/recommend">Get your first recommendation</Button>
        </Card>
      ) : (
        <>
          <section className="history-v2-summary" aria-label="History overview">
            <article><span><History size={17} /></span><div><small>Total decisions</small><strong>{history.length}</strong><p>Recommendations recorded</p></div></article>
            <article><span><BarChart3 size={17} /></span><div><small>Average fit</small><strong>{summary.averageScore}%</strong><p>Across all decisions</p></div></article>
            <article><span><Compass size={17} /></span><div><small>New discoveries</small><strong>{summary.discoveryCount}</strong><p>Outside your collection</p></div></article>
            <article><span><MessageSquareText size={17} /></span><div><small>Feedback given</small><strong>{summary.feedbackCount}</strong><p>{summary.likedCount} marked great match</p></div></article>
          </section>

          <section className="history-v2-controls">
            <label className="lib-search-box"><Search size={17} /><span className="sr-only">Search history</span><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search games, genres or session context" /></label>
            <label className="lib-select-box"><Compass size={16} /><span className="sr-only">Filter by recommendation source</span><select value={modeFilter} onChange={(event) => setModeFilter(event.target.value as ModeFilter)}><option value="all">All sources</option><option value="collection">My collection</option><option value="discovery">New discoveries</option></select></label>
            <label className="lib-select-box"><MessageSquareText size={16} /><span className="sr-only">Filter by feedback</span><select value={feedbackFilter} onChange={(event) => setFeedbackFilter(event.target.value as FeedbackFilter)}><option value="all">All feedback states</option><option value="with_feedback">Feedback given</option><option value="without_feedback">No feedback</option></select></label>
          </section>

          <div className="lib-results-heading">
            <div><span>Decision journal</span><h2>{filteredHistory.length} {filteredHistory.length === 1 ? "entry" : "entries"}</h2></div>
            {(searchQuery || modeFilter !== "all" || feedbackFilter !== "all") && <button type="button" onClick={clearFilters}>Clear filters</button>}
          </div>

          {filteredHistory.length === 0 ? (
            <Card className="lib-filter-empty"><Search size={24} /><h3>No matching decisions</h3><p>Try changing your search or filters.</p><Button variant="secondary" onClick={clearFilters}>Clear filters</Button></Card>
          ) : (
            <div className="history-v2-feed">
              {filteredHistory.map((item) => {
                const game = one(item.games);
                const session = one(item.recommendation_sessions);
                const feedback = item.feedback?.[0];
                const mode = session?.recommendation_mode ?? "collection";

                return (
                  <article key={item.id} className="history-v2-card">
                    <div className="history-v2-artwork">
                      {game?.background_image ? <Image src={game.background_image} alt="" fill sizes="220px" className="object-cover" /> : <div className="game-artwork-placeholder"><Gamepad2 size={25} /></div>}
                      <span className="history-v2-date"><CalendarDays size={12} /> {new Date(item.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>

                    <div className="history-v2-content">
                      <div className="history-v2-heading">
                        <div>
                          <span className="history-source">{mode === "discovery" ? <Compass size={12} /> : <Library size={12} />}{mode === "discovery" ? "New discovery" : "From your collection"}</span>
                          <h2>{game?.title ?? "Unknown game"}</h2>
                          <div className="history-v2-genres">{game?.genres?.slice(0, 3).map((genre) => <span key={genre}>{genre}</span>)}</div>
                        </div>
                        <div className="history-v2-score"><strong>{item.score}</strong><span>% fit</span></div>
                      </div>

                      <blockquote>“{latestPrompt(session?.user_input)}”</blockquote>
                      <p className="history-v2-explanation">{item.explanation}</p>

                      <div className="history-v2-context">
                        {session?.mood && session.mood !== "unknown" && <span>Mood <strong>{session.mood}</strong></span>}
                        {session?.available_time && <span>Time <strong>{session.available_time} min</strong></span>}
                        {session?.energy_level && session.energy_level !== "unknown" && <span>Energy <strong>{session.energy_level}</strong></span>}
                        {session?.desired_experience && <span>Wanted <strong>{session.desired_experience}</strong></span>}
                      </div>

                      <div className="history-v2-footer">
                        <span className={feedback ? `history-feedback history-feedback-${feedback.feedback_type}` : "history-feedback"}>
                          {feedback ? <CheckCircle2 size={13} /> : <MessageSquareText size={13} />}
                          {feedback ? feedbackLabels[feedback.feedback_type] ?? feedback.feedback_type.replaceAll("_", " ") : "No feedback given"}
                        </span>
                        {game?.slug && <Link href={`/dashboard/search/${game.slug}`}>View game details</Link>}
                      </div>

                      {item.score_breakdown && item.score_breakdown.length > 0 && (
                        <details className="history-v2-details">
                          <summary>View score breakdown <ChevronDown size={15} /></summary>
                          <div>
                            {item.score_breakdown.map((scoreItem, index) => (
                              <article key={`${scoreItem.label}-${index}`}>
                                <span>{scoreItem.category ?? scoreItem.label}</span>
                                <strong className={scoreItem.points >= 0 ? "score-positive" : "score-negative"}>{scoreItem.points >= 0 ? "+" : ""}{scoreItem.points}</strong>
                                <p>{scoreItem.detail ?? scoreItem.label}</p>
                              </article>
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
          {hasMore && !searchQuery && modeFilter === "all" && feedbackFilter === "all" && (
            <div className="lib-load-more">
              {loadMoreError && <div className="lib-inline-error" role="alert">{loadMoreError}</div>}
              <Button variant="secondary" onClick={loadMoreHistory} loading={loadingMore}>
                {loadingMore ? "Loading more…" : "Load more history"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
