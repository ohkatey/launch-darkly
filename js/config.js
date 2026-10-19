/**
 * js/config.js
 *
 * Site settings.
 *
 * LD_CLIENT_SIDE_ID is the LaunchDarkly client-side ID for the environment
 * the site connects to. REPLACE it with your own: LaunchDarkly → Project
 * settings → Environments → (your environment) → Client-side ID.
 * The client-side ID is not a secret; it only lets a browser read flag values
 * for its own context. Never put an SDK key or a flag trigger URL in browser
 * code.
 */
export const LD_CLIENT_SIDE_ID = 'YOUR_ID_HERE'; // REPLACE with your client-side ID

/**
 * Simulated monitoring rule (Part 1: Remediate): raise an alert when this many
 * hero errors happen within the window. See home.js.
 */
export const ERROR_THRESHOLD = 5;
export const ERROR_WINDOW_SECONDS = 60;
