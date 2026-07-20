"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Compass,
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
import AddRecommendedGameButton from "@/components/recommendations/AddRecommendedGameButton";
import { assessRecommendationDecision, scoreGames } from "@/lib/recommendationEngine";
import type { RawgGame } from "@/lib/rawg";
import type {
  FeedbackGameSnapshot,
  PreviousFeedback,
  PreviousRecommendation,
  RecommendationGame,
  RecommendationMode,
  ScoredGame,
  UserPreferences,
} from "@/lib/recommendation/types";
import { supabase } from "@/lib/supabase";
import type {
  ExtractedIntent,
  IntentChatMessage,
  IntentChatResponse,
} from "@/types/intent";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { saveCatalogueGame } from "@/lib/catalogue-client";
import {
  clearDecisionSession,
  initialDecisionMessage,
  loadDecisionSession,
  saveDecisionSession,
  type StoredDecisionState,
} from "@/lib/decision-session";

type Relation<T> = T | T[] | null;

type UserGameRow = {
  status: string | null;
  games: Relation<RecommendationGame>;
};

type FeedbackRow = {
  feedback_type: string;
  reason: string | null;
  created_at: string | null;
  recommendations: Relation<{
    game_id: string;
    games: Relation<FeedbackGameSnapshot>;
  }>;
};

