"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  Compass,
  Gamepad2,
  Library,
  RotateCcw,
  Send,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import FeedbackButtons from "@/components/recommendations/FeedbackButtons";
import AddRecommendedGameButton from "@/components/recommendations/AddRecommendedGameButton";
import { assessRecommendationDecision, scoreGames } from "@/lib/recommendationEngine";
import type { GameDetailPayload, RawgGame } from "@/lib/rawg";
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
  initialDecisionMessage,
  loadDecisionSession,
  saveDecisionSession,
  type DecisionChatMessage,
  type RecommendationTurn,
  type StoredDecisionState,
} from "@/lib/decision-session";
import {
  answerRecommendationFollowUp,
  classifyRecommendationFollowUp,
  isSimpleReplacementRequest,
} from "@/lib/recommendation/follow-up";

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

function createMessage(role: "assistant" | "user", content: string): DecisionChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    content,
  };
}

function withCurrentGameExcluded(intent: ExtractedIntent, game: ScoredGame | null) {
  if (!game) return intent;

  return {
    ...intent,
    excludedGames: Array.from(new Set([...(intent.excludedGames ?? []), game.title])),
  };
}

export default function RecommendPage() {
  const [mode, setMode] = useState<RecommendationMode>("collection");
  const [messages, setMessages] = useState<DecisionChatMessage[]>([initialDecisionMessage("collection")]);
  const [draft, setDraft] = useState("");
  const [interpreting, setInterpreting] = useState(false);
  const [ranking, setRanking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [extractedIntent, setExtractedIntent] = useState<ExtractedIntent | null>(null);
  const [recommendedGame, setRecommendedGame] = useState<ScoredGame | null>(null);
  const [recommendationId, setRecommendationId] = useState<string | null>(null);
  const [evaluatedCount, setEvaluatedCount] = useState(0);
  const [scoreDetailsTurn, setScoreDetailsTurn] = useState<RecommendationTurn | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const chatThreadRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
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

  useLayoutEffect(() => {
    if (!storageReady) return;

    const thread = chatThreadRef.current;
    if (!thread) return;

    thread.scrollTop = thread.scrollHeight;
  }, [storageReady, messages.at(-1)?.id]);

  useEffect(() => {
    if (!scoreDetailsTurn) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setScoreDetailsTurn(null);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [scoreDetailsTurn]);

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
      const recommendationTurn: RecommendationTurn = {
        game: bestGame,
        recommendationId: recommendationData.id,
        evaluatedCount: candidateGames.length,
        mode,
        availableTime: intent.availableTime,
      };
      setMessages((current) => [
        ...current,
        {
          ...createMessage(
            "assistant",
            `${bestGame.title} is the strongest match for what you described. I checked ${candidateGames.length} ${mode === "collection" ? "games in your library" : "new discoveries"} before choosing it.`
          ),
          recommendation: recommendationTurn,
        },
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
    setInterpreting(true);

    try {
      if (recommendedGame) {
        const followUpKind = classifyRecommendationFollowUp(content);

        if (followUpKind !== "change") {
          let description: string | null = null;

          if (followUpKind === "about" && recommendedGame.slug) {
            try {
              const detailsResponse = await authenticatedFetch(
                `/api/games/${encodeURIComponent(recommendedGame.slug)}`
              );
              if (detailsResponse.ok) {
                const details = (await detailsResponse.json()) as GameDetailPayload;
                description = details.game.description_raw;
              }
            } catch {
              // The grounded catalogue fields below still provide a safe fallback.
            }
          }

          const answer = answerRecommendationFollowUp(
            followUpKind,
            recommendedGame,
            description
          );
          setMessages([...nextMessages, createMessage("assistant", answer)]);
          setInterpreting(false);
          return;
        }

        if (extractedIntent && isSimpleReplacementRequest(content)) {
          setInterpreting(false);
          await createRecommendation(
            withCurrentGameExcluded(extractedIntent, recommendedGame),
            nextMessages
          );
          return;
        }
      }

      const intentMessages = nextMessages
        .filter((message) => !message.recommendation)
        .map(({ id, role, content: messageContent }) => ({
          id,
          role,
          content: messageContent,
        }));
      const response = await authenticatedFetch("/api/extract-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: intentMessages }),
      });

      if (!response.ok) throw new Error("PlayNext could not understand that message.");

      const result = (await response.json()) as IntentChatResponse;
      const assistantMessage = createMessage("assistant", result.assistantMessage);
      const completedConversation = [...nextMessages, assistantMessage];

      setMessages(completedConversation);
      setExtractedIntent(result.intent);
      setInterpreting(false);

      const assistantIsAsking = result.assistantMessage.trim().endsWith("?");
      if (result.status === "ready" && !assistantIsAsking) {
        await createRecommendation(result.intent, completedConversation);
      }
    } catch (error) {
      setInterpreting(false);
      setRanking(false);
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong while creating your recommendation.");
    }
  }

  function resetConversation(nextMode: RecommendationMode) {
    setMessages([initialDecisionMessage(nextMode)]);
    setDraft("");
    setErrorMessage("");
    setExtractedIntent(null);
    setRecommendedGame(null);
    setRecommendationId(null);
    setEvaluatedCount(0);
    setScoreDetailsTurn(null);
    window.setTimeout(() => composerRef.current?.focus(), 0);
  }

  function changeMode(nextMode: RecommendationMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    resetConversation(nextMode);
  }

  function startNewChat() {
    if (interpreting || ranking) return;
    resetConversation(mode);
  }

  async function findAnotherRecommendation() {
    if (!extractedIntent || ranking || interpreting) return;
    setRecommendedGame(null);
    setRecommendationId(null);
    setScoreDetailsTurn(null);
    setErrorMessage("");
    const acknowledgement = createMessage(
      "assistant",
      "Got it. I’ll use that feedback and look for a better fit."
    );
    const nextMessages = [...messages, acknowledgement];
    setMessages(nextMessages);
    try {
      await createRecommendation(
        withCurrentGameExcluded(extractedIntent, recommendedGame),
        nextMessages
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "A different match could not be found.");
    }
  }

  function renderRecommendationTurn(message: DecisionChatMessage) {
    const turn = message.recommendation;
    if (!turn) return null;
    const game = turn.game;

    return (
      <div key={message.id} className="ai-message ai-message-assistant ai-message-result ai-recommendation-turn">
        <span><Sparkles size={15} /></span>
        <div className="ai-inline-recommendation">
          <div className="ai-inline-recommendation-art">
            {game.background_image ? (
              <Image src={game.background_image} alt="" fill sizes="(max-width: 680px) 88vw, 190px" className="object-cover" />
            ) : (
              <div className="game-artwork-placeholder"><Gamepad2 size={26} /></div>
            )}
            <div className="ai-inline-art-scrim" />
            <span><CheckCircle2 size={12} /> Best of {turn.evaluatedCount}</span>
          </div>

          <div className="ai-inline-recommendation-body">
            <div className="ai-inline-recommendation-heading">
              <div>
                <span>{turn.mode === "collection" ? "From your library" : "New discovery"}</span>
                <h2>{game.title}</h2>
              </div>
              <div className="ai-match-score" aria-label={`PlayNext match score ${game.score} out of 100`}>
                <strong>{game.score}</strong><span>match</span>
              </div>
            </div>

            <div className="ai-recommendation-meta">
              {game.genres?.slice(0, 2).map((genre) => <Badge key={genre}>{genre}</Badge>)}
              {turn.availableTime && <Badge><Clock3 size={11} /> {turn.availableTime} min</Badge>}
            </div>

            <p className="ai-recommendation-summary">{game.explanation}</p>

            <div className="ai-inline-actions">
              <button type="button" className="ai-score-trigger" onClick={() => setScoreDetailsTurn(turn)}>
                Why this recommendation <ArrowRight size={14} />
              </button>
              {game.slug && (
                <Button href={`/dashboard/search/${game.slug}`} variant="ghost" className="ai-game-details-link">
                  Game details <ArrowRight size={14} />
                </Button>
              )}
              {turn.mode === "discovery" && <AddRecommendedGameButton gameId={game.id} />}
            </div>
          </div>

          <div className="ai-inline-feedback">
            <FeedbackButtons recommendationId={turn.recommendationId} onFindAnother={findAnotherRecommendation} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-decide-page">
      <section className="ai-chat-shell" aria-label="PlayNext decision assistant">
        <div className="ai-chat-toolbar">
          <div className="ai-chat-identity">
            <span><Bot size={18} aria-hidden="true" /></span>
            <div>
              <strong>PlayNext</strong>
              {/* <p>Decision assistant</p> */}
            </div>
          </div>

          <div className="ai-chat-toolbar-actions">
            <button
              type="button"
              className="ai-new-chat-button"
              onClick={startNewChat}
              disabled={interpreting || ranking || (messages.length === 1 && !draft && !recommendedGame && !errorMessage)}
              aria-label="Start a new decision conversation"
              title="Clear this conversation and start again"
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>New chat</span>
            </button>

            <div className="ai-source-control">
              <span>Recommend from</span>
              <div className="ai-source-switch" role="radiogroup" aria-label="Choose where PlayNext recommends from">
                <button
                  type="button"
                  role="radio"
                  aria-checked={mode === "collection"}
                  className={mode === "collection" ? "is-active" : ""}
                  onClick={() => changeMode("collection")}
                  disabled={interpreting || ranking}
                  title="Recommend only games already in your collection"
                >
                  <Library size={14} aria-hidden="true" /> My library
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
        </div>

        <div ref={chatThreadRef} className={`ai-chat-thread ${messages.length === 1 ? "is-opening" : ""}`} aria-live="polite">
            {messages.map((message, index) => message.recommendation
              ? renderRecommendationTurn(message)
              : (
              <div key={message.id} className={`ai-message ai-message-${message.role} ${index === 0 ? "ai-message-opening" : ""}`}>
                <span>{message.role === "assistant" ? <Bot size={15} /> : <UserRound size={15} />}</span>
                <div>
                  <small>{message.role === "assistant" ? "PlayNext" : "You"}</small>
                  <div className="ai-message-bubble">
                    {index === 0 && (
                      <h1>{mode === "collection" ? "What are you in the mood for?" : "What would you like to discover?"}</h1>
                    )}
                    <p>
                      {index === 0
                        ? mode === "collection"
                          ? "Share your mood, the time you have, and the experience you want. I’ll find the strongest fit in your library."
                          : "Share your mood, the time you have, and the experience you want. I’ll find something new that fits this session."
                        : message.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {interpreting && (
              <div className="ai-message ai-message-assistant">
                <span><Bot size={15} /></span>
                <div>
                  <small>PlayNext</small>
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

            {errorMessage && (
              <div className="ai-decide-error" role="alert">
                <strong>That decision could not be completed.</strong>
                <span>{errorMessage}</span>
              </div>
            )}
            <div
              className="ai-chat-scroll-anchor"
              aria-hidden="true"
            />
            <div aria-hidden="true" className="ai-chat-scroll-anchor" />

        </div>

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
              ref={composerRef}
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
              placeholder={recommendedGame
                ? "Ask for a different recommendation…"
                : "Tell me what you feel like playing…"}
              maxLength={700}
              rows={1}
              disabled={interpreting || ranking}
              aria-label="Message PlayNext AI"
            />
            <div>
              <span>Enter to send</span>
              <button type="submit" disabled={!draft.trim() || interpreting || ranking} aria-label="Send message">
                <Send size={16} aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>
      </section>

      {scoreDetailsTurn && (
        <div className="ai-insight-overlay" role="presentation" onMouseDown={() => setScoreDetailsTurn(null)}>
          <section className="ai-insight-drawer" role="dialog" aria-modal="true" aria-labelledby="score-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><span>Recommendation details</span><h2 id="score-dialog-title">Why this fits</h2></div>
              <button type="button" onClick={() => setScoreDetailsTurn(null)} aria-label="Close recommendation details"><X aria-hidden="true" /></button>
            </header>

            <div className="ai-insight-content">
              <div className="ai-insight-game">
                {scoreDetailsTurn.game.background_image ? (
                  <Image src={scoreDetailsTurn.game.background_image} alt="" width={84} height={84} />
                ) : (
                  <span><Gamepad2 size={22} /></span>
                )}
                <div>
                  <p>{scoreDetailsTurn.mode === "collection" ? "From your library" : "New discovery"}</p>
                  <h3>{scoreDetailsTurn.game.title}</h3>
                  <strong>{scoreDetailsTurn.game.score}% match</strong>
                </div>
              </div>

              <section className="ai-insight-section">
                <h3>Matched to this session</h3>
                <div className="ai-insight-reasons">
                  {scoreDetailsTurn.game.matchReasons.slice(0, 3).map((reason) => (
                    <div key={reason}><CheckCircle2 size={15} /><span>{reason}</span></div>
                  ))}
                </div>
              </section>

              <section className="ai-insight-section">
                <div className="ai-insight-section-heading">
                  <h3>Score breakdown</h3>
                  <span>{scoreDetailsTurn.evaluatedCount} games checked</span>
                </div>
                <div className="ai-insight-score-list">
                  {scoreDetailsTurn.game.scoreBreakdown.map((item) => (
                    <article key={item.category}>
                      <div>
                        <span>{item.category}</span>
                        <strong className={item.points >= 0 ? "score-positive" : "score-negative"}>{item.points >= 0 ? "+" : ""}{item.points}</strong>
                      </div>
                      <h4>{item.label}</h4>
                      <p>{item.detail}</p>
                    </article>
                  ))}
                </div>
              </section>

              <p className="ai-insight-evidence">
                PlayNext ranked {scoreDetailsTurn.evaluatedCount} {scoreDetailsTurn.mode === "collection" ? "games you own" : "new games"} using this conversation, saved preferences, previous feedback and recommendation history.
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
