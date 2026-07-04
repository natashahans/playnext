export function buildExplanation(reasons: string[]) {
  if (reasons.length === 0) {
    return "This is a balanced option from your collection based on your current context.";
  }

  if (reasons.length === 1) {
    return `This looks like a strong fit because it ${reasons[0]}.`;
  }

  const lastReason = reasons[reasons.length - 1];
  const otherReasons = reasons.slice(0, -1).join(", ");

  return `This looks like a strong fit because it ${otherReasons}, and ${lastReason}.`;
}