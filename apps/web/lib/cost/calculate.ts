export function estimateMonthlyCost(input: { requests: number; avg_tokens: number }) {
  const millionTokens = (input.requests * input.avg_tokens) / 1_000_000;
  return Number((millionTokens * 12).toFixed(2));
}
