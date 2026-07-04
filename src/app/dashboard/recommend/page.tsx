"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { mockExtractIntent, type ExtractedIntent } from "@/lib/mockIntentExtraction";
import {
  scoreGames,
  type PreviousFeedback,
  type RecommendationGame,
  type ScoredGame,
  type UserPreferences,
} from "@/lib/recommendationEngine";
import { supabase } from "@/lib/supabase";
import FeedbackButtons from "@/components/recommendations/FeedbackButtons";

type UserGameRow = {
  games: RecommendationGame | RecommendationGame[] | null;
};

export default function RecommendPage() {
  const [prompt, setPrompt] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [extractedIntent, setExtractedIntent] = useState<ExtractedIntent | null>(null);
  const [recommendedGame, setRecommendedGame] = useState<ScoredGame | null>(null);
  const [recommendationId, setRecommendationId] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      alert("You must be logged in.");
      setLoading(false);
      return;
    }

    const intent = mockExtractIntent(prompt);

    const { data: sessionData, error: sessionError } = await supabase
      .from("recommendation_sessions")
      .insert({
        user_id: userData.user.id,
        user_input: prompt,
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

    if (sessionError) {
      alert(sessionError.message);
      setLoading(false);
      return;
    }

    const { data: collectionData, error: collectionError } = await supabase
      .from("user_games")
      .select(`
        games (
          id,
          title,
          rating,
          genres
        )
      `)
      .eq("user_id", userData.user.id);

    if (collectionError) {
      alert(collectionError.message);
      setLoading(false);
      return;
    }

    const collectionRows = (collectionData ?? []) as unknown as UserGameRow[];

    const games = collectionRows
      .map((row) => (Array.isArray(row.games) ? row.games[0] : row.games))
      .filter(Boolean) as RecommendationGame[];

    if (games.length === 0) {
      alert("Add games to your collection before starting a recommendation.");
      setLoading(false);
      return;
    }

    const { data: feedbackData, error: feedbackError } = await supabase
    .from("feedback")
    .select(`
        feedback_type,
        recommendations (
        game_id
        )
    `)
    .eq("user_id", userData.user.id);

    if (feedbackError) {
    alert(feedbackError.message);
    setLoading(false);
    return;
    }

    const previousFeedback = ((feedbackData ?? []) as unknown as {
    feedback_type: string;
    recommendations:
        | { game_id: string }
        | { game_id: string }[]
        | null;
    }[]).map((item) => {
    const recommendation = Array.isArray(item.recommendations)
        ? item.recommendations[0]
        : item.recommendations;

    return {
        game_id: recommendation?.game_id ?? "",
        feedback_type: item.feedback_type,
    };
    }).filter((item) => item.game_id);

    const { data: preferencesData } = await supabase
    .from("user_preferences")
    .select("favorite_genres, difficulty_preference, session_length_preference")
    .eq("user_id", userData.user.id)
    .single();

    const scoredGames = scoreGames(
    games,
    intent,
    previousFeedback as PreviousFeedback[],
    preferencesData as UserPreferences | null
    );
    const bestGame = scoredGames[0];

    const { data: recommendationData, error: recommendationError } = await supabase
    .from("recommendations")
    .insert({
        session_id: sessionData.id,
        user_id: userData.user.id,
        game_id: bestGame.id,
        score: bestGame.score,
        explanation: bestGame.explanation,
    })
    .select("id")
    .single();

    if (recommendationError) {
    alert(recommendationError.message);
    setLoading(false);
    return;
    }

    setRecommendationId(recommendationData.id);

    setSubmittedPrompt(prompt);
    setExtractedIntent(intent);
    setRecommendedGame(bestGame);
    setPrompt("");
    setLoading(false);
  }

  const intentItems = extractedIntent
    ? [
        ["Mood", extractedIntent.mood],
        [
          "Available time",
          extractedIntent.availableTime
            ? `${extractedIntent.availableTime} minutes`
            : "Unknown",
        ],
        ["Energy level", extractedIntent.energyLevel],
        ["Desired experience", extractedIntent.desiredExperience],
        ["Difficulty preference", extractedIntent.difficultyPreference],
        [
          "Reference games",
          extractedIntent.referenceGames.length > 0
            ? extractedIntent.referenceGames.join(", ")
            : "None",
        ],
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">Decide</p>
        <h1 className="mt-2 text-3xl font-bold">
          What should I play right now?
        </h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Describe your mood, time, energy, and desired experience. PlayNext
          extracts your intent and scores games from your saved collection.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-300">
            Describe your current context
          </label>

          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Example: I'm tired, I only have 45 minutes, and I want something relaxing and not too difficult."
            className="min-h-36 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500"
            required
          />

          <Button>{loading ? "Finding best game..." : "Decide"}</Button>
        </form>
      </Card>

      {submittedPrompt && extractedIntent && recommendedGame && (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">Structured intent</p>
                <h2 className="mt-2 text-xl font-semibold">
                  User context extracted
                </h2>
              </div>

              <Badge>Mock extraction</Badge>
            </div>

            <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-300">
              “{submittedPrompt}”
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {intentItems.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                >
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className="mt-1 text-sm text-white">{value}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">Recommended game</p>
                <h2 className="mt-2 text-3xl font-bold">
                  {recommendedGame.title}
                </h2>
              </div>

              <Badge>{recommendedGame.score}% fit</Badge>
            </div>

            <p className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-300">
              {recommendedGame.explanation}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {recommendedGame.genres?.map((genre) => (
                <Badge key={genre}>{genre}</Badge>
              ))}
            </div>

            <p className="mt-5 text-sm text-slate-500">
              This recommendation was selected by the custom scoring engine, not
              directly by AI.
            </p>

            {recommendationId && (
            <FeedbackButtons recommendationId={recommendationId} />
            )}            
          </Card>
        </div>
      )}
    </div>
  );
}