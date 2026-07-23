import type { ScoredGame, RecommendationMode } from "@/lib/recommendation/types";
import type { ExtractedIntent, IntentChatMessage } from "@/types/intent";

export type RecommendationTurn = {
  game: ScoredGame;
  recommendationId: string;
  evaluatedCount: number;
  mode: RecommendationMode;
  availableTime: number | null;
};

export type DecisionChatMessage = IntentChatMessage & {
  recommendation?: RecommendationTurn;
};

export type StoredDecisionState = {
  mode: RecommendationMode;
  messages: DecisionChatMessage[];
  extractedIntent: ExtractedIntent | null;
  recommendedGame: ScoredGame | null;
  recommendationId: string | null;
  evaluatedCount: number;
};

const DECISION_STORAGE_KEY = "playnext:active-decision:v3";

export function initialDecisionMessage(mode: RecommendationMode): DecisionChatMessage {
  return {
    id: `assistant-welcome-${mode}`,
    role: "assistant",
    content:
      mode === "collection"
        ? "Tell me about the play session you want right now. I’ll choose the strongest fit from games you already own."
        : "Tell me what kind of new game would fit right now. I’ll search beyond your collection and find a discovery matched to this session.",
  };
}

export function loadDecisionSession(): StoredDecisionState | null {
  try {
    const saved = window.sessionStorage.getItem(DECISION_STORAGE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved) as Partial<StoredDecisionState>;
    const validMode = parsed.mode === "collection" || parsed.mode === "discovery";
    const validMessages = Array.isArray(parsed.messages) && parsed.messages.length > 0;
    if (!validMode || !validMessages) return null;

    return {
      mode: parsed.mode as RecommendationMode,
      messages: parsed.messages as DecisionChatMessage[],
      extractedIntent: parsed.extractedIntent ?? null,
      recommendedGame: parsed.recommendedGame ?? null,
      recommendationId: parsed.recommendationId ?? null,
      evaluatedCount: parsed.evaluatedCount ?? 0,
    };
  } catch {
    clearDecisionSession();
    return null;
  }
}

export function saveDecisionSession(state: StoredDecisionState) {
  window.sessionStorage.setItem(DECISION_STORAGE_KEY, JSON.stringify(state));
}

export function clearDecisionSession() {
  window.sessionStorage.removeItem(DECISION_STORAGE_KEY);
}
