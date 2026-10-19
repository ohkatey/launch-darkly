/**
 * js/simulate-traffic.js
 *
 * DEMO ONLY: sends SYNTHETIC visitors to LaunchDarkly so the experiment has
 * enough data to analyze. With real traffic (~40,000 visitors/day) you
 * wouldn't need this.
 *
 * Each simulated visitor:
 *   1. is a brand-new anonymous context (random key),
 *   2. is evaluated for hero-redesign; this is the experiment "exposure",
 *      and LaunchDarkly assigns them to classic or new,
 *   3. "clicks" Start free trial with a made-up probability that depends on
 *      which hero they got, sent as the hero-cta-clicked event.
 *
 * It uses its OWN LaunchDarkly client, so the page you're looking at (and
 * its listeners and logs) isn't affected.
 */
import { createClient } from
  'https://cdn.jsdelivr.net/npm/@launchdarkly/js-client-sdk@4.11.2/dist/index.js';
import { LD_CLIENT_SIDE_ID } from './config.js';

const FLAG_KEY = 'hero-redesign';
const EVENT_KEY = 'hero-cta-clicked'; // must match tracking.js and your metric

/**
 * @param {number} visitors  how many synthetic visitors to send
 * @param {object} rates     made-up click-through rates for each hero
 */
export async function simulateTraffic(visitors = 500, { classicRate = 0.08, newRate = 0.12 } = {}) {
  if (!LD_CLIENT_SIDE_ID) throw new Error('Set LD_CLIENT_SIDE_ID in js/config.js first');

  const newVisitor = () => ({ kind: 'user', key: `sim-${crypto.randomUUID()}`, anonymous: true });

  // Separate client: no streaming needed; capacity raises the event buffer
  // so events aren't dropped between flushes.
  const client = createClient(LD_CLIENT_SIDE_ID, newVisitor(), { streaming: false, capacity: 1000 });
  await client.start({ timeout: 10 });

  const tally = { classic: { visitors: 0, clicks: 0 }, new: { visitors: 0, clicks: 0 } };

  for (let i = 0; i < visitors; i++) {
    await client.identify(newVisitor());                // a new visitor arrives
    const showNew = client.variation(FLAG_KEY, false);  // exposure: which hero they see
    const bucket = showNew ? tally.new : tally.classic;
    bucket.visitors++;

    if (Math.random() < (showNew ? newRate : classicRate)) {
      client.track(EVENT_KEY);                          // conversion
      bucket.clicks++;
    }

    if ((i + 1) % 50 === 0) {
      await client.flush(); // send events in batches as we go
      console.log(`[ABC] simulated ${i + 1}/${visitors} visitors`);
    }
  }

  await client.flush();
  await client.close();
  return tally;
}