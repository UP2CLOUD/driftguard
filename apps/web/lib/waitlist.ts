/**
 * Whether the waitlist route has anywhere durable to send a signup.
 *
 * There is no backend waitlist endpoint and no other persistence path —
 * Resend is the only integration app/api/waitlist/route.ts has. Previously,
 * a missing RESEND_API_KEY or RESEND_AUDIENCE_ID meant the route logged the
 * email with console.log (not queryable, not reliably retained on an edge
 * runtime, nobody paged on it) and returned `{ ok: true }` anyway — the "✓
 * In" the button then showed was a straight lie; the email existed nowhere.
 * This function is the gate that now makes the route fail loudly instead.
 */
export function isWaitlistConfigured(apiKey: string | undefined, audienceId: string | undefined): boolean {
  return Boolean(apiKey) && Boolean(audienceId);
}
