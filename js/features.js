/**
 * js/features.js
 *
 * Feature flags for the site, backed by the LaunchDarkly client-side SDK.
 *
 * Pages never call the SDK directly. They use these functions:
 *
 *   isEnabled(name)           → is this feature on for the current user?
 *   onChange(name, callback)  → call back when that value changes (no reload)
 *   identifyUser(context)     → switch the user that flags are evaluated for
 *   getDetail(name)           → the value plus LaunchDarkly's evaluation reason
 *   track(eventKey, data)     → send a custom event (experiment metrics)
 *
 * If no client-side ID is configured (config.js), isEnabled() falls back to
 * local switches stored in this browser, set with abc.setFeature() in the
 * console, so the site still runs without LaunchDarkly.
 */

/**
 * The site's features and their LaunchDarkly flag keys.
 *
 * RECREATE in LaunchDarkly: a boolean flag for each entry, using exactly the
 * flagKey below, with "SDKs using Client-side ID" enabled so the browser SDK
 * can read it.
 */
export const FEATURES = {
  heroRedesign: {
    flagKey: 'hero-redesign', // must match the flag key in LaunchDarkly
    label: 'New homepage hero',
    page: 'Home',
    // The safe value to use if flags can't be loaded. For a release, that is
    // always the old, known-good experience.
    fallback: false,
  },
};

const STORAGE_KEY = 'abc-local-features';

// name → array of callbacks waiting for that feature to change
const listeners = {};

/** Read all local switch values (wrapped in try/catch: storage can be blocked). */
function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

/** Save all local switch values. */
function writeAll(values) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    /* storage unavailable: the switch still works until the page reloads */
  }
}

// In-memory copy so the site works even if storage is blocked.
let values = readAll();

// The LaunchDarkly client, set by common.js once it has started.
let ldClient = null;
export function setLaunchDarklyClient(client) {
  ldClient = client;
}

/**
 * TARGETING: tell LaunchDarkly the current user changed. It re-evaluates
 * every flag for the new context's key and attributes.
 */
export async function identifyUser(context) {
  if (!ldClient) return;
  await ldClient.identify(context);
}

/**
 * The flag value AND the reason LaunchDarkly served it (individual target,
 * rule match, default rule, flag off…). Requires `withReasons: true` in common.js.
 */
export function getDetail(name) {
  const { flagKey, fallback } = FEATURES[name];
  if (!ldClient) return { value: isEnabled(name), reason: { kind: 'LOCAL_SWITCH' } };
  return ldClient.variationDetail(flagKey, fallback);
}

/**
 * EXPERIMENTATION: send a custom (conversion) event to LaunchDarkly.
 * A metric with the same event key turns these into experiment results.
 */
export function track(eventKey, data) {
  ldClient?.track(eventKey, data);
}

/**
 * Is this feature on for the current user? LaunchDarkly evaluates the flag
 * for the current context, so targeting rules (Part 2) apply here.
 */
export function isEnabled(name) {
  const { flagKey, fallback } = FEATURES[name];
  // FEATURE FLAG: ask LaunchDarkly for this user's value. The fallback is
  // returned if the SDK isn't ready or the flag doesn't exist.
  if (ldClient) return ldClient.variation(flagKey, fallback);
  return values[name] ?? fallback; // local switch when LaunchDarkly isn't configured
}

/** Run callback(newValue) whenever this feature's value changes, with no page reload. */
export function onChange(name, callback) {
  // LISTENER: LaunchDarkly pushes flag changes over the streaming connection
  // and fires `change:<flag-key>`. We re-evaluate and hand the new value to
  // the page, which re-renders with no reload.
  if (ldClient) {
    ldClient.on(`change:${FEATURES[name].flagKey}`, () => callback(isEnabled(name)));
    return;
  }
  (listeners[name] ??= []).push(callback);
}

/**
 * Flip a local switch (abc.setFeature() in the console). Only affects the
 * site when LaunchDarkly isn't configured; otherwise flags are controlled in
 * LaunchDarkly.
 */
export function setLocal(name, enabled) {
  values = { ...values, [name]: enabled };
  writeAll(values);
  (listeners[name] ?? []).forEach((cb) => cb(enabled));
}
