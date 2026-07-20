import type { RecommendationGame } from "./types";

export const EXPERIENCE_SIGNALS: Record<string, string[]> = {
  relaxing: ["casual", "simulation", "puzzle", "family", "cozy", "relaxing", "peaceful", "wholesome", "meditative"],
  story: ["adventure", "rpg", "story rich", "narrative", "choices matter", "visual novel", "singleplayer"],
  action: ["action", "shooter", "fighting", "hack and slash", "combat", "fast paced"],
  exploration: ["adventure", "open world", "exploration", "walking simulator", "metroidvania"],
  challenge: ["difficult", "souls like", "hardcore", "roguelike", "roguelite", "precision platformer"],
  social: ["multiplayer", "co op", "online co op", "local co op", "party"],
  creative: ["sandbox", "building", "crafting", "level editor", "simulation"],
  strategic: ["strategy", "tactical", "turn based", "card", "management"],
  immersive: ["atmospheric", "open world", "rpg", "story rich", "exploration", "first person"],
  funny: ["comedy", "funny", "parody", "satire", "family"],
  scary: ["horror", "survival horror", "psychological horror", "dark", "creepy", "lovecraftian"],
};

export const EXPERIENCE_PRIMARY_SIGNALS: Record<string, string[]> = {
  relaxing: ["cozy", "relaxing", "peaceful", "wholesome", "meditative"],
  story: ["story rich", "narrative", "choices matter", "visual novel"],
  action: ["action", "shooter", "fighting", "hack and slash", "combat", "fast paced"],
  exploration: ["open world", "exploration", "walking simulator", "metroidvania"],
  challenge: ["difficult", "souls like", "hardcore", "precision platformer", "permadeath"],
  social: ["multiplayer", "co op", "online co op", "local co op", "party"],
  creative: ["sandbox", "building", "crafting", "level editor"],
  strategic: ["strategy", "tactical", "turn based", "card", "management"],
  immersive: ["atmospheric", "open world", "first person"],
  funny: ["comedy", "funny", "parody", "satire"],
  scary: ["horror", "survival horror", "psychological horror", "creepy", "lovecraftian"],
};

export const SHORT_SESSION_SIGNALS = [
  "arcade", "casual", "puzzle", "platformer", "racing", "sports", "fighting", "roguelike", "roguelite", "card", "match 3",
];
export const LONG_SESSION_SIGNALS = [
  "rpg", "open world", "strategy", "simulation", "management", "grand strategy", "4x", "massively multiplayer",
];
export const DIFFICULT_SIGNALS = [
  "difficult", "souls like", "hardcore", "roguelike", "roguelite", "precision platformer", "permadeath",
];
export const LOW_ENERGY_SIGNALS = [
  "casual", "puzzle", "simulation", "turn based", "story rich", "visual novel", "walking simulator", "cozy", "relaxing",
];
export const HIGH_ENERGY_SIGNALS = [
  "action", "shooter", "fighting", "racing", "hack and slash", "fast paced", "combat",
];

export const FEEDBACK_NOTE_SIGNALS: Record<string, string[]> = {
  combat: ["action", "shooter", "fighting", "combat", "hack and slash"],
  difficulty: DIFFICULT_SIGNALS,
  horror: EXPERIENCE_SIGNALS.scary,
  multiplayer: EXPERIENCE_SIGNALS.social,
  story: EXPERIENCE_SIGNALS.story,
  grinding: ["grind", "loot", "massively multiplayer", "live service"],
  intensity: HIGH_ENERGY_SIGNALS,
};

export function normalizeSignal(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function gameSignals(game: Pick<RecommendationGame, "genres" | "tags">) {
  return [...(game.genres ?? []), ...(game.tags ?? [])].map(normalizeSignal).filter(Boolean);
}

export function matchesSignal(game: Pick<RecommendationGame, "genres" | "tags">, signals: string[]) {
  const values = gameSignals(game);
  return signals.some((signal) => {
    const target = normalizeSignal(signal);
    return values.some((value) => value === target || value.includes(target) || target.includes(value));
  });
}

export function overlap(values: string[] | null | undefined, targets: string[] | null | undefined) {
  if (!values?.length || !targets?.length) return [];
  const normalizedTargets = targets.map(normalizeSignal).filter(Boolean);
  return values.filter((value) => {
    const normalizedValue = normalizeSignal(value);
    return normalizedTargets.some((target) =>
      normalizedValue === target ||
      (Math.min(normalizedValue.length, target.length) >= 4 &&
        (normalizedValue.includes(target) || target.includes(normalizedValue)))
    );
  });
}

export function isShortSessionFriendly(game: RecommendationGame) {
  return matchesSignal(game, SHORT_SESSION_SIGNALS) ||
    ((game.playtime ?? 0) > 0 && (game.playtime ?? 0) <= 12);
}

export function isLongForm(game: RecommendationGame) {
  return matchesSignal(game, LONG_SESSION_SIGNALS) || (game.playtime ?? 0) >= 35;
}

export function looksDifficult(game: RecommendationGame) {
  return matchesSignal(game, DIFFICULT_SIGNALS);
}
