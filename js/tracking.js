/**
 * js/tracking.js
 *
 * Analytics events. Each event is sent to LaunchDarkly as a custom event and
 * logged to the console.
 *
 * RECREATE in LaunchDarkly (Experimentation): a metric with the event key
 * "hero-cta-clicked", attached to the experiment on hero-redesign. Events
 * also appear in LaunchDarkly under Live events.
 */

import { log } from './console-tools.js';
import { track } from './features.js';

/** Event keys used on the site. These must match the metric event keys in LaunchDarkly. */
export const EVENTS = {
  HERO_CTA_CLICKED: 'hero-cta-clicked', // "Start free trial" in the hero (Home)
  PLAN_SELECTED: 'plan-selected', // any "Choose plan" button (Pricing)
};

/** Send one event to LaunchDarkly and log it. */
export function trackEvent(eventKey, data) {
  track(eventKey, data); // send to LaunchDarkly (metrics + experiments)
  log(`track("${eventKey}")`, data ?? '');
}
