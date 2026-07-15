/**
 * Logs structured metadata only — no raw free-text input, no model output
 * text, ever. Swap the console.log for your logging provider of choice
 * (Vercel's built-in logs, Axiom, Logtail, etc.) without changing the shape
 * of what's captured.
 */
export function logRecommendationEvent(entry) {
  console.log(JSON.stringify({ event: 'recommendation_request', ...entry }));
}
