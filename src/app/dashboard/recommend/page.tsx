"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Gamepad2,
  RotateCcw,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FeedbackButtons from "@/components/recommendations/FeedbackButtons";
import { scoreGames } from "@/lib/recommendationEngine";
import type {
  ExtractedIntent,
  PreviousFeedback,
  PreviousRecommendation,
  RecommendationGame,
  ScoredGame,
  UserPreferences,
} from "@/lib/recommendation/types";
import { supabase } from "@/lib/supabase";

type UserGameRow = {
  games: RecommendationGame | RecommendationGame[] | null;
};

const promptSuggestions = [
  "I have 30 minutes and want something relaxing",
  "I want a challenging game with strong combat",
  "I’m tired but still want a good story",
];

export default function RecommendPage() {
  const [prompt, setPrompt] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [extractedIntent, setExtractedIntent] =
    useState<ExtractedIntent | null>(null);
  const [recommendedGame, setRecommendedGame] = useState<ScoredGame | null>(null);
  const [recommendationId, setRecommendationId] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedPrompt = prompt.trim();

    if (!cleanedPrompt || loading) return;

    setLoading(true);
    setErrorMessage("");
    setRecommendedGame(null);
    setExtractedIntent(null);
    setRecommendationId(null);

    try {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const { data: collectionData, error: collectionError } = await supabase
        .from("user_games")
        .select(`
          games (
            id,
            title,
            background_image,
            released,
            rating,
            genres,
            platforms,
            playtime,
            tags
          )
        `)
        .eq("user_id", userData.user.id);

      if (collectionError) throw collectionError;

      const collectionRows = (collectionData ?? []) as unknown as UserGameRow[];
      const games = collectionRows
        .map((row) => (Array.isArray(row.games) ? row.games[0] : row.games))
        .filter(Boolean) as RecommendationGame[];

      if (games.length === 0) {
        throw new Error("Add at least one game to your collection before asking PlayNext to decide.");
      }

      const intentResponse = await fetch("/api/extract-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: cleanedPrompt }),
      });

      if (!intentResponse.ok) {
        throw new Error("PlayNext couldn’t understand that request. Please try rephrasing it.");
      }

      const intent: ExtractedIntent = await intentResponse.json();

      const { data: feedbackData, error: feedbackError } = await supabase
        .from("feedback")
        .select(`
          feedback_type,
          recommendations ( game_id )
        `)
        .eq("user_id", userData.user.id);

      if (feedbackError) throw feedbackError;

      const previousFeedback = (
        (feedbackData ?? []) as unknown as {
          feedback_type: string;
          recommendations: { game_id: string } | { game_id: string }[] | null;
        }[]
      )
        .map((item) => {
          const recommendation = Array.isArray(item.recommendations)
            ? item.recommendations[0]
            : item.recommendations;

          return {
            game_id: recommendation?.game_id ?? "",
            feedback_type: item.feedback_type,
          };
        })
        .filter((item) => item.game_id);

      const { data: preferencesData } = await supabase
        .from("user_preferences")
        .select(
          "favorite_genres, preferred_platforms, play_style, difficulty_preference, session_length_preference"
        )
        .eq("user_id", userData.user.id)
        .maybeSingle();

      const { data: previousRecommendationData, error: previousRecommendationError } =
        await supabase
          .from("recommendations")
          .select("game_id, created_at")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: false })
          .limit(10);

      if (previousRecommendationError) throw previousRecommendationError;

      const scoredGames = scoreGames(
        games,
        intent,
        previousFeedback as PreviousFeedback[],
        preferencesData as UserPreferences | null,
        (previousRecommendationData ?? []) as PreviousRecommendation[]
      );
      const bestGame = scoredGames[0];

      if (!bestGame) {
        throw new Error("PlayNext couldn’t find a suitable game in your collection.");
      }

      const { data: sessionData, error: sessionError } = await supabase
        .from("recommendation_sessions")
        .insert({
          user_id: userData.user.id,
          user_input: cleanedPrompt,
          mood: intent.mood,
          available_time: intent.availableTime,
          energy_level: intent.energyLevel,
          desired_experience: intent.desiredExperience,
          difficulty_preference: intent.difficultyPreference,
          preferred_genres: intent.preferredGenres,
          reference_games: intent.referenceGames,
        })
        .select("id")
        .single();

      if (sessionError) throw sessionError;

      const { data: recommendationData, error: recommendationError } =
        await supabase
          .from("recommendations")
          .insert({
            session_id: sessionData.id,
            user_id: userData.user.id,
            game_id: bestGame.id,
            score: bestGame.score,
            explanation: bestGame.explanation,
            score_breakdown: bestGame.scoreBreakdown,
          })
          .select("id")
          .single();

      if (recommendationError) throw recommendationError;

      setRecommendationId(recommendationData.id);
      setSubmittedPrompt(cleanedPrompt);
      setExtractedIntent(intent);
      setRecommendedGame(bestGame);
      setPrompt("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while creating your recommendation."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetRecommendation() {
    setSubmittedPrompt("");
    setExtractedIntent(null);
    setRecommendedGame(null);
    setRecommendationId(null);
    setErrorMessage("");
  }

  const intentItems = extractedIntent
    ? [
        ["Mood", extractedIntent.mood || "Not specified"],
        [
          "Time",
          extractedIntent.availableTime
            ? `${extractedIntent.availableTime} minutes`
            : "Flexible",
        ],
        ["Energy", extractedIntent.energyLevel || "Unknown"],
        ["Experience", extractedIntent.desiredExperience || "Open"],
        ["Difficulty", extractedIntent.difficultyPreference || "Any"],
      ]
    : [];

  return (
    <div className="pn-page decide-page">
      <section className="decide-intro">
        <span className="pn-kicker">
          <WandSparkles size={14} aria-hidden="true" />
          One clear recommendation
        </span>
        <h2>Describe the session you want right now.</h2>
        <p>
          Mood, time, energy, difficulty—write naturally. PlayNext will understand
          the context and rank games from your own collection.
        </p>
      </section>

      {!recommendedGame && (
        <Card className="decide-prompt-card">
          <form onSubmit={handleSubmit}>
            <label htmlFor="play-context">What are you in the mood for?</label>
            <textarea
              id="play-context"
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
                setErrorMessage("");
              }}
              placeholder="I’m tired, I have about 45 minutes, and I want something relaxing with a good story…"
              maxLength={500}
              required
            />

            <div className="decide-prompt-footer">
              <span>{prompt.length}/500</span>
              <Button type="submit" loading={loading} disabled={!prompt.trim()}>
                {!loading && <Sparkles size={15} aria-hidden="true" />}
                {loading ? "Finding your best match…" : "Decide for me"}
              </Button>
            </div>
          </form>

          <div className="decide-suggestions">
            <span>Try an example</span>
            <div>
              {promptSuggestions.map((suggestion) => (
                <button
                  type="button"
                  key={suggestion}
                  onClick={() => setPrompt(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {errorMessage && (
        <div className="pn-inline-error" role="alert">
          <strong>We couldn’t complete that recommendation.</strong>
          <span>{errorMessage}</span>
        </div>
      )}

      {loading && (
        <div className="decide-progress" role="status">
          <span className="dashboard-loading-dot" aria-hidden="true" />
          <div>
            <strong>Evaluating your collection</strong>
            <p>Understanding your context and comparing the strongest matches.</p>
          </div>
        </div>
      )}

      {submittedPrompt && extractedIntent && recommendedGame && (
        <section className="recommendation-result">
          <div className="recommendation-artwork">
            {recommendedGame.background_image ? (
              <Image
                src={recommendedGame.background_image}
                alt=""
                fill
                priority
                sizes="(max-width: 900px) 100vw, 42vw"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="game-artwork-placeholder">
                <Gamepad2 size={34} aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="recommendation-content">
            <div className="recommendation-heading">
              <div>
                <span className="pn-eyebrow">Your best match</span>
                <h2>{recommendedGame.title}</h2>
              </div>
              <div className="recommendation-score">
                <strong>{recommendedGame.score}</strong>
                <span>% fit</span>
              </div>
            </div>

            <div className="recommendation-meta">
              {recommendedGame.genres?.slice(0, 4).map((genre) => (
                <Badge key={genre}>{genre}</Badge>
              ))}
              {extractedIntent.availableTime && (
                <Badge>
                  <Clock3 size={11} aria-hidden="true" />
                  {extractedIntent.availableTime} min session
                </Badge>
              )}
            </div>

            <div className="recommendation-explanation">
              <CheckCircle2 size={18} aria-hidden="true" />
              <p>{recommendedGame.explanation}</p>
            </div>

            <p className="recommendation-context">“{submittedPrompt}”</p>

            <details className="recommendation-details">
              <summary>
                Why this recommendation
                <ChevronDown size={15} aria-hidden="true" />
              </summary>

              <div className="recommendation-intent-grid">
                {intentItems.map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              <div className="recommendation-breakdown">
                {recommendedGame.scoreBreakdown.map((item, index) => (
                  <div key={`${item.label}-${index}`}>
                    <span>{item.label}</span>
                    <strong className={item.points >= 0 ? "score-positive" : "score-negative"}>
                      {item.points >= 0 ? "+" : ""}
                      {item.points}
                    </strong>
                  </div>
                ))}
              </div>
            </details>

            {recommendationId && (
              <FeedbackButtons recommendationId={recommendationId} />
            )}

            <div className="recommendation-actions">
              <Button onClick={resetRecommendation} variant="secondary">
                <RotateCcw size={14} aria-hidden="true" />
                Ask again
              </Button>
              <Button href="/dashboard/collection" variant="ghost">
                View collection
                <ArrowRight size={14} aria-hidden="true" />
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
