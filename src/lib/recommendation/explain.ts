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

function sentence(value: string) {
  const clean = value.trim().replace(/[.!?]+$/, "");
  return clean ? `${clean.charAt(0).toUpperCase()}${clean.slice(1)}.` : "";
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

  const first = strongest[0];
  const rest = strongest.slice(1);
  let explanation: string;

  if (/^(you|your|the time you have|the session you mentioned|the request you described)/i.test(first)) {
    explanation = sentence(first);
  } else if (/session|available time|short|deeper game/i.test(first)) {
    explanation = `For the time you have, ${first}.`;
  } else if (/energy|pace/i.test(first)) {
    explanation = `For how you feel right now, ${first}.`;
  } else if (/experience|qualities/i.test(first)) {
    explanation = `It matches the kind of experience in your current request: ${first}.`;
  } else if (confidenceBand === "low") {
    explanation = `This is the leading provisional option from ${pool}: ${first}.`;
  } else {
    explanation = `This leads the current shortlist because ${first}.`;
  }

  if (rest.length > 0) explanation += ` ${sentence(naturalList(rest))}`;
  if (caution) {
    const lead = /energy|intensity/i.test(caution)
      ? "One thing to weigh"
      : /recent|variety/i.test(caution)
        ? "The trade-off is variety"
        : "The main caveat";
    explanation += ` ${lead}: ${caution}.`;
  }
  return explanation;
}