type HistoryRow = {
  game_id: string;
  created_at: string;
  games: Relation<{ rawg_id: number | null; genres: string[] | null }>;
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
  const [mode, setMode] = useState<RecommendationMode>("collection");
  const [messages, setMessages] = useState<IntentChatMessage[]>([initialDecisionMessage("collection")]);
  const [draft, setDraft] = useState("");
  const [interpreting, setInterpreting] = useState(false);
  const [ranking, setRanking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [extractedIntent, setExtractedIntent] = useState<ExtractedIntent | null>(null);
  const [recommendedGame, setRecommendedGame] = useState<ScoredGame | null>(null);
  const [recommendationId, setRecommendationId] = useState<string | null>(null);
  const [evaluatedCount, setEvaluatedCount] = useState(0);
  const [storageReady, setStorageReady] = useState(false);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const recommendationRef = useRef<HTMLElement>(null);
  const chatCardRef = useRef<HTMLElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = loadDecisionSession();
        if (saved) {
          setMode(saved.mode);
          setMessages(saved.messages);
          setExtractedIntent(saved.extractedIntent);
          setRecommendedGame(saved.recommendedGame);
          setRecommendationId(saved.recommendationId);
          setEvaluatedCount(saved.evaluatedCount);
        }
      } finally {
        setStorageReady(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageReady) return;

    const state: StoredDecisionState = {
      mode,
      messages,
      extractedIntent,
      recommendedGame,
      recommendationId,
      evaluatedCount,
    };

    saveDecisionSession(state);
  }, [
    storageReady,
    mode,
    messages,
    extractedIntent,
    recommendedGame,
    recommendationId,
    evaluatedCount,
  ]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, interpreting]);

  useEffect(() => {
    if (recommendedGame) {
      window.setTimeout(() => {
        recommendationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    }
  }, [recommendedGame]);

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
                rawg_id,
                slug,
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
              created_at,
              recommendations (
                game_id,
                games ( id, rawg_id, genres, platforms, playtime, tags )
              )
            `)
            .eq("user_id", userData.user.id)
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("user_preferences")
            .select("favorite_genres, preferred_platforms, play_style, difficulty_preference, session_length_preference")
            .eq("user_id", userData.user.id)
            .maybeSingle(),
          supabase
            .from("recommendations")
            .select("game_id, created_at, games ( rawg_id, genres )")
            .eq("user_id", userData.user.id)
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

      if (collectionResult.error) throw collectionResult.error;
      if (feedbackResult.error) throw feedbackResult.error;
      if (preferencesResult.error) throw preferencesResult.error;
      if (historyResult.error) throw historyResult.error;

      const collectionRows = (collectionResult.data ?? []) as unknown as UserGameRow[];
      const collectionGames: RecommendationGame[] = collectionRows
        .flatMap((row) => {
          const game = one(row.games);
          return game ? [{ ...game, status: row.status, source: "collection" as const }] : [];
        });

      if (mode === "collection" && collectionGames.length === 0) {
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
            created_at: row.created_at,
            game: one(recommendation.games),
          }];
        });

      const preferences = preferencesResult.data as UserPreferences | null;
      const previousRecommendations: PreviousRecommendation[] = (
        (historyResult.data ?? []) as unknown as HistoryRow[]
      ).map((item) => ({
        game_id: item.game_id,
        rawg_id: one(item.games)?.rawg_id ?? null,
        created_at: item.created_at,
        genres: one(item.games)?.genres ?? [],
      }));

      let candidateGames = collectionGames;

      if (mode === "discovery") {
        const response = await authenticatedFetch("/api/games/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent,
            preferences,
            excludedRawgIds: collectionGames
              .map((game) => game.rawg_id)
              .filter((id): id is number => id != null),
          }),
        });

        if (!response.ok) {
          throw new Error("PlayNext could not search for new games right now.");
        }

        const payload = (await response.json()) as { games: RawgGame[] };
        candidateGames = payload.games.map((game) => ({
          id: `rawg:${game.id}`,
          rawg_id: game.id,
          slug: game.slug,
          source: "discovery" as const,
          title: game.name,
          background_image: game.background_image,
          released: game.released,
          rating: game.rating,
          ratings_count: game.ratings_count ?? null,
          metacritic: game.metacritic ?? null,
          genres: game.genres.map((genre) => genre.name),
          platforms: game.platforms?.map((item) => item.platform.name) ?? [],
          playtime: game.playtime,
          tags: game.tags
            .filter((tag) => /^[\x00-\x7F\s\-':,&()]+$/.test(tag.name))
            .map((tag) => tag.name),
        }));
      }

      if (candidateGames.length === 0) {
        throw new Error(mode === "collection"
          ? "There are no games available in your collection."
          : "No suitable new games were found. Try broadening your request.");
      }

      const scoredGames = scoreGames(
        candidateGames,
        intent,
        previousFeedback,
        preferences,
        previousRecommendations
      );
      const assessment = assessRecommendationDecision(scoredGames, intent);
      const userTurnCount = conversation.filter((message) => message.role === "user").length;

      if (assessment.shouldClarify && userTurnCount < 2 && assessment.question) {
        setMessages((current) => [...current, createMessage("assistant", assessment.question!)]);
        setRecommendedGame(null);
        setRecommendationId(null);
        setEvaluatedCount(candidateGames.length);
        return;
      }
      let bestGame = scoredGames.find((game) => game.isEligible);

      if (!bestGame) {
        throw new Error("No game safely matched the current request. Try removing an exclusion or broadening the session description.");
      }

      if (mode === "discovery") {
        if (!bestGame.slug) {
          throw new Error("The discovery was found but could not be saved.");
        }
        const savedGame = await saveCatalogueGame(bestGame.slug);
        bestGame = { ...bestGame, id: savedGame.id };
      }

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
          recommendation_mode: mode,
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
      setEvaluatedCount(candidateGames.length);
      setMessages((current) => [
        ...current,
        createMessage(
          "assistant",
          `I evaluated ${candidateGames.length} ${mode === "collection" ? "games from your collection" : "new discoveries outside your collection"} using your live context, saved preferences, previous feedback and recommendation history. ${bestGame.title} is the strongest ${bestGame.confidenceBand === "low" ? "provisional " : ""}match with ${bestGame.selectionConfidence}% decision confidence.`
        ),
      ]);
    } finally {
      setRanking(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || interpreting || ranking) return;

    const userMessage = createMessage("user", content);
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setDraft("");
    setErrorMessage("");
    setRecommendedGame(null);
    setRecommendationId(null);
    setEvaluatedCount(0);
    setInterpreting(true);

    try {
      const response = await authenticatedFetch("/api/extract-intent", {
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
    clearDecisionSession();
    setMessages([initialDecisionMessage(mode)]);
    setDraft("");
    setErrorMessage("");
    setExtractedIntent(null);
    setRecommendedGame(null);
    setRecommendationId(null);
    setEvaluatedCount(0);
  }

  function continueConversation() {
    chatCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => composerRef.current?.focus(), 260);
  }

  function changeMode(nextMode: RecommendationMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    setMessages([initialDecisionMessage(nextMode)]);
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
          <h1>What should you play next?</h1>
          <p>Describe the kind of session you want. PlayNext will find one focused answer.</p>
        </div>
        {(messages.length > 1 || recommendedGame) && (
          <button type="button" onClick={resetConversation}>
            <RotateCcw size={14} aria-hidden="true" /> New conversation
          </button>
        )}
      </header>

      <div className="ai-decide-layout">
        <section className="ai-chat-card" ref={chatCardRef}>
          <div className="ai-chat-toolbar">
            <div className="ai-chat-identity">
              <span><Bot size={17} aria-hidden="true" /></span>
              <div>
                <strong>PlayNext AI</strong>
                <p>{mode === "collection" ? "Choosing from games you already own" : "Discovering a game outside your collection"}</p>
              </div>
              <span className="ai-chat-status"><i /> Online</span>
            </div>

            <div className="ai-source-control">
              <span>Recommend from</span>
              <div className="ai-source-switch" role="radiogroup" aria-label="Recommendation source">
                <button
                  type="button"
                  role="radio"
                  aria-checked={mode === "collection"}
                  className={mode === "collection" ? "is-active" : ""}
                  onClick={() => changeMode("collection")}
                  disabled={interpreting || ranking}
                  title="Recommend only games already in your collection"
                >
                  <Library size={14} aria-hidden="true" /> My collection
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={mode === "discovery"}
                  className={mode === "discovery" ? "is-active" : ""}
                  onClick={() => changeMode("discovery")}
                  disabled={interpreting || ranking}
                  title="Recommend a game outside your collection"
                >
                  <Compass size={14} aria-hidden="true" /> Discover new
                </button>
              </div>
            </div>
          </div>

          <div className={`ai-chat-thread ${messages.length === 1 ? "is-empty" : ""}`} aria-live="polite">
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
                <div>
                  <strong>{mode === "collection" ? "Ranking your collection" : "Searching for new discoveries"}</strong>
                  <p>Scoring context, preferences, feedback and history.</p>
                </div>
              </div>
            )}
            <div ref={conversationEndRef} />
          </div>

          <div className="ai-chat-composer-wrap">
            {messages.length === 1 && (
              <div className="ai-chat-suggestions">
                {promptSuggestions.map((suggestion) => (
                  <button type="button" key={suggestion} onClick={() => setDraft(suggestion)}>{suggestion}</button>
                ))}
              </div>
            )}

            {recommendedGame && (
              <div className="ai-refine-hint">
                <Sparkles size={14} aria-hidden="true" />
                <span>Want a different answer? Continue the conversation and tell PlayNext what to change.</span>
              </div>
            )}

            <form className="ai-chat-composer" onSubmit={handleSubmit}>
              <textarea
                ref={composerRef}
                value={draft}
                onFocus={() => {
                  window.setTimeout(() => {
                    composerRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  }, 180);
                }}
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
                placeholder={recommendedGame
                  ? "Refine it — for example, something shorter or less intense…"
                  : "Describe your mood, time and energy…"}
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
        </section>

        <aside className="ai-context-card">
          <div className="ai-context-heading">
            <span><ShieldCheck size={17} aria-hidden="true" /></span>
            <div><small>What PlayNext understands</small><strong>Your session context</strong><p>These details update as you chat.</p></div>
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
              <h3>Waiting for your message</h3>
              <p>Mood, time, energy and the experience you want will appear here.</p>
            </div>
          )}

          <div className="ai-context-source-card">
            {mode === "collection" ? <Library size={17} /> : <Compass size={17} />}
            <div>
              <span>Recommendation source</span>
              <strong>{mode === "collection" ? "Your collection" : "Outside your collection"}</strong>
            </div>
          </div>
        </aside>
      </div>

      {errorMessage && (
        <div className="ai-decide-error" role="alert"><strong>We couldn’t complete the decision.</strong><span>{errorMessage}</span></div>
      )}

      {recommendedGame && extractedIntent && (
        <section className="ai-recommendation" ref={recommendationRef}>
          <div className="ai-recommendation-artwork">
            {recommendedGame.background_image ? (
              <Image src={recommendedGame.background_image} alt="" fill priority sizes="(max-width: 900px) 100vw, 45vw" className="object-cover" />
            ) : (
              <div className="game-artwork-placeholder"><Gamepad2 size={34} /></div>
            )}
            <div className="ai-recommendation-artwork-scrim" />
            <span><CheckCircle2 size={14} /> Strongest of {evaluatedCount} {mode === "collection" ? "owned games" : "new discoveries"}</span>
          </div>

          <div className="ai-recommendation-content">
            <div className="ai-recommendation-heading">
              <div><span>{mode === "collection" ? "From your collection" : "New discovery"}</span><h2>{recommendedGame.title}</h2></div>
              <div className="ai-match-score" aria-label={`PlayNext match score ${recommendedGame.score} out of 100`}>
                <strong>{recommendedGame.score}</strong>
                <span>match score</span>
              </div>
            </div>

            <div className="ai-recommendation-meta">
              {recommendedGame.genres?.slice(0, 4).map((genre) => <Badge key={genre}>{genre}</Badge>)}
              {extractedIntent.availableTime && <Badge><Clock3 size={11} /> {extractedIntent.availableTime} min</Badge>}
            </div>

            <div className="ai-recommendation-explanation">
              <Sparkles size={18} aria-hidden="true" />
              <p>{recommendedGame.explanation}</p>
            </div>

            <p className="ai-decision-confidence">
              Decision confidence: <strong>{recommendedGame.selectionConfidence}%</strong>
              {recommendedGame.scoreMargin > 0 ? ` · ${recommendedGame.scoreMargin}-point lead over the next eligible match` : " · only one eligible option was available"}
            </p>

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

            {mode === "discovery" && (
              <div className="ai-discovery-actions">
                <AddRecommendedGameButton gameId={recommendedGame.id} />
                {recommendedGame.slug && (
                  <Button href={`/dashboard/search/${recommendedGame.slug}`} variant="ghost">
                    View game details <ArrowRight size={14} />
                  </Button>
                )}
              </div>
            )}

            <div className="ai-recommendation-actions">
              <Button onClick={continueConversation} variant="secondary"><Sparkles size={14} /> Refine in chat</Button>
              <Button href="/dashboard/collection" variant="ghost"><Library size={14} /> View collection <ArrowRight size={14} /></Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
