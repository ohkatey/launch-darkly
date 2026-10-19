/**
 * js/users.js
 *
 * Demo users and the currently selected user.
 *
 * The site has no login. Switch between these sample users from the browser
 * console with abc.viewAs('<key>') to show how each one experiences the site.
 *
 * Each user becomes a LaunchDarkly context (Part 2: context attributes).
 * `key` is the unique ID used for individual targeting; the other attributes
 * (plan, country, role, betaTester) are used by rule-based targeting, e.g.
 * "plan is one of enterprise". Targeting rules in LaunchDarkly must use these
 * exact attribute names and values.
 */

export const USERS = [
  {
    key: 'anonymous', // replaced with a random per-browser ID below
    name: 'Anonymous visitor',
    anonymous: true,
    // Most of the ~40,000 daily visitors look like this: no attributes yet.
  },
  {
    key: 'user-ana-qa',
    name: 'Ana Ruiz',
    email: 'ana.ruiz@abc-company.com',
    plan: 'enterprise',
    country: 'US',
    role: 'qa-engineer',
    betaTester: false,
    // Individual targeting: an internal QA engineer who sees the new hero in
    // production before any customer does.
  },
  {
    key: 'user-ben-acme',
    name: 'Ben Carter (Acme Corp)',
    email: 'ben@acme.example',
    plan: 'enterprise',
    country: 'US',
    role: 'admin',
    betaTester: false,
    // Rule-based targeting: matches the "plan is one of enterprise" rule.
  },
  {
    key: 'user-chloe-free',
    name: 'Chloe Martin',
    email: 'chloe@example.co.uk',
    plan: 'free',
    country: 'GB',
    role: 'member',
    betaTester: false,
    // Matches no targets or rules, so gets the default rule.
  },
  {
    key: 'user-dev-beta',
    name: 'Dev Patel',
    email: 'dev@example.ca',
    plan: 'pro',
    country: 'CA',
    role: 'member',
    betaTester: true,
    // Matches a betaTester rule, if one is configured.
  },
];

const STORAGE_KEY = 'abc-current-user';
const VISITOR_ID_KEY = 'abc-visitor-id';

/**
 * A stable random ID for this browser. Anonymous visitors need a consistent
 * key so they keep getting the same experience, which percentage rollouts and
 * experiment assignment rely on.
 */
function visitorId() {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = `visitor-${crypto.randomUUID()}`;
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return `visitor-${crypto.randomUUID()}`;
  }
}

/** The persona currently selected with abc.viewAs() (anonymous by default). */
export function getCurrentUser() {
  let key = 'anonymous';
  try {
    key = localStorage.getItem(STORAGE_KEY) ?? 'anonymous';
  } catch {
    /* storage blocked: stay anonymous */
  }
  const user = USERS.find((u) => u.key === key) ?? USERS[0];
  return user.anonymous ? { ...user, key: visitorId() } : user;
}

/**
 * Save the selected user. abc.viewAs() then calls identifyUser()
 * (features.js) so LaunchDarkly re-evaluates every flag for them.
 */
export function setCurrentUser(key) {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    /* storage blocked: the choice lasts until reload */
  }
}

/**
 * Convert a user into a LaunchDarkly context (kind "user"). Used when the SDK
 * starts (common.js) and when switching users (abc.viewAs).
 */
export function toContext(user) {
  const { name, ...attributes } = user;
  return { kind: 'user', name, ...attributes };
}
