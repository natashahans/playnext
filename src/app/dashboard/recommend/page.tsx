"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Gamepad2,
  Library,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import FeedbackButtons from "@/components/recommendations/FeedbackButtons";
import { scoreGames } from "@/lib/recommendationEngine";
import type {
  FeedbackGameSnapshot,
  PreviousFeedback,
  PreviousRecommendation,
  RecommendationGame,
  ScoredGame,
  UserPreferences,
} from "@/lib/recommendation/types";
import { supabase } from "@/lib/supabase";
import type {
  ExtractedIntent,
  IntentChatMessage,
  IntentChatResponse,
} from "@/types/intent";

type Relation<T> = T | T[] | null;

type UserGameRow = {
  status: string | null;
  games: Relation<RecommendationGame>;
};

type FeedbackRow = {
  feedback_type: string;
  reason: string | null;
  recommendations: Relation<{
    game_id: string;
    games: Relation<FeedbackGameSnapshot>;
  }>;
};

const initialMessage: IntentChatMessage = {
  id: "assistant-welcome",
  role: "assistant",
  content: "Tell me about the play session you want right now. Mood, time, energy, difficulty—say it naturally. I’ll ask one follow-up only if I genuinely need it.",
};

const promptSuggestions = [
  "I have 30 minutes and want something relaxing",
  "I’m energetic and want difficult combat",
  "I’m tired but want a strong story",
];

function one<T>(relation: Relation<T>) {
  return Array.isArray(relation) ? relation[0] : relation;
}

function createMessage(role: "assistant" | "user", content: string): IntentChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    content,
  };
}

