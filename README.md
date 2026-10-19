# ABC Company × LaunchDarkly

A sample two-page website for the fictional **ABC Company** that shows how LaunchDarkly helps a team ship features faster without adding risk:

| Exercise | What this project demonstrates |
|---|---|
| **Part 1: Release & Remediate** | A redesigned homepage hero behind the `hero-redesign` feature flag. Toggling the flag swaps the hero **instantly, with no page reload**, via a change listener. A simulated bug raises an error alert, and a **flag trigger** turns the feature off. |
| **Part 2: Target** | Five demo users with context attributes (`plan`, `country`, `role`, `betaTester`). **Individual targeting** releases the hero to an internal QA user, and a **rule** releases it to enterprise customers. Everyone else keeps the current hero. |
| **Extra credit: Experimentation** | A `hero-cta-clicked` metric and an experiment on `hero-redesign` comparing "Start free trial" click-through between the classic and redesigned hero. |

The site is plain **HTML, CSS and JavaScript** with no build step. It uses the LaunchDarkly **client-side JavaScript SDK** (`@launchdarkly/js-client-sdk` v4.11.2), loaded from the jsDelivr CDN.

---

## Prerequisites and assumptions

- **A LaunchDarkly account.** A [free trial](https://launchdarkly.com/start-trial/) works. Flag triggers and Experimentation are included in the trial; on paid accounts they depend on your plan.
- **A modern browser:** Chrome, Edge, Firefox or Safari.
- **Node.js 18 or newer**, used only to run a local web server with `npx serve`. Nothing is installed into the project. (Any static web server works; see [Alternatives](#alternatives-to-npx-serve).)
- **Internet access.** The SDK loads from a CDN and connects to LaunchDarkly.
- **Port 3000 is free.** If not, see [Troubleshooting](#troubleshooting).
- **`curl`**, to fire the flag trigger. It's built into Windows 10/11 (as `curl.exe`) and macOS.
- You'll work in a **single LaunchDarkly environment** (the examples use **Test**). The client-side ID, flag, targeting, trigger and experiment must all be in that same environment.
- **Experiment data is synthetic.** A real site with ~40,000 daily visitors would produce enough data on its own. For this demo, a console command sends simulated visitors (see [Experimentation](#extra-credit-experimentation)).

---

## 1. Set up LaunchDarkly

UI labels may vary slightly between LaunchDarkly versions.

### 1.1 Get your client-side ID
1. Open your project's **settings → Environments** and choose **Test**.
2. Copy the **Client-side ID**. It is not a secret; it's designed for browser code.

### 1.2 Create the flag
**Flags → Create flag**:

| Setting | Value |
|---|---|
| Name | Hero redesign |
| Key | **`hero-redesign`** (must match exactly) |
| Type | Boolean (`true` = redesigned hero, `false` = classic hero) |
| Client-side SDK availability | ✅ **SDKs using Client-side ID** (required, or the browser can't see the flag) |

In **Test**, check that the flag's off variation is `false` and its default rule serves `true`. Leave the flag **Off** for now.

### 1.3 Create the kill-switch trigger (Part 1)
1. Open `hero-redesign` in **Test** and find **Triggers** in the flag's environment settings.
2. **Add trigger → Generic trigger**, with the action **Turn the flag off**.
3. Copy the trigger URL immediately; it's only shown once. **Treat it like a password.** Anyone with the URL can turn the flag off, so it never goes in the website's code.

The targeting (Part 2) and experiment (Experimentation) setup is described in each walkthrough section below.

---

## 2. Configure the project

Open **`js/config.js`** and replace the client-side ID with your own:

```js
export const LD_CLIENT_SIDE_ID = 'your-client-side-id'; // REPLACE with your client-side ID
```

That's the only change needed. Flag keys and event keys are already set in the code and must match what you create in LaunchDarkly (`hero-redesign`, `hero-cta-clicked`).

---

## 3. Run the site

The pages use JavaScript modules, which browsers only load over `http://`, not by double-clicking the HTML file. So the site is served by a small local web server.

### Windows 10/11

1. **Install Node.js** if `node -v` doesn't show v18 or newer:
   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```
   Close and reopen the terminal afterwards. (Or download the LTS installer from [nodejs.org](https://nodejs.org/).)
2. Open **Windows Terminal** (PowerShell) and go to the project folder:
   ```powershell
   cd "C:\path\to\abc-company-site"
   ```
3. Start the web server:
   ```powershell
   npx serve -l 3000
   ```
   The first time, type **y** when asked `Ok to proceed?`.
4. Open **http://localhost:3000** in your browser, or run `start http://localhost:3000` in a second terminal tab.

> If PowerShell says *"running scripts is disabled on this system"*, use `npx.cmd serve -l 3000` instead.

### macOS

1. **Install Node.js** if `node -v` doesn't show v18 or newer. Either download the LTS installer from [nodejs.org](https://nodejs.org/), or with Homebrew:
   ```bash
   brew install node
   ```
2. Open **Terminal** and go to the project folder:
   ```bash
   cd /path/to/abc-company-site
   ```
3. Start the web server:
   ```bash
   npx serve -l 3000
   ```
   The first time, type **y** when asked `Ok to proceed?`.
4. Open **http://localhost:3000** in your browser, or run `open http://localhost:3000` in a second Terminal tab.

Press **Ctrl+C** in the terminal to stop the server. After editing a file, refresh the browser.

### Alternatives to `npx serve`
- **VS Code:** install the **Live Server** extension, right-click `index.html`, and choose **Open with Live Server**.
- **Python 3:** `python -m http.server 3000` (Windows) or `python3 -m http.server 3000` (macOS).

### Check that it's connected
Open the browser's DevTools console: **F12** on Windows, **⌥⌘J** (Chrome/Edge) or **⌥⌘C** (Safari, with the Develop menu enabled) on macOS. Type `ABC` in the console's filter box to see only the site's messages. You should see:

```
[ABC] LaunchDarkly start: complete
[ABC] Viewing as Anonymous visitor. Type abc.help() for demo commands.
[ABC] Hero rendered: CLASSIC  [heroRedesign = false]
```

---

## 4. Walkthrough

Keep LaunchDarkly and the site side by side, with the browser console open. Demo actions are typed into the console as `abc.…` commands; `abc.help()` lists them all.

### Part 1: Release & Remediate

**Release and roll back (feature flag + listener)**
1. In LaunchDarkly, turn `hero-redesign` **On**. The redesigned hero appears **without a page reload**, and the console shows:
   ```
   [ABC] change:hero-redesign → true (applied with no page reload)
   [ABC] Hero rendered: NEW (redesign)  [heroRedesign = true]
   ```
2. Turn the flag **Off**. The classic hero returns immediately.
3. The flag's **History** in LaunchDarkly records each change. **Live events** shows the browser evaluating the flag.

**Remediate (flag trigger)**
1. Turn the flag **On**.
2. In the console, run `abc.simulateBug()`. The new hero breaks, and an error is reported every 1.5 seconds.
3. After 5 errors in 60 seconds, the console shows an **ALERT**. In production, a monitoring tool would call the trigger at this point. Here, fire it from a terminal:
   - **Windows:** `curl.exe -X POST "YOUR-TRIGGER-URL"` (use `curl.exe`; in Windows PowerShell, `curl` is a different command)
   - **macOS:** `curl -X POST "YOUR-TRIGGER-URL"`
4. LaunchDarkly turns the flag off. The listener swaps in the classic hero, and the errors stop. The flag's **History** shows the trigger as the source of the change.
5. Run `abc.reset()` before repeating the demo.

### Part 2: Target

**Demo users** (defined in `js/users.js`):

| Key | Plan | Country | Role | betaTester | Purpose |
|---|---|---|---|---|---|
| *(random per browser)* | – | – | – | – | Anonymous visitor |
| `user-ana-qa` | enterprise | US | qa-engineer | false | **Individual targeting** |
| `user-ben-acme` | enterprise | US | admin | false | **Rule-based targeting** |
| `user-chloe-free` | free | GB | member | false | Matches nothing (default rule) |
| `user-dev-beta` | pro | CA | member | true | Optional `betaTester` rule |

**Set up targeting** on `hero-redesign` (Test environment, **Targeting** tab):
1. **Individual target:** `user-ana-qa` → serve **`true`**.
2. **Rule:** *Enterprise customers*: context kind **user**, attribute **`plan`** **is one of** **`enterprise`** → serve **`true`**.
   Optional second rule: **`betaTester`** **is one of** **`true`** → serve `true`.
3. **Default rule:** serve **`false`**.
4. Make sure the flag is **On**, then save.

Tip: run `abc.viewAs()` for each user once before setting up targeting, so they appear under **Contexts** in LaunchDarkly with their attributes.

**Demonstrate it** on the Home page:

| Command | Hero | Reason logged |
|---|---|---|
| `abc.viewAs('user-ana-qa')` | New | `individually targeted` |
| `abc.viewAs('user-ben-acme')` | New | `matched targeting rule #1` |
| `abc.viewAs('user-chloe-free')` | Classic | `no target or rule matched (default rule)` |
| `abc.viewAs('user-dev-beta')` | Classic (New with the optional rule) | default rule (or `rule #2`) |
| `abc.viewAs('anonymous')` | Classic | `no target or rule matched (default rule)` |

The hero updates without a reload each time. `abc.why()` explains the current user's flag value at any time. Edit a rule in LaunchDarkly while viewing as a user and the page updates live. Firing the Part 1 trigger turns the hero off for **every** user, including targeted ones.

### Extra credit: Experimentation

**Hypothesis:** the redesigned hero increases "Start free trial" clicks.

Both hero versions have a **Start free trial** button that sends the same custom event, `hero-cta-clicked`, so the two variations are measured the same way.

**Set up in LaunchDarkly (Test):**
1. **Metrics → Create metric:** custom event with key **`hero-cta-clicked`**, measuring **occurrence** (did the user click?), with **higher is better**, and randomization unit **user**. Name it *Hero CTA click-through*.
2. **Experiments → Create experiment:**
   - Type: feature change. Randomization unit: user.
   - Metric: *Hero CTA click-through*.
   - Flag: `hero-redesign`, on the **default rule**. Individually targeted and rule-matched users stay outside the experiment.
   - Variations: `false` (classic) as **control**, `true` (new) as **treatment**. Split 50/50, with 100% of the default-rule audience included.
   - Save, then **Start** the experiment. The flag must be **On**.

**Generate data** (synthetic): in the console, run this 3–4 times:
```js
await abc.simulateTraffic(500)
```
Each simulated visitor is a new anonymous context. LaunchDarkly assigns it to a variation, and it "clicks" with a fixed made-up probability (8% classic, 12% new). A summary table prints at the end. Real clicks on the Start free trial button are counted too.

**Read the results:** after a few minutes, the experiment's **Results** show exposures, conversion rate per variation, and the probability that each variation is best. Once the treatment is clearly ahead, stop the experiment and ship the winning variation to the default rule.

*Synthetic visitors count toward the account's usage, so a few thousand is plenty.*

### Not implemented: AI Configs

The "Ask ABC" chatbot answers from canned replies in the browser. AI Configs need LaunchDarkly's server-side AI SDK and a secret model API key, so they require a server. The comments at the top of `js/chat.js` outline how that would work.

---

## Console command reference

| Command | What it does |
|---|---|
| `abc.help()` | List all commands |
| `abc.users()` | List the demo users and their attributes |
| `abc.viewAs('<key>')` | Switch user; LaunchDarkly re-evaluates flags for them |
| `abc.why()` | Explain each flag's value for the current user (evaluation reason) |
| `abc.features()` | Show current flag values |
| `abc.simulateBug()` | Break the new hero to trigger the error alert |
| `abc.reset()` | Remove the bug and clear the error counter |
| `abc.simulateTraffic(500)` | Send synthetic visitors for the experiment |
| `abc.setFeature('heroRedesign', true)` | Flip a local switch; only used when no client-side ID is configured |

---

## How it works

| File | Role |
|---|---|
| `index.html` / `pricing.html` | The two pages. The hero (`#hero`) on Home is the flagged component. |
| `js/config.js` | Client-side ID (**replace with your own**) and the error-alert threshold. |
| `js/common.js` | Loads the SDK from the CDN and starts it once per page with the current user as the context (streaming on, evaluation reasons on). |
| `js/features.js` | The only file that talks to the SDK: `isEnabled()` (flag evaluation), `onChange()` (change listener), `identifyUser()` (switch context), `getDetail()` (evaluation reason) and `track()` (custom events). |
| `js/home.js` | Renders the classic or redesigned hero, re-renders on flag changes, simulates the bug and raises the error alert. |
| `js/users.js` | Demo users and their conversion to LaunchDarkly contexts. |
| `js/tracking.js` | Event keys and `trackEvent()`, which sends custom events to LaunchDarkly. |
| `js/simulate-traffic.js` | Synthetic visitors for the experiment, using a separate SDK client so the page isn't affected. |
| `js/console-tools.js` | `[ABC]` console logging and the `abc.*` commands. |
| `js/chat.js` | The "Ask ABC" chatbot (canned replies). |
| `js/pricing.js` | Tracks "Choose plan" clicks (`plan-selected`). |
| `css/styles.css` | Styling. |

**Design notes**
- **Safe fallback:** if LaunchDarkly can't be reached, `hero-redesign` falls back to `false`, the known-good classic hero.
- **Secrets stay out of the browser:** only the client-side ID is in the code. The SDK key isn't used, and the trigger URL is only ever used from a terminal.
- **No reloads:** the SDK keeps a streaming connection open, so flag toggles, targeting edits and trigger firings reach the page within moments.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Console says `No client-side ID in js/config.js` | Add your client-side ID to `js/config.js` and refresh. |
| `LaunchDarkly start: timeout` or `failed` | Check your internet connection and that the client-side ID is correct. |
| Flag never changes, or reason shows `error: FLAG_NOT_FOUND` | Check that the key is exactly `hero-redesign`, that **SDKs using Client-side ID** is enabled on the flag, and that the client-side ID is from the same environment you're editing. |
| Everyone gets the default rule | Attribute names and values are case-sensitive (`plan` / `enterprise`). Confirm the targeting change was saved in the same environment. |
| `abc is not defined` | A script failed to load. Check the first red error in the console. Make sure you opened the site through `http://localhost:3000`, not by double-clicking the file. |
| Port 3000 is in use | Use another port, e.g. `npx serve -l 3001`, and open http://localhost:3001. |
| Trigger call returns an error | Confirm the trigger is enabled and belongs to the same environment. On Windows, use `curl.exe`. |
| Experiment shows no exposures | The experiment must be **started** and the flag **On**. Only visitors evaluated after the start are counted. |
| Page always shows one user after a reload | The selected demo user is remembered in the browser. Run `abc.viewAs('anonymous')` to reset. |
