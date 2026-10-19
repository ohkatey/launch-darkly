/**
 * js/pricing.js
 *
 * Pricing page. The plans are static. "Choose plan" clicks are tracked as
 * plan-selected events, which can serve as a secondary experiment metric.
 */

import { initCommon } from './common.js';
import { trackEvent, EVENTS } from './tracking.js';

// Track "Choose plan" clicks.
document.querySelectorAll('[data-plan]').forEach((btn) => {
  btn.addEventListener('click', () => trackEvent(EVENTS.PLAN_SELECTED, { plan: btn.dataset.plan }));
});

// Shared setup (LaunchDarkly, console tools, chatbot).
await initCommon();
