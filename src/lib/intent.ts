import type {
  DesiredExperience,
  DifficultyPreference,
  EnergyLevel,
  ExtractedIntent,
  IntentChatMessage,
  IntentChatResponse,
  Mood,
  MultiplayerPreference,
  SessionPace,
} from "@/types/intent";

const MOODS: Mood[] = [
  "calm", "tired", "stressed", "happy", "sad", "focused", "restless", "social", "neutral", "unknown",
];
const ENERGY_LEVELS: EnergyLevel[] = ["low", "medium", "high", "unknown"];
const DIFFICULTIES: DifficultyPreference[] = ["easy", "normal", "hard", "unknown"];
const PACES: SessionPace[] = ["slow", "balanced", "fast", "unknown"];
const MULTIPLAYER: MultiplayerPreference[] = ["solo", "multiplayer", "either", "unknown"];
const EXPERIENCES: DesiredExperience[] = [
  "relaxing", "story", "action", "exploration", "challenge", "social", "creative", "strategic", "immersive", "funny", "scary", "surprise",
];

const KNOWN_GENRES = [
  "Action", "Adventure", "RPG", "Shooter", "Strategy", "Simulation", "Platformer", "Puzzle", "Horror", "Racing", "Sports", "Indie", "Casual", "Arcade", "Family", "Fighting", "Card", "Board Games", "Educational", "Massively Multiplayer",
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim().slice(0, 240) : fallback;
}

function stringArray(value: unknown, limit = 8) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.map((item) => cleanString(item)).filter(Boolean))
  ).slice(0, limit);
}

function enumValue<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  const normalized = cleanString(value).toLowerCase();
  return options.includes(normalized as T) ? (normalized as T) : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeMinutes(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(clamp(value, 5, 720));
}

export function emptyIntent(): ExtractedIntent {
  return {
    mood: "unknown",
    availableTime: null,
    energyLevel: "unknown",
    desiredExperience: "unknown",
    desiredExperiences: [],
    difficultyPreference: "unknown",
    sessionPace: "unknown",
    multiplayerPreference: "unknown",
    preferredGenres: [],
    avoidedGenres: [],
    referenceGames: [],
    confidence: 0,
    summary: "Open to any suitable game",
  };
}

export function normalizeIntent(value: unknown): ExtractedIntent {
  const input = asRecord(value);
  const desiredExperiences = stringArray(input.desiredExperiences)
    .map((item) => item.toLowerCase())
    .filter((item): item is DesiredExperience => EXPERIENCES.includes(item as DesiredExperience));
  const legacyExperience = cleanString(input.desiredExperience).toLowerCase();

  if (desiredExperiences.length === 0 && EXPERIENCES.includes(legacyExperience as DesiredExperience)) {
    desiredExperiences.push(legacyExperience as DesiredExperience);
  }

  const confidence = typeof input.confidence === "number"
    ? clamp(input.confidence, 0, 1)
    : 0;

  return {
    mood: enumValue(input.mood, MOODS, "unknown"),
    availableTime: normalizeMinutes(input.availableTime),
    energyLevel: enumValue(input.energyLevel, ENERGY_LEVELS, "unknown"),
    desiredExperience: desiredExperiences.join(", ") || cleanString(input.desiredExperience, "unknown"),
    desiredExperiences,
    difficultyPreference: enumValue(input.difficultyPreference, DIFFICULTIES, "unknown"),
    sessionPace: enumValue(input.sessionPace, PACES, "unknown"),
    multiplayerPreference: enumValue(input.multiplayerPreference, MULTIPLAYER, "unknown"),
    preferredGenres: stringArray(input.preferredGenres, 6),
    avoidedGenres: stringArray(input.avoidedGenres, 6),
    referenceGames: stringArray(input.referenceGames, 5),
    confidence,
    summary: cleanString(input.summary, "Open to any suitable game"),
  };
}

function extractMinutes(text: string) {
  const minuteMatch = text.match(/(\d{1,3})\s*(?:minutes?|mins?)/i);
  if (minuteMatch) return normalizeMinutes(Number(minuteMatch[1]));

  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i);
  if (hourMatch) return normalizeMinutes(Number(hourMatch[1]) * 60);

  if (/half\s+(?:an?\s+)?hour/i.test(text)) return 30;
  if (/couple\s+of\s+hours/i.test(text)) return 120;
  if (/few\s+hours/i.test(text)) return 180;
  if (/all\s+evening/i.test(text)) return 240;
  if (/all\s+day/i.test(text)) return 480;
  return null;
}

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

