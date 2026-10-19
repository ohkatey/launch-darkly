/**
 * js/chat.js
 *
 * The "Ask ABC" support chatbot widget, shown on both pages.
 *
 * It answers from a short list of canned replies, entirely in the browser,
 * so it needs no server or API key.
 *
 * Extending it with LaunchDarkly AI Configs (not implemented here): AI
 * Configs are read with LaunchDarkly's server-side AI SDK, and calling a real
 * model needs a secret API key, so both require a small server. That server
 * would expose an endpoint (e.g. POST /api/chat) that:
 *   1. gets this user's AI Config (model + prompt) from LaunchDarkly,
 *   2. calls the model provider (e.g. Anthropic) with it,
 *   3. records metrics and feedback with the AI Config's tracker.
 * getReply() would then call that endpoint. CHAT_CONFIG shows the values an
 * AI Config would control.
 */

import { getCurrentUser } from './users.js';
import { log } from './console-tools.js';

/**
 * The chatbot's configuration: which model and system prompt it uses. With
 * AI Configs, these values would come from LaunchDarkly and could change
 * without a redeploy.
 */
const CHAT_CONFIG = {
  model: 'canned-replies', // shown under each answer
  systemPrompt:
    'You are ABC Company’s friendly support assistant. Answer questions ' +
    'about plans, pricing, trials and features in two or three sentences.',
};

/** Canned answers: words to look for → the reply to send. */
const CANNED_REPLIES = [
  { match: ['price', 'pricing', 'cost', 'plan'], reply: 'ABC has three plans: Starter ($12/user/month), Pro ($24/user/month) and Enterprise (custom pricing). You can compare them on the Pricing page.' },
  { match: ['trial', 'free'], reply: 'Every plan includes a 14-day free trial. No credit card is required to start.' },
  { match: ['sso', 'security', 'saml'], reply: 'SSO (SAML) and audit logs are included on the Enterprise plan.' },
  { match: ['cancel', 'refund'], reply: 'You can cancel at any time from Settings → Billing. Annual plans are refunded pro rata.' },
];

/** Pick a canned reply for a question. */
async function getReply(message) {
  const text = message.toLowerCase();
  const hit = CANNED_REPLIES.find((r) => r.match.some((word) => text.includes(word)));
  // Short delay so the "Typing…" indicator is visible, like a real model call.
  await new Promise((resolve) => setTimeout(resolve, 600));
  return hit
    ? hit.reply
    : 'Thanks for your question! I can help with plans, pricing, trials, security and billing. What would you like to know?';
}

export function initChat() {
  const widget = document.createElement('section');
  widget.className = 'chat';
  widget.setAttribute('aria-label', 'Support chat');
  widget.innerHTML = `
    <button class="chat-launcher" type="button" aria-expanded="false" aria-controls="chat-window">
      💬 Ask ABC
    </button>
    <div class="chat-window" id="chat-window" hidden>
      <header class="chat-header">
        <strong>ABC Support</strong>
        <button class="chat-close" type="button" aria-label="Close chat">×</button>
      </header>
      <ol class="chat-messages" aria-live="polite"></ol>
      <form class="chat-form">
        <input type="text" name="message" placeholder="Ask about plans, trials, SSO…" autocomplete="off" required>
        <button class="btn btn-primary" type="submit">Send</button>
      </form>
    </div>
  `;
  document.body.append(widget);

  const launcher = widget.querySelector('.chat-launcher');
  const win = widget.querySelector('.chat-window');
  const list = widget.querySelector('.chat-messages');
  const form = widget.querySelector('.chat-form');
  const input = form.elements.message;

  const setOpen = (open) => {
    win.hidden = !open;
    launcher.hidden = open;
    launcher.setAttribute('aria-expanded', String(open));
    if (open) input.focus();
  };
  launcher.addEventListener('click', () => setOpen(true));
  widget.querySelector('.chat-close').addEventListener('click', () => setOpen(false));

  addMessage(list, 'bot', 'Hi! I can answer questions about ABC plans, pricing and trials.');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    input.value = '';
    addMessage(list, 'user', message);
    const typing = addMessage(list, 'bot', 'Typing…');

    const reply = await getReply(message);
    typing.remove();
    addMessage(list, 'bot', reply, { model: CHAT_CONFIG.model });
    log(`chat: user=${getCurrentUser().key} model=${CHAT_CONFIG.model} q="${message}"`);
  });
}

/** Append one chat bubble. Bot answers show the model plus thumbs up/down. */
function addMessage(list, from, text, meta) {
  const li = document.createElement('li');
  li.className = `chat-msg chat-msg-${from}`;

  const bubble = document.createElement('p');
  bubble.textContent = text; // text only, never HTML
  li.append(bubble);

  if (meta?.model) {
    const footer = document.createElement('div');
    footer.className = 'chat-meta';
    const model = document.createElement('span');
    model.textContent = `model: ${meta.model}`;
    footer.append(model, feedbackButton('👍', 'positive'), feedbackButton('👎', 'negative'));
    li.append(footer);
  }

  list.append(li);
  list.scrollTop = list.scrollHeight;
  return li;
}

/**
 * A thumbs up/down button. Records one rating per answer and logs it. With
 * AI Configs, this would be recorded as feedback with the AI Config tracker.
 */
function feedbackButton(icon, rating) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'chat-feedback';
  btn.textContent = icon;
  btn.setAttribute('aria-label', rating === 'positive' ? 'Helpful' : 'Not helpful');
  btn.addEventListener('click', () => {
    btn.parentElement.querySelectorAll('.chat-feedback').forEach((b) => (b.disabled = true));
    btn.classList.add('is-chosen');
    log(`chat feedback: ${rating} (user=${getCurrentUser().key})`);
  });
  return btn;
}
