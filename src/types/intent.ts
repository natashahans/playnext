export type Mood =
  | "calm"
  | "tired"
  | "stressed"
  | "happy"
  | "sad"
  | "focused"
  | "restless"
  | "social"
  | "neutral"
  | "unknown";

export type EnergyLevel = "low" | "medium" | "high" | "unknown";
export type DifficultyPreference = "easy" | "normal" | "hard" | "unknown";
export type SessionPace = "slow" | "balanced" | "fast" | "unknown";
export type MultiplayerPreference = "solo" | "multiplayer" | "either" | "unknown";

export type DesiredExperience =
  | "relaxing"
  | "story"
  | "action"
  | "exploration"
  | "challenge"
  | "social"
  | "creative"
  | "strategic"
  | "immersive"
  | "funny"
  | "scary"
  | "surprise";

export type ExtractedIntent = {
  mood: Mood;
  availableTime: number | null;
  energyLevel: EnergyLevel;
  desiredExperience: string;
  desiredExperiences: DesiredExperience[];
  inferredExperiences?: DesiredExperience[];
  difficultyPreference: DifficultyPreference;
  sessionPace: SessionPace;
  multiplayerPreference: MultiplayerPreference;
  preferredGenres: string[];
  avoidedGenres: string[];
  referenceGames: string[];
  excludedGames?: string[];
  confidence: number;
  summary: string;
};

export type IntentChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

export type IntentChatResponse = {
  status: "needs_clarification" | "ready";
  assistantMessage: string;
  missingFields: string[];
  intent: ExtractedIntent;
};
