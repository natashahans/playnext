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

const EXPERIENCE_SIGNAL_WORDS: Array<[DesiredExperience, string[]]> = [
  ["relaxing", ["relax", "chill", "cozy", "cosy", "calm", "peaceful", "unwind", "stress free", "low stress", "before bed", "wind down"]],
  ["story", ["story", "narrative", "plot", "characters", "character-driven", "emotional", "emotive", "heartfelt", "cinematic", "dramatic", "story-driven"]],
  ["action", ["action", "combat", "fast-paced", "thrilling", "intense", "adrenaline"]],
  ["exploration", ["explore", "exploration", "open world", "wander"]],
  ["challenge", ["challenge", "challenging", "difficult", "hard", "punishing", "stressful", "demanding"]],
  ["social", ["social", "friends", "multiplayer", "co-op"]],
  ["creative", ["creative", "building", "sandbox"]],
  ["strategic", ["strategy", "strategic", "tactical"]],
  ["immersive", ["immersive", "atmospheric", "deep"]],
  ["funny", ["funny", "comedy", "lighthearted"]],
  ["scary", ["scary", "horror", "creepy", "tense"]],
  ["surprise", ["surprise me", "anything", "you choose"]],
];

const EXPERIENCE_SIGNAL_LOOKUP = new Map(EXPERIENCE_SIGNAL_WORDS);

