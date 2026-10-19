/**
 * js/home.js
 *
 * Home page. Its flagged component is the HERO, controlled by the
 * hero-redesign flag: release, rollback and kill switch (Part 1), targeting
 * (Part 2) and the CTA experiment (Experimentation).
 *
 * Both versions of the hero ship in the same code:
 *   - renderClassicHero(): what's live today (the known-good version)
 *   - renderNewHero():     the redesign being released
 * Which one renders is decided at runtime by isEnabled('heroRedesign').
 * That's the core idea of a feature flag: deploy the code any time, then
 * release it to users separately.
 */

import { initCommon } from './common.js';
import { isEnabled, onChange } from './features.js';
import { trackEvent, EVENTS } from './tracking.js';
import { getCurrentUser } from './users.js';
import { log, warn } from './console-tools.js';
import { ERROR_THRESHOLD, ERROR_WINDOW_SECONDS } from './config.js';

const heroEl = document.getElementById('hero');

// --- Bug simulation state (Part 1: Remediate) --------------------------------
let bugActive = false; // turned on by abc.simulateBug() in the console
let errorTimer = null; // while the bug is live, keeps reporting errors

// -----------------------------------------------------------------------------
// The two versions of the hero
// -----------------------------------------------------------------------------

/** Classic hero (control): the current, known-good version. */
function renderClassicHero() {
  heroEl.className = 'hero hero-classic';
  heroEl.innerHTML = `
    <h1>Work management for modern teams</h1>
    <p class="hero-sub">Plan, track and ship projects in one place.</p>
    <button class="btn btn-secondary" id="hero-cta" type="button">Start free trial</button>
  `;
  // Experiment conversion: same event as the new hero's CTA, so both
  // variations are measured the same way.
  heroEl.querySelector('#hero-cta').addEventListener('click', () => {
    trackEvent(EVENTS.HERO_CTA_CLICKED, { hero: 'classic' });
  });
}

/**
 * The starting price shown in the new hero.
 * This is where the deliberate bug lives: when the bug is "on", `pricing` is
 * undefined and reading `.starter` throws, the kind of mistake that slips
 * past review. The flag is how you contain it in seconds.
 */
function getStarterPrice() {
  const pricing = bugActive ? undefined : { starter: { monthly: 12 } };
  return pricing.starter.monthly; // throws when bugActive is true
}

/** Redesigned hero (treatment): split layout, stats and a tracked CTA. */
function renderNewHero() {
  heroEl.className = 'hero hero-new';

  let price;
  try {
    price = getStarterPrice();
  } catch (err) {
    // What a visitor sees when the new hero breaks.
    heroEl.innerHTML = `
      <div class="hero-error" role="alert">
        <strong>Something went wrong loading this section.</strong>
        <span>Please refresh the page or try again later.</span>
      </div>
    `;
    reportError(err);
    return;
  }

  heroEl.innerHTML = `
    <div class="hero-copy">
      <span class="badge">New</span>
      <h1>Ship projects 2× faster with ABC</h1>
      <p class="hero-sub">
        Roadmaps, sprints and releases in one workspace, with automation that
        keeps every team in sync.
      </p>
      <div class="hero-actions">
        <button class="btn btn-primary" id="hero-cta" type="button">Start free trial</button>
        <a class="btn btn-link" href="pricing.html">Compare plans →</a>
      </div>
      <p class="hero-note">Plans from $${price}/user/month · No credit card required</p>
    </div>
    <ul class="hero-stats" aria-label="ABC at a glance">
      <li><strong>12k+</strong><span>teams</span></li>
      <li><strong>99.9%</strong><span>uptime</span></li>
      <li><strong>4.8/5</strong><span>average rating</span></li>
    </ul>
  `;

  // Experiment conversion: the "Start free trial" click (see tracking.js).
  heroEl.querySelector('#hero-cta').addEventListener('click', () => {
    trackEvent(EVENTS.HERO_CTA_CLICKED);
  });
}

/** Pick and render the right hero for the current user. */
function renderHero() {
  // Evaluate hero-redesign for the current user (see features.js).
  const showNew = isEnabled('heroRedesign');
  showNew ? renderNewHero() : renderClassicHero();
  log(`Hero rendered: ${showNew ? 'NEW (redesign)' : 'CLASSIC'}  [heroRedesign = ${showNew}]`);
  syncErrorTraffic(showNew);
}

// -----------------------------------------------------------------------------
// Error reporting (Part 1: Remediate)
// -----------------------------------------------------------------------------

// Timestamps of recent errors, so we can apply a monitoring-style alert rule:
// "ERROR_THRESHOLD errors within ERROR_WINDOW_SECONDS" (set in config.js).
let recentErrors = [];
let alertRaised = false;

/**
 * Report an error, the way an app reports to its monitoring (APM) tool.
 * Here the "monitoring tool" is just this function plus the browser console.
 */
function reportError(err) {
  const now = Date.now();
  recentErrors = recentErrors.filter((t) => now - t < ERROR_WINDOW_SECONDS * 1000);
  recentErrors.push(now);

  console.error(
    `[ABC] Hero error (${recentErrors.length}/${ERROR_THRESHOLD} in last ${ERROR_WINDOW_SECONDS}s) ` +
      `for user ${getCurrentUser().key}:`,
    err.message,
  );

  if (!alertRaised && recentErrors.length >= ERROR_THRESHOLD) {
    alertRaised = true;
    // Remediate (Part 1): in production, the monitoring tool would call the
    // LaunchDarkly flag trigger here to turn hero-redesign OFF automatically.
    // Trigger URLs are secrets, so they never go in browser code; fire it
    // from a terminal instead:
    //   curl.exe -X POST "<your trigger URL>"
    // When the flag turns off, the listener swaps in the classic hero and
    // these errors stop.
    warn(
      'ALERT: error threshold crossed on the new hero. ' +
        'Fire the LaunchDarkly kill-switch trigger now (curl.exe -X POST "<trigger URL>").',
    );
  }
}

/**
 * While the bug is on AND the new hero is showing, keep reporting an error
 * every 1.5s to simulate other visitors hitting it. It stops as soon as the
 * new hero is turned off, just as real error rates drop after a kill switch.
 */
function syncErrorTraffic(showNew) {
  const shouldRun = bugActive && showNew;
  if (shouldRun && !errorTimer) {
    errorTimer = setInterval(
      () => reportError(new TypeError("Cannot read properties of undefined (reading 'starter')")),
      1500,
    );
  } else if (!shouldRun && errorTimer) {
    clearInterval(errorTimer);
    errorTimer = null;
  }
}

// -----------------------------------------------------------------------------
// Startup
// -----------------------------------------------------------------------------

await initCommon();
renderHero();

// Listener (Part 1): re-render the hero whenever hero-redesign changes for
// this user (toggle, targeting change or trigger), with no page reload.
onChange('heroRedesign', renderHero);

// Console commands: abc.simulateBug() and abc.reset() (see console-tools.js).
window.addEventListener('demo:simulate-bug', () => {
  if (!isEnabled('heroRedesign')) {
    warn('Turn on the new hero first; the bug lives in the new version');
    return;
  }
  bugActive = true;
  log('💥 Bug injected into the new hero');
  renderHero();
});
window.addEventListener('demo:reset', () => {
  bugActive = false;
  recentErrors = [];
  alertRaised = false;
  renderHero();
});