export function fallbackIntent(messages: IntentChatMessage[]): IntentChatResponse {
  const userMessages = messages.filter((message) => message.role === "user");
  const text = userMessages.map((message) => message.content).join(" ").toLowerCase();
  const intent = emptyIntent();

  intent.availableTime = extractMinutes(text);

  if (includesAny(text, ["tired", "exhausted", "drained", "sleepy"])) intent.mood = "tired";
  else if (includesAny(text, ["stressed", "overwhelmed", "anxious"])) intent.mood = "stressed";
  else if (includesAny(text, ["happy", "great mood", "excited"])) intent.mood = "happy";
  else if (includesAny(text, ["sad", "down", "low mood"])) intent.mood = "sad";
  else if (includesAny(text, ["focused", "concentrate"])) intent.mood = "focused";
  else if (includesAny(text, ["restless", "bored"])) intent.mood = "restless";
  else if (includesAny(text, ["calm", "chill", "peaceful"])) intent.mood = "calm";

  if (includesAny(text, ["low energy", "tired", "exhausted", "drained"])) intent.energyLevel = "low";
  else if (includesAny(text, ["high energy", "energetic", "pumped", "intense"])) intent.energyLevel = "high";
  else if (includesAny(text, ["medium energy", "normal energy"])) intent.energyLevel = "medium";

  const experienceSignals: Array<[DesiredExperience, string[]]> = [
    ["relaxing", ["relax", "chill", "cozy", "cosy", "calm", "peaceful"]],
    ["story", ["story", "narrative", "plot", "characters"]],
    ["action", ["action", "combat", "fast-paced"]],
    ["exploration", ["explore", "exploration", "open world"]],
    ["challenge", ["challenge", "challenging", "difficult", "hard"]],
    ["social", ["social", "friends", "multiplayer", "co-op"]],
    ["creative", ["creative", "building", "sandbox"]],
    ["strategic", ["strategy", "strategic", "tactical"]],
    ["immersive", ["immersive", "atmospheric", "deep"]],
    ["funny", ["funny", "comedy", "lighthearted"]],
    ["scary", ["scary", "horror", "creepy", "tense"]],
    ["surprise", ["surprise me", "anything", "you choose"]],
  ];

  intent.desiredExperiences = experienceSignals
    .filter(([, signals]) => includesAny(text, signals))
    .map(([experience]) => experience);
  intent.desiredExperience = intent.desiredExperiences.join(", ") || "unknown";

  if (includesAny(text, ["easy", "forgiving", "no stress"])) intent.difficultyPreference = "easy";
  else if (includesAny(text, ["hard", "difficult", "challenge", "punishing"])) intent.difficultyPreference = "hard";
  else if (includesAny(text, ["normal difficulty", "balanced difficulty"])) intent.difficultyPreference = "normal";

  if (includesAny(text, ["fast", "fast-paced", "quick action"])) intent.sessionPace = "fast";
  else if (includesAny(text, ["slow", "slow-paced", "take my time"])) intent.sessionPace = "slow";

  if (includesAny(text, ["solo", "single-player", "single player", "alone"])) intent.multiplayerPreference = "solo";
  else if (includesAny(text, ["multiplayer", "co-op", "with friends"])) intent.multiplayerPreference = "multiplayer";

  intent.preferredGenres = KNOWN_GENRES.filter((genre) => text.includes(genre.toLowerCase())).slice(0, 6);
  const signalCount = [
    intent.availableTime !== null,
    intent.mood !== "unknown",
    intent.energyLevel !== "unknown",
    intent.desiredExperiences.length > 0,
    intent.preferredGenres.length > 0,
    intent.difficultyPreference !== "unknown",
  ].filter(Boolean).length;

  intent.confidence = clamp(signalCount / 4, 0.2, 0.9);
  intent.summary = buildIntentSummary(intent);
  const ready = signalCount > 0 || userMessages.length >= 2;

  return {
    status: ready ? "ready" : "needs_clarification",
    assistantMessage: ready
      ? `Understood — ${intent.summary.toLowerCase()}. I’ll compare the strongest matches in your collection now.`
      : "I can help with that. How much time do you have, and do you want something relaxing, story-focused, or challenging?",
    missingFields: ready ? [] : ["availableTime", "desiredExperiences"],
    intent,
  };
}

export function buildIntentSummary(intent: ExtractedIntent) {
  const parts: string[] = [];
  if (intent.availableTime) parts.push(`${intent.availableTime} minutes`);
  if (intent.energyLevel !== "unknown") parts.push(`${intent.energyLevel} energy`);
  if (intent.mood !== "unknown") parts.push(`${intent.mood} mood`);
  if (intent.desiredExperiences.length > 0) parts.push(intent.desiredExperiences.join(" and "));
  if (intent.difficultyPreference !== "unknown") parts.push(`${intent.difficultyPreference} difficulty`);
  return parts.length > 0 ? parts.join(", ") : "an open-ended session";
}

export function normalizeChatResponse(value: unknown, messages: IntentChatMessage[]): IntentChatResponse {
  const fallback = fallbackIntent(messages);
  const input = asRecord(value);
  const intent = normalizeIntent(input.intent);
  const userTurnCount = messages.filter((message) => message.role === "user").length;
  const hasSignal =
    intent.availableTime !== null ||
    intent.mood !== "unknown" ||
    intent.energyLevel !== "unknown" ||
    intent.desiredExperiences.length > 0 ||
    intent.preferredGenres.length > 0 ||
    intent.difficultyPreference !== "unknown";
  const requestedStatus = cleanString(input.status);
  const ready = requestedStatus === "ready" && hasSignal || userTurnCount >= 2;

  intent.summary = intent.summary || buildIntentSummary(intent);

  return {
    status: ready ? "ready" : "needs_clarification",
    assistantMessage: cleanString(input.assistantMessage, fallback.assistantMessage),
    missingFields: ready ? [] : stringArray(input.missingFields, 4),
    intent,
  };
}
