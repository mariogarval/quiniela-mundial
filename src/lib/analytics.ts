/**
 * Thin typed wrapper around PostHog.
 * Import `track` and `identify` from here — never import posthog-js directly
 * from components so this file is the single place to swap SDKs if needed.
 *
 * Gracefully no-ops when NEXT_PUBLIC_POSTHOG_KEY is not set (local dev / CI).
 */
import posthog from "posthog-js";

// ─── Event catalogue ────────────────────────────────────────────────────────
// Grouped by funnel stage so it's easy to build a PostHog funnel query.

export type AnalyticsEvent =
  // Acquisition
  | "pool_created"          // admin creates a new pool
  | "pool_joined"           // member joins via invite code
  | "login_completed"       // returning user looks up pools by email

  // Prediction funnel
  | "grupos_opened"         // /grupos page mounted
  | "group_saved"           // one group's 6 predictions saved
  | "all_groups_done"       // all 72 group predictions complete
  | "bracket_opened"        // /bracket page mounted
  | "bracket_submitted"     // full bracket sent to DB → redirects to /share

  // Engagement
  | "odds_panel_opened"     // clicked 📊 Pronóstico button
  | "odds_applied"          // clicked Aplicar sugerencias
  | "standings_toggled"     // toggled the predictive standings table
  | "share_clicked"         // WhatsApp share on /share page
  | "invite_link_copied"    // copied personal invite URL from InviteCard
  | "invite_whatsapp_clicked"; // WhatsApp button in InviteCard

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Associate all future events with a known user. Call on pool create/join. */
export function identify(userId: string, props: { name: string; role?: "admin" | "member" }) {
  posthog.identify(userId, { name: props.name, role: props.role ?? "member" });
}

/** Capture a typed event with optional properties. */
export function track(event: AnalyticsEvent, props?: Record<string, unknown>) {
  posthog.capture(event, props);
}