const TIME_SIGNAL_WORDS: Array<[number, string[]]> = [
  [30, ["half an hour", "half hour", "30 minutes", "30 minute", "quick session", "short session", "little time", "not long", "before bed"]],
  [60, ["an hour", "one hour", "around an hour", "about an hour"]],
  [120, ["couple of hours", "a couple hours", "two hours", "few hours", "some time", "medium session"]],
  [240, ["all evening", "all night", "all day", "plenty of time", "have time to spare", "the whole evening", "the whole night", "all weekend"]],
  [180, ["all afternoon", "long session", "a while", "no rush", "long time"]],
  [480, ["all day", "all weekend", "entire day", "entire weekend"]],
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

function experienceSignals(experience: DesiredExperience) {
  return EXPERIENCE_SIGNAL_LOOKUP.get(experience) ?? [];
}

function matchesExperienceSignal(text: string, experience: DesiredExperience) {
  return includesAny(text, experienceSignals(experience));
}

function extractTimeSignal(text: string) {
  const normalizedText = text.toLowerCase();

  for (const [minutes, phrases] of TIME_SIGNAL_WORDS) {
    if (includesAny(normalizedText, phrases)) return minutes;
  }

  return null;
}

function describeTime(minutes: number) {
  if (minutes <= 30) return "you only have a short session";
  if (minutes <= 60) return "you have about an hour";
  if (minutes <= 120) return "you have a couple of hours";
  if (minutes <= 240) return "you have plenty of time";
  return "you have a very long stretch of time";
}

function describeExperience(experience: DesiredExperience) {
  switch (experience) {
    case "relaxing": return "something relaxing";
    case "story": return "a story-driven game";
    case "action": return "something action-heavy";
    case "exploration": return "something exploratory";
    case "challenge": return "a challenging game";
    case "social": return "a co-op or multiplayer game";
    case "creative": return "something creative";
    case "strategic": return "something strategic";
    case "immersive": return "something immersive";
    case "funny": return "something funny";
    case "scary": return "something scary";
    case "surprise": return "something open-ended";
  }
}

function describeMood(mood: Mood) {
  switch (mood) {
    case "calm": return "you’re in a calm mood";
    case "tired": return "you sound tired";
    case "stressed": return "you’re feeling stressed";
    case "happy": return "you’re in a good mood";
    case "sad": return "you’re feeling low";
    case "focused": return "you want to stay focused";
    case "restless": return "you want something that keeps you engaged";
    case "social": return "you want something social";
    case "neutral": return "you’re keeping it open";
    case "unknown": return "";
  }
}

export function emptyIntent(): ExtractedIntent {
  return {
    mood: "unknown",
    availableTime: null,
    energyLevel: "unknown",
    desiredExperience: "unknown",
    desiredExperiences: [],
    inferredExperiences: [],
    difficultyPreference: "unknown",
    sessionPace: "unknown",
    multiplayerPreference: "unknown",
    preferredGenres: [],
    avoidedGenres: [],
    referenceGames: [],
    excludedGames: [],
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
  const inferredExperiences = stringArray(input.inferredExperiences)
    .map((item) => item.toLowerCase())
    .filter((item): item is DesiredExperience => EXPERIENCES.includes(item as DesiredExperience));

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
    inferredExperiences,
    difficultyPreference: enumValue(input.difficultyPreference, DIFFICULTIES, "unknown"),
    sessionPace: enumValue(input.sessionPace, PACES, "unknown"),
    multiplayerPreference: enumValue(input.multiplayerPreference, MULTIPLAYER, "unknown"),
    preferredGenres: stringArray(input.preferredGenres, 6),
    avoidedGenres: stringArray(input.avoidedGenres, 6),
    referenceGames: stringArray(input.referenceGames, 5),
    excludedGames: stringArray(input.excludedGames, 5),
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
  if (/\b(?:an|one)\s+hour\b/i.test(text)) return 60;
  if (/couple\s+of\s+hours/i.test(text)) return 120;
  if (/few\s+hours/i.test(text)) return 180;
  if (/all\s+evening/i.test(text)) return 240;
  if (/all\s+day/i.test(text)) return 480;
  return null;
}

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractAvoidedGenres(text: string) {
  const avoided = new Set<string>();
  const exclusionClauses = text.matchAll(
    /\b(?:not|no|avoid|without|except|anything but)\s+(?:any\s+)?([^.!?;]+)/gi
  );

  for (const match of exclusionClauses) {
    // Stop when the sentence changes direction so that "no horror, but I want RPG"
    // does not accidentally treat RPG as an exclusion.
    const clause = match[1].split(/\b(?:but|although|though|because|while|instead)\b/i)[0];

    for (const genre of KNOWN_GENRES) {
      if (new RegExp(`\\b${escapeRegExp(genre)}\\b`, "i").test(clause)) {
        avoided.add(genre);
      }
    }
  }

  return Array.from(avoided);
}

function extractExcludedGames(text: string) {
  const excluded = new Set<string>();
  const clauses = text.matchAll(
    /\b(?:not|avoid|skip|without|anything but|except|do not want|don't want)\s+([a-z0-9][a-z0-9:'’&.\- ]{1,60}?)(?=[,.!?;]|$|\b(?:but|instead|because)\b)/gi
  );
  const nonTitles = new Set([
    "my mood", "in the mood", "interested", "too long", "too difficult",
    "horror", "action", "adventure", "rpg", "shooter", "strategy", "simulation",
    "platformer", "puzzle", "racing", "sports", "indie", "casual", "arcade",
  ]);

  for (const match of clauses) {
    const candidate = match[1]
      .replace(/\b(?:the game|game|please|again|this time)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (candidate.length >= 2 && !nonTitles.has(candidate.toLowerCase())) excluded.add(candidate);
  }

  return Array.from(excluded).slice(0, 5);
}

export function fallbackIntent(messages: IntentChatMessage[]): IntentChatResponse {
  const userMessages = messages.filter((message) => message.role === "user");
  const originalText = userMessages.map((message) => message.content).join(" ");
  const text = originalText.toLowerCase();
  const latestOriginal = userMessages.at(-1)?.content ?? "";
  const latestText = latestOriginal.toLowerCase();
  const intent = emptyIntent();

  intent.availableTime = extractMinutes(text) ?? extractTimeSignal(text);
  const latestMinutes = extractMinutes(latestText);
  const latestTimeSignal = extractTimeSignal(latestText);

  if (includesAny(text, ["tired", "exhausted", "drained", "sleepy", "burnt out", "burned out"])) intent.mood = "tired";
  else if (includesAny(text, ["stressed", "overwhelmed", "anxious"])) intent.mood = "stressed";
  else if (includesAny(text, ["happy", "great mood", "excited"])) intent.mood = "happy";
  else if (includesAny(text, ["sad", "down", "low mood"])) intent.mood = "sad";
  else if (includesAny(text, ["focused", "concentrate"])) intent.mood = "focused";
  else if (includesAny(text, ["restless", "bored"])) intent.mood = "restless";
  else if (includesAny(text, ["social", "with people", "with friends"])) intent.mood = "social";
  else if (includesAny(text, ["calm", "chill", "peaceful"])) intent.mood = "calm";

  if (includesAny(text, ["low energy", "tired", "exhausted", "drained"])) intent.energyLevel = "low";
  else if (includesAny(text, ["high energy", "energetic", "pumped", "intense"])) intent.energyLevel = "high";
  else if (includesAny(text, ["medium energy", "normal energy"])) intent.energyLevel = "medium";

  if (includesAny(text, ["stress free", "low stress", "no stress", "not too stressful", "nothing too stressful", "before bed", "wind down"])) {
    intent.difficultyPreference = "easy";
  }

  intent.desiredExperiences = EXPERIENCE_SIGNAL_WORDS
    .filter(([, signals]) => includesAny(text, signals))
    .map(([experience]) => experience);

  const latestExperiences = EXPERIENCE_SIGNAL_WORDS
    .filter(([, signals]) => includesAny(latestText, signals))
    .map(([experience]) => experience);
  const changesSession = /\b(?:actually|instead|now|rather|change|i want something|give me something)\b/i.test(latestText);
  if (changesSession && latestExperiences.length > 0) {
    intent.desiredExperiences = latestExperiences;
  }
  if (changesSession && (latestMinutes !== null || latestTimeSignal !== null)) intent.availableTime = latestMinutes ?? latestTimeSignal;
  intent.desiredExperience = intent.desiredExperiences.join(", ") || "unknown";

  if (/\b(?:aggressive|pumped|high[- ]energy|intense|thrilling)\b/i.test(latestText)) intent.energyLevel = "high";
  if (changesSession && /\b(?:shorter|less time|quicker|brief|short session)\b/i.test(latestText)) {
    intent.availableTime = 30;
  }
  if (changesSession && /\b(?:longer|long|plenty of time|all evening|all day|no rush|deep session|long session)\b/i.test(latestText) && latestMinutes === null) {
    intent.availableTime = latestTimeSignal ?? 240;
  }
  if (includesAny(text, ["before bed", "wind down", "calm", "chill", "relax"])) {
    intent.sessionPace = "slow";
  }

  if (includesAny(text, ["easy", "forgiving", "no stress"])) intent.difficultyPreference = "easy";
  else if (includesAny(text, ["hard", "difficult", "challenge", "punishing"])) intent.difficultyPreference = "hard";
  else if (includesAny(text, ["normal difficulty", "balanced difficulty"])) intent.difficultyPreference = "normal";

  if (includesAny(text, ["fast", "fast-paced", "quick action"])) intent.sessionPace = "fast";
  else if (includesAny(text, ["slow", "slow-paced", "take my time"])) intent.sessionPace = "slow";
  else if (includesAny(text, ["balanced pace", "medium pace"])) intent.sessionPace = "balanced";

  if (includesAny(text, ["solo", "single-player", "single player", "alone"])) intent.multiplayerPreference = "solo";
  else if (includesAny(text, ["multiplayer", "co-op", "with friends"])) intent.multiplayerPreference = "multiplayer";
  else if (includesAny(text, ["either solo or multiplayer", "either is fine", "no preference"])) intent.multiplayerPreference = "either";

  intent.avoidedGenres = extractAvoidedGenres(text).slice(0, 6);
  intent.excludedGames = extractExcludedGames(originalText);

  const avoided = new Set(intent.avoidedGenres.map((genre) => genre.toLowerCase()));
  intent.preferredGenres = KNOWN_GENRES.filter((genre) => {
    const normalizedGenre = genre.toLowerCase();
    return text.includes(normalizedGenre) && !avoided.has(normalizedGenre);
  }).slice(0, 6);

  // The latest turn can explicitly correct a preference captured earlier.
  intent.avoidedGenres.forEach((genre) => {
    if (latestText.includes(`actually ${genre.toLowerCase()}`) || latestText.includes(`i want ${genre.toLowerCase()}`)) {
      intent.avoidedGenres = intent.avoidedGenres.filter((item) => item !== genre);
      if (!intent.preferredGenres.includes(genre)) intent.preferredGenres.push(genre);
    }
  });
  const signalCount = [
    intent.availableTime !== null,
    intent.mood !== "unknown",
    intent.energyLevel !== "unknown",
    intent.desiredExperiences.length > 0,
    intent.preferredGenres.length > 0,
    intent.avoidedGenres.length > 0,
    intent.difficultyPreference !== "unknown",
    intent.sessionPace !== "unknown",
    intent.multiplayerPreference !== "unknown" && intent.multiplayerPreference !== "either",
    intent.referenceGames.length > 0,
    intent.excludedGames.length > 0,
  ].filter(Boolean).length;

  intent.confidence = clamp(signalCount / 4, 0.2, 0.9);
  intent.summary = buildIntentSummary(intent);
  const ready = signalCount > 0 || userMessages.length >= 2;

  return {
    status: ready ? "ready" : "needs_clarification",
    assistantMessage: ready
      ? `Understood — ${intent.summary.toLowerCase()}. I’ll compare the strongest matches in your collection now.`
      : "I can help with that. What kind of session do you want right now?",
    missingFields: ready ? [] : ["desiredExperiences"],
    intent,
  };
}

export function buildIntentSummary(intent: ExtractedIntent) {
  const parts: string[] = [];
  if (intent.availableTime) parts.push(describeTime(intent.availableTime));
  if (intent.mood !== "unknown") parts.push(describeMood(intent.mood));
  if (intent.energyLevel === "low") parts.push("you’re low on energy");
  else if (intent.energyLevel === "high") parts.push("you want something energetic");
  if (intent.desiredExperiences.length > 0) {
    const experienceSummary = intent.desiredExperiences.map(describeExperience).join(" and ");
    parts.push(`you want ${experienceSummary}`);
  }
  if (intent.preferredGenres.length > 0) parts.push(`you like ${intent.preferredGenres.join(" and ")}`);
  if (intent.difficultyPreference !== "unknown") parts.push(`you prefer ${intent.difficultyPreference} difficulty`);
  if (parts.length === 0) return "an open-ended session";
  return parts.join(", ");
}

export function normalizeChatResponse(value: unknown, messages: IntentChatMessage[]): IntentChatResponse {
  const fallback = fallbackIntent(messages);
  const input = asRecord(value);
  const modelIntent = normalizeIntent(input.intent);
  const userText = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content.toLowerCase().replace(/[^a-z0-9]+/g, " "))
    .join(" ");
  const groundedReferences = modelIntent.referenceGames.filter((game) => {
    const target = game.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return target.length >= 3 && userText.includes(target);
  });
  const groundedModelGenres = modelIntent.preferredGenres.filter((genre) =>
    userText.includes(genre.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())
  );
  const groundedModelExperiences = modelIntent.desiredExperiences.filter((experience) =>
    matchesExperienceSignal(userText, experience)
  );
  const explicitExperiences = Array.from(new Set([
    ...fallback.intent.desiredExperiences,
    ...groundedModelExperiences,
  ]));
  const groundedExcludedGames = (modelIntent.excludedGames ?? []).filter((game) => {
    const target = game.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return target.length >= 2 && userText.includes(target);
  });
  const inferredExperiences = groundedReferences.length > 0
    ? Array.from(new Set([
      ...(modelIntent.inferredExperiences ?? []),
      ...modelIntent.desiredExperiences.filter((item) => !explicitExperiences.includes(item)),
    ])).slice(0, 2)
    : [];
  const intent = normalizeIntent({
    ...modelIntent,
    availableTime: fallback.intent.availableTime ?? modelIntent.availableTime,
    mood: fallback.intent.mood !== "unknown" ? fallback.intent.mood : modelIntent.mood,
    energyLevel: fallback.intent.energyLevel !== "unknown" ? fallback.intent.energyLevel : modelIntent.energyLevel,
    desiredExperiences: explicitExperiences,
    inferredExperiences,
    preferredGenres: Array.from(new Set([
      ...fallback.intent.preferredGenres,
      ...groundedModelGenres,
    ])).filter((genre) => !fallback.intent.avoidedGenres.includes(genre)),
    avoidedGenres: fallback.intent.avoidedGenres,
    referenceGames: groundedReferences,
    excludedGames: Array.from(new Set([
      ...(fallback.intent.excludedGames ?? []),
      ...groundedExcludedGames,
    ])),
  });
  const userTurnCount = messages.filter((message) => message.role === "user").length;
  const hasSpecificExperience = intent.desiredExperiences.some((experience) => experience !== "surprise");
  const hasSignal =
    intent.availableTime !== null ||
    intent.mood !== "unknown" ||
    intent.energyLevel !== "unknown" ||
    hasSpecificExperience ||
    intent.preferredGenres.length > 0 ||
    intent.avoidedGenres.length > 0 ||
    intent.difficultyPreference !== "unknown";
  const requestedStatus = cleanString(input.status);
  const ready = requestedStatus === "ready" && hasSignal || userTurnCount >= 2;

  const evidenceSignals = [
    intent.availableTime !== null,
    intent.mood !== "unknown",
    intent.energyLevel !== "unknown",
    intent.desiredExperiences.length > 0,
    intent.preferredGenres.length > 0,
    intent.avoidedGenres.length > 0,
    intent.difficultyPreference !== "unknown",
    intent.sessionPace !== "unknown",
    intent.multiplayerPreference !== "unknown",
    intent.referenceGames.length > 0,
    (intent.excludedGames ?? []).length > 0,
    (intent.inferredExperiences ?? []).length > 0,
  ].filter(Boolean).length;
  intent.confidence = Math.min(intent.confidence, clamp(0.3 + evidenceSignals * 0.11, 0.3, 0.96));
  intent.summary = buildIntentSummary(intent);

  return {
    status: ready ? "ready" : "needs_clarification",
    assistantMessage: cleanString(input.assistantMessage, fallback.assistantMessage),
    missingFields: ready ? [] : stringArray(input.missingFields, 4),
    intent,
  };
}
