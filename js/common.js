/**
 * js/common.js
 *
 * Setup shared by both pages. Starts the LaunchDarkly client-side SDK for the
 * current user, then installs the console tools and the chatbot.
 */

// LaunchDarkly browser SDK, loaded from a CDN with a pinned version (no build step).
import { createClient, basicLogger } from
  'https://cdn.jsdelivr.net/npm/@launchdarkly/js-client-sdk@4.11.2/dist/index.js';
import { LD_CLIENT_SIDE_ID } from './config.js';
import { setLaunchDarklyClient } from './features.js';
import { getCurrentUser, toContext } from './users.js';
import { installConsoleTools } from './console-tools.js';
import { initChat } from './chat.js';

/** Runs once per page load, before the page renders any flagged feature. */
export async function initCommon() {
  // Start LaunchDarkly with the current user as the context.
  if (LD_CLIENT_SIDE_ID) {
    const client = createClient(LD_CLIENT_SIDE_ID, toContext(getCurrentUser()), {
      streaming: true, // keep a live connection so flag changes arrive instantly
      withReasons: true, // include WHY each flag value was served (for abc.why())
      logger: basicLogger({ level: 'warn' }),
    });
    // Wait up to 5s. If LaunchDarkly is unreachable, flags use their fallbacks.
    const { status } = await client.start({ timeout: 5 });
    console.log('[ABC] LaunchDarkly start:', status); // 'complete' | 'timeout' | 'failed'
    setLaunchDarklyClient(client);
  } else {
    console.warn('[ABC] No client-side ID in js/config.js; using local switches');
  }

  // Highlight the current page in the navigation.
  const page = location.pathname.split('/').pop().replace('.html', '') || 'index';
  document.querySelectorAll('.site-nav a[data-page]').forEach((a) => {
    if (a.dataset.page === page) a.setAttribute('aria-current', 'page');
  });

  installConsoleTools();
  initChat();
}