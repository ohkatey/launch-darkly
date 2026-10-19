/**
 * js/console-tools.js
 *
 * Browser-console logging and demo commands. Everything is visible in
 * DevTools (press F12 → Console).
 *
 * 1. log(): every notable event (flag changes, hero renders, tracking
 *    events, errors, user switches) is printed with an [ABC] prefix. Type
 *    "ABC" in the Console filter box to see only these lines.
 *
 * 2. window.abc: commands to type into the Console during a demo:
 *      abc.help()                       list the commands
 *      abc.users()                      list the demo users
 *      abc.viewAs('user-ben-acme')      switch user (Part 2: targeting)
 *      abc.why()                        explain each flag's value for this user
 *      abc.features()                   show current flag values
 *      abc.simulateBug()                break the new hero (Part 1: remediate)
 *      abc.reset()                      fix the bug, clear the error counter
 *      abc.simulateTraffic(500)         send synthetic visitors (experiment)
 *      abc.setFeature('heroRedesign', true)
 *                                       flip a local switch (only used when
 *                                       LaunchDarkly isn't configured)
 *
 * The commands talk to the pages with browser events on `window`:
 *   'demo:user-changed'   → the selected user changed
 *   'demo:simulate-bug'   → turn the hero bug on
 *   'demo:reset'          → turn the hero bug off
 */

import { FEATURES, isEnabled, setLocal, onChange, identifyUser, getDetail } from './features.js';
import { USERS, getCurrentUser, setCurrentUser, toContext } from './users.js';
import { simulateTraffic as runSimulation } from './simulate-traffic.js';

/** Print one line to the browser console with a recognizable [ABC] prefix. */
export function log(message, ...details) {
  console.log('%c[ABC]%c ' + message, 'color:#3b4cca;font-weight:bold', '', ...details);
}

/** Print a warning (shown in yellow in the console). */
export function warn(message, ...details) {
  console.warn('[ABC] ' + message, ...details);
}

/** Print each flag's value for the current user, and LaunchDarkly's reason for it. */
function logFlagReasons() {
  for (const [name, feature] of Object.entries(FEATURES)) {
    const { value, reason } = getDetail(name);
    log(`${feature.flagKey} = ${value} → ${describeReason(reason)}`);
  }
}

/** Turn a LaunchDarkly evaluation reason into plain English. */
function describeReason(reason) {
  switch (reason?.kind) {
    case 'TARGET_MATCH': return 'individually targeted';
    case 'RULE_MATCH': return `matched targeting rule #${reason.ruleIndex + 1}`;
    case 'FALLTHROUGH': return 'no target or rule matched (default rule)';
    case 'OFF': return 'flag is OFF (off variation)';
    case 'ERROR': return `error: ${reason.errorKind}`;
    case 'LOCAL_SWITCH': return 'local switch (LaunchDarkly not connected)';
    default: return 'no reason available (is withReasons: true set in common.js?)';
  }
}

/** Set up logging for feature changes and add `window.abc` commands. */
export function installConsoleTools() {
  // Log every flag change as it happens. These lines come from the SDK's
  // `change:<flag-key>` listener, showing the update arrived with no reload.
  for (const [name, feature] of Object.entries(FEATURES)) {
    onChange(name, (enabled) => {
      log(`change:${feature.flagKey} → ${enabled} (applied with no page reload)`);
    });
  }

  window.abc = {
    help() {
      console.table({
        'abc.users()': 'List the demo users',
        "abc.viewAs('user-ben-acme')": 'Switch the current user',
        'abc.simulateBug()': 'Break the new hero (Home page)',
        'abc.reset()': 'Fix the bug and clear the error counter',
        "abc.setFeature('heroRedesign', true)": 'Flip a local switch (before LaunchDarkly only)',
        'abc.features()': 'Show current feature values',
        'abc.why()': 'Explain why each flag has its value',
        'abc.simulateTraffic(500)': 'Send synthetic visitors for the experiment',
      });
    },

    users() {
      console.table(USERS.map(({ key, name, plan, country, role, betaTester }) => ({
        key, name, plan, country, role, betaTester,
      })));
    },

    async viewAs(key) {
      if (!USERS.some((u) => u.key === key)) {
        warn(`Unknown user "${key}". Run abc.users() to see the keys.`);
        return;
      }
      setCurrentUser(key);
      const user = getCurrentUser();

      // TARGETING: identify the new user so LaunchDarkly evaluates flags for
      // their key (individual targeting) and attributes (rule-based targeting).
      await identifyUser(toContext(user));

      log(`Now viewing as ${user.name}`, toContext(user));
      logFlagReasons();
      window.dispatchEvent(new CustomEvent('demo:user-changed', { detail: user }));
    },

    why() {
      logFlagReasons();
    },

    async simulateTraffic(visitors = 500) {
      log(`Simulating ${visitors} visitors (SYNTHETIC data)…`);
      const tally = await runSimulation(visitors);
      console.table(Object.fromEntries(Object.entries(tally).map(([hero, t]) => [
        hero, { ...t, clickRate: `${((100 * t.clicks) / (t.visitors || 1)).toFixed(1)}%` },
      ])));
      log('Done. Results show on the experiment page in LaunchDarkly within a few minutes.');
    },

    setFeature(name, enabled) {
      if (!FEATURES[name]) {
        warn(`Unknown feature "${name}". Options: ${Object.keys(FEATURES).join(', ')}`);
        return;
      }
      // Only used when LaunchDarkly isn't configured; otherwise toggle the
      // flag in LaunchDarkly.
      setLocal(name, Boolean(enabled));
    },

    features() {
      console.table(Object.fromEntries(
        Object.entries(FEATURES).map(([name, f]) => [name, { flagKey: f.flagKey, value: isEnabled(name) }]),
      ));
    },
  };

  const user = getCurrentUser();
  log(`Viewing as ${user.name}. Type abc.help() for demo commands.`);
}
