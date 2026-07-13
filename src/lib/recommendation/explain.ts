type ExplanationInput = {
  reasons: string[];
  cautions: string[];
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function buildExplanation({ reasons, cautions }: ExplanationInput) {
  const strongest = unique(reasons).slice(0, 3);
  const caution = unique(cautions)[0];

  if (strongest.length === 0) {
    return caution
      ? `This is the strongest balanced option in your collection, although ${caution}.`
      : "This is the strongest balanced option in your collection for the context you described.";
  }

  let explanation = `This is a strong fit because ${strongest.join(", ")}.`;

  if (caution) {
    explanation += ` One consideration: ${caution}.`;
  }

  return explanation;
}