export default function RecommendPage() {
  const [messages, setMessages] = useState<IntentChatMessage[]>([initialMessage]);
  const [draft, setDraft] = useState("");
  const [interpreting, setInterpreting] = useState(false);
  const [ranking, setRanking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [extractedIntent, setExtractedIntent] = useState<ExtractedIntent | null>(null);
  const [recommendedGame, setRecommendedGame] = useState<ScoredGame | null>(null);
  const [recommendationId, setRecommendationId] = useState<string | null>(null);
  const [evaluatedCount, setEvaluatedCount] = useState(0);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, interpreting]);

  async function createRecommendation(
    intent: ExtractedIntent,
    conversation: IntentChatMessage[]
  ) {
    setRanking(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Your session has expired. Please log in again.");

      const [collectionResult, feedbackResult, preferencesResult, historyResult] =
        await Promise.all([
          supabase
            .from("user_games")
            .select(`
              status,
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
            .eq("user_id", userData.user.id),
          supabase
            .from("feedback")
            .select(`
              feedback_type,
              reason,
              recommendations (
                game_id,
                games ( id, genres, platforms, playtime, tags )
              )
            `)
            .eq("user_id", userData.user.id),
          supabase
            .from("user_preferences")
            .select("favorite_genres, preferred_platforms, play_style, difficulty_preference, session_length_preference")
            .eq("user_id", userData.user.id)
            .maybeSingle(),
          supabase
            .from("recommendations")
            .select("game_id, created_at")
            .eq("user_id", userData.user.id)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

      if (collectionResult.error) throw collectionResult.error;
      if (feedbackResult.error) throw feedbackResult.error;
      if (historyResult.error) throw historyResult.error;

      const collectionRows = (collectionResult.data ?? []) as unknown as UserGameRow[];
      const games: RecommendationGame[] = collectionRows
        .flatMap((row) => {
          const game = one(row.games);
          return game ? [{ ...game, status: row.status }] : [];
        });

      if (games.length === 0) {
        throw new Error("Add at least one game to your collection before asking PlayNext to decide.");
      }

      const feedbackRows = (feedbackResult.data ?? []) as unknown as FeedbackRow[];
      const previousFeedback: PreviousFeedback[] = feedbackRows
        .flatMap((row) => {
          const recommendation = one(row.recommendations);
          if (!recommendation?.game_id) return [];
          return [{
            game_id: recommendation.game_id,
            feedback_type: row.feedback_type,
            reason: row.reason,
            game: one(recommendation.games),
          }];
        });

      const scoredGames = scoreGames(
        games,
        intent,
        previousFeedback,
        preferencesResult.data as UserPreferences | null,
        (historyResult.data ?? []) as PreviousRecommendation[]
      );
      const bestGame = scoredGames[0];

      if (!bestGame) throw new Error("PlayNext could not find a suitable game in your collection.");

      const userInput = conversation
        .filter((message) => message.role === "user")
        .map((message) => message.content)
        .join("\n");

      const { data: sessionData, error: sessionError } = await supabase
        .from("recommendation_sessions")
        .insert({
          user_id: userData.user.id,
          user_input: userInput,
          mood: intent.mood,
          available_time: intent.availableTime,
          energy_level: intent.energyLevel,
          desired_experience: intent.desiredExperiences.join(", ") || intent.desiredExperience,
          difficulty_preference: intent.difficultyPreference,
          preferred_genres: intent.preferredGenres,
          reference_games: intent.referenceGames,
        })
        .select("id")
        .single();

      if (sessionError) throw sessionError;

      const { data: recommendationData, error: recommendationError } = await supabase
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

      setRecommendedGame(bestGame);
      setRecommendationId(recommendationData.id);
      setEvaluatedCount(games.length);
      setMessages((current) => [
        ...current,
        createMessage("assistant", `I evaluated ${games.length} games using your live context, saved preferences, previous feedback and recommendation history. ${bestGame.title} is the strongest match.`),
      ]);
    } finally {
      setRanking(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || interpreting || ranking || recommendedGame) return;

    const userMessage = createMessage("user", content);
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setDraft("");
    setErrorMessage("");
    setInterpreting(true);

    try {
      const response = await fetch("/api/extract-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!response.ok) throw new Error("PlayNext could not understand that message.");

      const result = (await response.json()) as IntentChatResponse;
      const assistantMessage = createMessage("assistant", result.assistantMessage);
      const completedConversation = [...nextMessages, assistantMessage];

      setMessages(completedConversation);
      setExtractedIntent(result.intent);
      setInterpreting(false);

      if (result.status === "ready") {
        await createRecommendation(result.intent, completedConversation);
      }
    } catch (error) {
      setInterpreting(false);
      setRanking(false);
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong while creating your recommendation.");
    }
  }

  function resetConversation() {
    setMessages([initialMessage]);
    setDraft("");
    setErrorMessage("");
    setExtractedIntent(null);
    setRecommendedGame(null);
    setRecommendationId(null);
    setEvaluatedCount(0);
  }

  const contextItems = extractedIntent
    ? [
        ["Mood", extractedIntent.mood === "unknown" ? "Open" : extractedIntent.mood],
        ["Time", extractedIntent.availableTime ? `${extractedIntent.availableTime} min` : "Flexible"],
        ["Energy", extractedIntent.energyLevel === "unknown" ? "Open" : extractedIntent.energyLevel],
        ["Experience", extractedIntent.desiredExperiences.join(", ") || "Open"],
        ["Difficulty", extractedIntent.difficultyPreference === "unknown" ? "Any" : extractedIntent.difficultyPreference],
        ["Pace", extractedIntent.sessionPace === "unknown" ? "Any" : extractedIntent.sessionPace],
      ]
    : [];

  return (
    <div className="ai-decide-page">
      <header className="ai-decide-header">
        <div>
          <span><Sparkles size={13} aria-hidden="true" /> PlayNext decision assistant</span>
          <h1>Tell me what fits right now.</h1>
          <p>The AI understands your context. The recommendation engine evaluates your collection.</p>
        </div>
        {(messages.length > 1 || recommendedGame) && (
          <button type="button" onClick={resetConversation}>
            <RotateCcw size={14} aria-hidden="true" /> Start over
          </button>
        )}
      </header>

      <div className="ai-decide-layout">
        <section className="ai-chat-card">
          <div className="ai-chat-toolbar">
            <div className="ai-chat-identity">
              <span><Bot size={17} aria-hidden="true" /></span>
              <div><strong>PlayNext AI</strong><small>Intent interpreter</small></div>
            </div>
            <span className="ai-chat-status"><i /> Online</span>
          </div>

          <div className="ai-chat-thread" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`ai-message ai-message-${message.role}`}>
                <span>{message.role === "assistant" ? <Bot size={15} /> : <UserRound size={15} />}</span>
                <div>
                  <small>{message.role === "assistant" ? "PlayNext AI" : "You"}</small>
                  <p>{message.content}</p>
                </div>
              </div>
            ))}

            {interpreting && (
              <div className="ai-message ai-message-assistant">
                <span><Bot size={15} /></span>
                <div>
                  <small>PlayNext AI</small>
                  <div className="ai-typing" aria-label="Interpreting your message"><i /><i /><i /></div>
                </div>
              </div>
            )}

            {ranking && (
              <div className="ai-engine-progress" role="status">
                <span className="dashboard-loading-dot" />
                <div><strong>Recommendation engine running</strong><p>Scoring context, preferences, feedback and history.</p></div>
              </div>
            )}
            <div ref={conversationEndRef} />
          </div>

          {!recommendedGame && (
            <div className="ai-chat-composer-wrap">
              {messages.length === 1 && (
                <div className="ai-chat-suggestions">
                  {promptSuggestions.map((suggestion) => (
                    <button type="button" key={suggestion} onClick={() => setDraft(suggestion)}>{suggestion}</button>
                  ))}
                </div>
              )}

              <form className="ai-chat-composer" onSubmit={handleSubmit}>
                <textarea
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setErrorMessage("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="Describe your mood, time and energy…"
                  maxLength={700}
                  rows={2}
                  disabled={interpreting || ranking}
                  aria-label="Message PlayNext AI"
                />
                <div>
                  <span>Enter to send · Shift + Enter for a new line</span>
                  <button type="submit" disabled={!draft.trim() || interpreting || ranking} aria-label="Send message">
                    <Send size={16} aria-hidden="true" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>

        <aside className="ai-context-card">
          <div className="ai-context-heading">
            <span><ShieldCheck size={17} aria-hidden="true" /></span>
            <div><strong>Live decision context</strong><p>Structured criteria extracted from this conversation.</p></div>
          </div>

          {extractedIntent ? (
            <>
              <div className="ai-context-confidence">
                <div><span>Interpretation confidence</span><strong>{Math.round(extractedIntent.confidence * 100)}%</strong></div>
                <i><b style={{ width: `${Math.round(extractedIntent.confidence * 100)}%` }} /></i>
              </div>
              <div className="ai-context-grid">
                {contextItems.map(([label, value]) => (
                  <div key={label}><span>{label}</span><strong>{value}</strong></div>
                ))}
              </div>
              {(extractedIntent.preferredGenres.length > 0 || extractedIntent.avoidedGenres.length > 0) && (
                <div className="ai-context-genres">
                  {extractedIntent.preferredGenres.map((genre) => <Badge key={`prefer-${genre}`}>{genre}</Badge>)}
                  {extractedIntent.avoidedGenres.map((genre) => <Badge key={`avoid-${genre}`}>Avoid {genre}</Badge>)}
                </div>
              )}
            </>
          ) : (
            <div className="ai-context-empty">
              <Clock3 size={22} aria-hidden="true" />
              <p>Your interpreted mood, time, energy and desired experience will appear here.</p>
            </div>
          )}

          <div className="ai-context-boundary">
            <strong>Clear separation of responsibility</strong>
            <p><b>AI:</b> understands your words.</p>
            <p><b>Engine:</b> ranks your games using controlled factors.</p>
          </div>
        </aside>
      </div>

      {errorMessage && (
        <div className="ai-decide-error" role="alert"><strong>We couldn’t complete the decision.</strong><span>{errorMessage}</span></div>
      )}

      {recommendedGame && extractedIntent && (
        <section className="ai-recommendation">
          <div className="ai-recommendation-artwork">
            {recommendedGame.background_image ? (
              <Image src={recommendedGame.background_image} alt="" fill priority sizes="(max-width: 900px) 100vw, 45vw" className="object-cover" unoptimized />
            ) : (
              <div className="game-artwork-placeholder"><Gamepad2 size={34} /></div>
            )}
            <div className="ai-recommendation-artwork-scrim" />
            <span><CheckCircle2 size={14} /> Strongest of {evaluatedCount} games</span>
          </div>

          <div className="ai-recommendation-content">
            <div className="ai-recommendation-heading">
              <div><span>Your recommendation</span><h2>{recommendedGame.title}</h2></div>
              <div className="ai-match-score"><strong>{recommendedGame.score}</strong><span>% fit</span></div>
            </div>

            <div className="ai-recommendation-meta">
              {recommendedGame.genres?.slice(0, 4).map((genre) => <Badge key={genre}>{genre}</Badge>)}
              {extractedIntent.availableTime && <Badge><Clock3 size={11} /> {extractedIntent.availableTime} min</Badge>}
            </div>

            <div className="ai-recommendation-explanation">
              <Sparkles size={18} aria-hidden="true" />
              <p>{recommendedGame.explanation}</p>
            </div>

            <div className="ai-match-reasons">
              {recommendedGame.matchReasons.slice(0, 3).map((reason) => (
                <div key={reason}><CheckCircle2 size={14} /><span>{reason}</span></div>
              ))}
            </div>

            <details className="ai-score-details">
              <summary>See the complete score <ChevronDown size={15} /></summary>
              <div>
                {recommendedGame.scoreBreakdown.map((item) => (
                  <article key={item.category}>
                    <div><span>{item.category}</span><strong className={item.points >= 0 ? "score-positive" : "score-negative"}>{item.points >= 0 ? "+" : ""}{item.points}</strong></div>
                    <h3>{item.label}</h3>
                    <p>{item.detail}</p>
                  </article>
                ))}
              </div>
            </details>

            {recommendationId && <FeedbackButtons recommendationId={recommendationId} />}

            <div className="ai-recommendation-actions">
              <Button onClick={resetConversation} variant="secondary"><RotateCcw size={14} /> Ask again</Button>
              <Button href="/dashboard/collection" variant="ghost"><Library size={14} /> View collection <ArrowRight size={14} /></Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
