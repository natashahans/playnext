import type { RecommendationMode, ScoredGame } from "./types";

type ExplanationInput = {
  reasons: string[];
  cautions: string[];
  confidenceBand: ScoredGame["confidenceBand"];
  source?: RecommendationMode;
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function naturalList(values: string[]) {
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

export function buildExplanation({
  reasons,
  cautions,
  confidenceBand,
  source,
}: ExplanationInput) {
  const strongest = unique(reasons).slice(0, 3);
  const caution = unique(cautions)[0];
  const pool = source === "discovery" ? "available discoveries" : "your collection";

  if (strongest.length === 0) {
    return caution
      ? `This is the strongest balanced option from ${pool}, although ${caution}.`
      : `This is the strongest balanced option from ${pool} for the context you described.`;
  }

  const confidenceLead = confidenceBand === "low"
    ? "This is the best provisional match"
    : confidenceBand === "high"
      ? "This is a particularly strong match"
      : "This is a strong match";

  let explanation = `${confidenceLead} because ${naturalList(strongest)}.`;
  if (caution) explanation += ` One consideration: ${caution}.`;
  return explanation;
}
