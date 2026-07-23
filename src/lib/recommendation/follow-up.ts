import type { ScoredGame } from "./types.ts";

export type RecommendationFollowUpKind =
  | "about"
  | "why"
  | "playtime"
  | "platforms"
  | "genres"
  | "multiplayer"
  | "change"
  | "conversation";

function normalized(value: string) {
  return value.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}

export function classifyRecommendationFollowUp(input: string): RecommendationFollowUpKind {
  const message = normalized(input);

  if (/\b(why (this|it|that)|why did you|why recommend|how (was|is) (this|it) (chosen|a match)|why this recommendation)\b/.test(message)) {
    return "why";
  }
  if (/\b(what('?s| is) (it|this|that) about|tell me (more )?about (it|this|that|the game)|what is the (story|plot|premise)|summary|synopsis)\b/.test(message)) {
    return "about";
  }
  if (/\b(how long|playtime|length|hours|time to (beat|finish|complete))\b/.test(message)) {
    return "playtime";
  }
  if (/\b(platform|platforms|where can i play|what can i play it on|console|pc|playstation|xbox|switch)\b/.test(message)) {
    return "platforms";
  }
  if (/\b(genre|genres|what kind of game|type of game)\b/.test(message)) {
    return "genres";
  }
  if (/\b(multiplayer|co-op|coop|single-player|single player|play with friends)\b/.test(message)) {
    return "multiplayer";
  }
  if (/\b(another|different|something else|not this|not that|instead|replace|try again|new recommendation|recommend another|find another|give me another|change (it|the recommendation)|shorter|longer|calmer|more relaxing|more intense|more aggressive|less intense|less difficult)\b/.test(message)) {
    return "change";
  }

  // A question asked after a recommendation is conversation about the current
  // result unless the user explicitly asks PlayNext to change it.
  if (message.endsWith("?") || /^(what|who|when|where|why|how|is|does|can|could|would|should|tell me)\b/.test(message)) {
    return "conversation";
  }

  // New preference statements should flow back through intent extraction.
  return "change";
}

/** Reuse the existing intent for a plain request to see the next result. */
export function isSimpleReplacementRequest(input: string) {
  const message = normalized(input).replace(/[.!?]+$/g, "").trim();
  return /^(another( one| game| recommendation)?( please)?|give me another( one| game| recommendation)?( please)?|find another( one| game| recommendation)?( please)?|recommend another( one| game)?( please)?|something else( please)?|try again( please)?)$/.test(message);
}

function list(values: string[] | null | undefined, fallback: string) {
  if (!values?.length) return fallback;
  if (values.length === 1) return values[0];
  return `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`;
}

function conciseDescription(description: string | null | undefined) {
  const clean = description?.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  if (clean.length <= 460) return clean;

  const sentences = clean.match(/[^.!?]+[.!?]+/g) ?? [];
  const summary = sentences.slice(0, 2).join(" ").trim();
  if (summary.length >= 120 && summary.length <= 520) return summary;
  return `${clean.slice(0, 457).trimEnd()}…`;
}

export function answerRecommendationFollowUp(
  kind: Exclude<RecommendationFollowUpKind, "change">,
  game: ScoredGame,
  description?: string | null
) {
  switch (kind) {
    case "about": {
      const summary = conciseDescription(description);
      if (summary) return `${game.title} is about ${summary.charAt(0).toLowerCase()}${summary.slice(1)}`;
      const genres = list(game.genres, "game");
      return `${game.title} is a ${genres} experience. I do not have a reliable plot summary available here, but you can open Game details for the full description.`;
    }
    case "why":
      return `I chose ${game.title} because ${game.explanation.charAt(0).toLowerCase()}${game.explanation.slice(1)}`;
    case "playtime":
      return game.playtime
        ? `${game.title} has an average playtime of about ${game.playtime} hours. That is the catalogue average; your own playthrough may be shorter or longer.`
        : `I do not have a reliable average playtime for ${game.title}.`;
    case "platforms":
      return `${game.title} is listed for ${list(game.platforms, "platforms that are not currently specified in the catalogue")}.`;
    case "genres":
      return `${game.title} is primarily ${list(game.genres, "not assigned to a specific genre in the catalogue")}.`;
    case "multiplayer": {
      const labels = [...(game.tags ?? []), ...(game.genres ?? [])].map(normalized);
      const hasMultiplayer = labels.some((label) => /multiplayer|co-op|coop/.test(label));
      const hasSinglePlayer = labels.some((label) => /single-player|single player/.test(label));
      if (hasMultiplayer) return `${game.title} is tagged as supporting multiplayer or co-op play.`;
      if (hasSinglePlayer) return `${game.title} is tagged as a single-player game.`;
      return `I cannot confirm the multiplayer support for ${game.title} from the catalogue data I have.`;
    }
    case "conversation":
      return `I’m still referring to ${game.title}. I can explain what it is about, why it matched, its playtime, genres or platforms—or you can ask me for a different recommendation.`;
  }
}
