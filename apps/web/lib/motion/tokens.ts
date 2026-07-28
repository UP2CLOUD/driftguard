// Shared motion tokens for the marketing site.
//
// Mirrors the timing/easing scale already established in app/globals.css
// (--t-*, --ease-*) so JS-driven (framer-motion) animation stays visually
// consistent with the CSS-driven animation already used elsewhere in the
// app, instead of each component inventing its own duration/easing.

/** Cubic-bezier curves — same values as the CSS custom properties. */
export const EASE = {
  out: [0.16, 1, 0.3, 1] as const,      // entrances — decelerate into place
  inOut: [0.4, 0, 0.2, 1] as const,     // continuous / looping transitions
  spring: [0.34, 1.56, 0.64, 1] as const, // rare — tactile "pop" feedback only
} as const;

/** Durations in seconds (framer-motion unit), matching --t-* in ms/1000. */
export const DURATION = {
  instant: 0.08, // tactile press feedback
  fast: 0.12,    // hover colour/border feedback
  base: 0.18,    // standard interactive transitions
  medium: 0.26,  // tab/panel swaps
  slow: 0.4,     // bar fills, larger state changes
  reveal: 0.5,   // scroll-triggered section reveals (desktop)
} as const;

/**
 * Entrance travel distance in px. Mobile gets a shorter throw than desktop —
 * large translations read as "sluggish" on small screens and risk
 * overshooting into neighboring content.
 */
export const DISTANCE = {
  mobile: 12,
  desktop: 20,
} as const;

/** Stagger delay between siblings, in seconds. */
export const STAGGER = {
  tight: 0.04,
  base: 0.06,
  relaxed: 0.09,
} as const;
