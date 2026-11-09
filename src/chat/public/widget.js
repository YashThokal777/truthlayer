// <truthlayer-chat> — an embeddable chat widget with cited answers.
//
//   <script src="https://your-server/widget.js"></script>
//   <truthlayer-chat endpoint="https://your-server"></truthlayer-chat>
//
// Attributes:
//   endpoint  URL of the TruthLayer server (default: same origin)
//   mode      "bubble" (floating button, default) or "inline" (fills its container)
//   title     Header title (default: the name in truthlayer.yml)
//   accent    Accent color, e.g. "#1e3a36"
//   theme     "light" or "dark" (default: follows the visitor's system setting)
(() => {
  if (customElements.get('truthlayer-chat')) return;

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function inline(s) {
    return s
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[(\d{1,2})\]/g, '<button class="cite" data-n="$1" type="button" aria-label="Source $1">$1</button>');
  }

  /** Very small Markdown renderer: paragraphs, lists, code blocks, inline code, bold, citations. */
  function renderMarkdown(text) {
    const parts = esc(text).split(/```[a-z]*\n?([\s\S]*?)```/g);
    let html = '';
    parts.forEach((part, i) => {
      if (i % 2) {
        html += `<pre><code>${part.replace(/\n$/, '')}</code></pre>`;
        return;
      }
      for (const block of part.split(/\n{2,}/)) {
        const lines = block.split('\n').filter((l) => l.trim());
        if (!lines.length) continue;
        if (lines.every((l) => /^\s*(?:[-*•]|\d+[.)])\s+/.test(l))) {
          const ordered = /^\s*\d/.test(lines[0]);
          html += `<${ordered ? 'ol' : 'ul'}>${lines.map((l) => `<li>${inline(l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, ''))}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`;
        } else {
          html += `<p>${lines.map(inline).join('<br>')}</p>`;
        }
      }
    });
    return html;
  }

  const DARK = `
      --tl-bg: #17231f; --tl-raised: #1d2b27; --tl-text: #e6ede8; --tl-muted: #a2b5ae; --tl-rule: #2d433d;
      --tl-truth: #d6b66d; --tl-truth-mark: #c9a557; --tl-warn: #ff9b83; --tl-warn-bg: #3a211b; --tl-warn-rule: #5c3227;
      --tl-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
      --tl-ring: color-mix(in srgb, var(--tl-accent) 40%, #ffffff);`;

  const STYLE = `
    :host {
      --tl-accent: #1e3a36;
      --tl-on-accent: #ffffff;
      --tl-bg: #fbfbf8;
      --tl-raised: #ffffff;
      --tl-text: #152320;
      --tl-muted: #55645f;
      --tl-rule: #e0e2da;
      --tl-truth: #84651f;
      --tl-truth-mark: #b08a3e;
      --tl-warn: #a62f19;
      --tl-warn-bg: #fbebe6;
      --tl-warn-rule: #f1c7bb;
      --tl-shadow: 0 18px 48px rgba(15, 25, 22, 0.22), 0 3px 10px rgba(15, 25, 22, 0.10);
      --tl-ring: var(--tl-accent);
      --tl-mono: ui-monospace, "Cascadia Mono", "SF Mono", Menlo, Consolas, monospace;
      font-family: "Segoe UI Variable Text", "Segoe UI", -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", Arial, sans-serif;
      color: var(--tl-text);
      font-size: 14.5px;
      line-height: 1.55;
    }
    @media (prefers-color-scheme: dark) { :host(:not([theme="light"])) { ${DARK} } }
    :host([theme="dark"]) { ${DARK} }
    * { box-sizing: border-box; }
    button { font: inherit; cursor: pointer; }
    ::selection { background: color-mix(in srgb, var(--tl-accent) 28%, transparent); }
    :focus-visible { outline: 2px solid var(--tl-ring); outline-offset: 2px; }
    header :focus-visible { outline-color: var(--tl-on-accent); }
    svg { flex: none; }

    .launcher {
      position: fixed; right: 20px; bottom: 20px; z-index: 2147483000;
      width: 54px; height: 54px; border-radius: 4px; border: 0;
      background: var(--tl-accent); color: var(--tl-on-accent); box-shadow: var(--tl-shadow);
      display: grid; place-items: center; transition: transform .25s cubic-bezier(.16, 1, .3, 1);
    }
    .launcher:hover { transform: translateY(-2px); }
    .launcher svg { width: 24px; height: 24px; grid-area: 1 / 1; transition: opacity .2s, transform .3s cubic-bezier(.16, 1, .3, 1); }
    .launcher .shut { opacity: 0; transform: rotate(-45deg); }
    .launcher[aria-expanded="true"] .open { opacity: 0; transform: rotate(45deg); }
    .launcher[aria-expanded="true"] .shut { opacity: 1; transform: none; }

    .panel { display: flex; flex-direction: column; background: var(--tl-bg); overflow: hidden; }
    :host([mode="inline"]) { display: block; height: 100%; }
    :host([mode="inline"]) .panel { height: 100%; border-radius: 2px; background: transparent; }
    :host([mode="inline"]) .log { background: var(--tl-bg); }
    :host([mode="inline"]) .foot { border-radius: 0 0 2px 2px; }
    :host([mode="inline"]) header { border-radius: 2px 2px 0 0; }
    :host(:not([mode="inline"])) .panel {
      position: fixed; right: 20px; bottom: 86px; z-index: 2147483000;
      width: min(410px, calc(100vw - 32px)); height: min(640px, calc(100vh - 116px));
      border-radius: 4px; box-shadow: var(--tl-shadow); border: 1px solid var(--tl-rule);
      transform-origin: bottom right; transition: opacity .2s ease, transform .3s cubic-bezier(.16, 1, .3, 1);
    }
    :host(:not([mode="inline"])) .panel[hidden] { display: flex; opacity: 0; transform: translateY(10px); pointer-events: none; visibility: hidden; transition: opacity .15s ease, transform .2s ease, visibility 0s .2s; }
    @media (max-width: 480px) {
      :host(:not([mode="inline"])) .panel { right: 8px; left: 8px; width: auto; bottom: 82px; height: calc(100vh - 96px); height: calc(100dvh - 96px); }
    }

    header { display: flex; align-items: center; gap: 12px; padding: 13px 14px 13px 16px; background: var(--tl-accent); color: var(--tl-on-accent); }
    .seal { width: 28px; height: 28px; display: grid; place-items: center; border: 1.5px solid color-mix(in srgb, var(--tl-on-accent) 55%, transparent); border-radius: 2px; }
    .seal svg { width: 15px; height: 15px; }
    .title { font-weight: 620; font-size: 15px; line-height: 1.25; }
    .subtitle { font-size: 12.5px; opacity: .82; }
    .close { margin-left: auto; background: none; border: 0; color: inherit; width: 32px; height: 32px; border-radius: 2px; display: grid; place-items: center; opacity: .85; }
    .close svg { width: 16px; height: 16px; }
    .close:hover { opacity: 1; background: color-mix(in srgb, var(--tl-on-accent) 14%, transparent); }
    :host([mode="inline"]) .close { display: none; }

    .log { position: relative; flex: 1; overflow-y: auto; padding: 18px 16px; display: flex; flex-direction: column; gap: 20px; scroll-behavior: smooth; scrollbar-width: thin; scrollbar-color: var(--tl-rule) transparent; }
    .empty { margin-top: auto; padding: 8px 2px; }
    .legend { margin-top: 16px; }
    .sources.legend .src { grid-template-columns: 14px minmax(0, 1fr); }
    .sources.legend .src .meta { grid-column: 2; }
    .empty h3 { margin: 0 0 4px; font-size: 18px; font-weight: 620; line-height: 1.3; text-wrap: balance; }
    .empty p { margin: 0; color: var(--tl-muted); }
    .chips { display: grid; margin-top: 18px; border-top: 1px solid var(--tl-rule); }
    .chip { display: flex; align-items: center; justify-content: space-between; gap: 12px; text-align: left; border: 0; border-bottom: 1px solid var(--tl-rule); background: none; color: var(--tl-text); padding: 11px 2px; font-size: 14px; transition: color .15s, padding .25s cubic-bezier(.16, 1, .3, 1); }
    .chip svg { width: 15px; height: 15px; color: var(--tl-muted); }
    .chip:hover { color: var(--tl-accent); padding-left: 6px; }
    @media (prefers-color-scheme: dark) { :host(:not([theme="light"])) .chip:hover { color: var(--tl-text); } }
    :host([theme="dark"]) .chip:hover { color: var(--tl-text); }

    .msg { max-width: 100%; animation: rise .3s cubic-bezier(.16, 1, .3, 1); }
    .msg.user { align-self: flex-end; max-width: 85%; background: var(--tl-accent); color: var(--tl-on-accent); padding: 9px 13px; border-radius: 2px; white-space: pre-wrap; overflow-wrap: anywhere; }
    .msg.bot { align-self: stretch; }
    .answer { overflow-wrap: anywhere; }
    .answer p { margin: 0 0 9px; } .answer p:last-child { margin-bottom: 0; }
    .answer ul, .answer ol { margin: 4px 0 9px; padding-left: 20px; }
    .answer li { margin: 2px 0; }
    .answer code { font-family: var(--tl-mono); font-size: 12.5px; background: var(--tl-raised); border: 1px solid var(--tl-rule); padding: 1px 5px; border-radius: 2px; }
    .answer pre { background: var(--tl-raised); border: 1px solid var(--tl-rule); border-radius: 2px; padding: 10px 12px; overflow-x: auto; }
    .answer pre code { border: 0; padding: 0; background: none; }
    .muted { color: var(--tl-muted); }
    .cite { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 4px; margin: 0 1px; border-radius: 2px; border: 0; background: var(--tl-accent); color: var(--tl-on-accent); font: 600 11px/1 var(--tl-mono); vertical-align: 1px; }
    .cite:hover { filter: brightness(1.2); }

    .warn { margin-top: 12px; display: flex; gap: 9px; align-items: flex-start; background: var(--tl-warn-bg); color: var(--tl-warn); border: 1px solid var(--tl-warn-rule); border-radius: 2px; padding: 9px 11px; font-size: 13px; }
    .warn svg { width: 16px; height: 16px; margin-top: 1px; }
    .warn span { color: var(--tl-text); }
    .sources { list-style: none; margin: 12px 0 0; padding: 0; border-top: 1px solid var(--tl-rule); }
    .src { display: grid; grid-template-columns: 14px 18px minmax(0, 1fr); gap: 1px 8px; align-items: start; padding: 8px 2px; border-bottom: 1px solid var(--tl-rule); font-size: 12.5px; transition: background .5s ease; }
    .src.flash { background: color-mix(in srgb, var(--tl-accent) 12%, transparent); transition: none; }
    .src .mk { width: 14px; height: 14px; margin-top: 2px; }
    .src .n { font: 600 11.5px/18px var(--tl-mono); color: var(--tl-muted); }
    .src .h { font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .src .meta { grid-column: 3; color: var(--tl-muted); font-family: var(--tl-mono); font-size: 11.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .src.truth .h { color: var(--tl-truth); }
    .src .snip { grid-column: 3; color: var(--tl-muted); margin-top: 4px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; white-space: pre-line; }

    .typing { display: inline-flex; gap: 5px; padding: 6px 0; }
    .typing i { width: 6px; height: 6px; border-radius: 1px; background: var(--tl-muted); animation: blink 1.2s infinite ease-in-out; }
    .typing i:nth-child(2) { animation-delay: .15s; } .typing i:nth-child(3) { animation-delay: .3s; }

    form { display: flex; gap: 8px; align-items: flex-end; padding: 12px 12px 8px; border-top: 1px solid var(--tl-rule); background: var(--tl-bg); }
    textarea { flex: 1; resize: none; max-height: 140px; min-height: 42px; font: inherit; color: var(--tl-text); background: var(--tl-raised); border: 1px solid var(--tl-rule); border-radius: 2px; padding: 9px 12px; outline: none; transition: border-color .15s; caret-color: var(--tl-ring); }
    textarea::placeholder { color: var(--tl-muted); }
    textarea:focus { border-color: var(--tl-ring); }
    .send { flex: none; height: 42px; padding: 0 14px; border: 0; border-radius: 2px; background: var(--tl-accent); color: var(--tl-on-accent); display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-size: 13.5px; transition: opacity .15s; }
    .send:disabled { opacity: .4; cursor: default; }
    .send svg { width: 16px; height: 16px; }
    .foot { font-size: 11.5px; color: var(--tl-muted); padding: 0 12px 10px; background: var(--tl-bg); }

    @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    @keyframes blink { 0%, 80%, 100% { opacity: .25; } 40% { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } .log { scroll-behavior: auto; } }
  `;

  const SV = (d, w = 1.6, cls = '') =>
    `<svg class="${cls}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON_CHAT = SV('<path d="M2.5 3.5h11v7.5H7l-3.5 2.5V11h-1z"/>', 1.5, 'open');
  const ICON_SHUT = SV('<path d="M4 4l8 8M12 4l-8 8"/>', 1.6, 'shut');
  const ICON_X = SV('<path d="M4 4l8 8M12 4l-8 8"/>');
  const ICON_SEND = SV('<path d="M3 8h10M9 4l4 4-4 4"/>');
  const ICON_MARK = SV('<path d="M3.5 8.3l2.8 2.7 6.2-6.3"/>', 1.8);
  const ICON_WARN = SV('<path d="M8 2.5l6 10.5H2z"/><path d="M8 6.5v3"/><path d="M8 11.4v.1"/>');
  const ICON_ASK = SV('<path d="M6 3.5l4.5 4.5L6 12.5"/>');
  const MARK_TRUTH = '<svg class="mk" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="4.5" fill="var(--tl-truth-mark)"/></svg>';
  const MARK_PLAIN = '<svg class="mk" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="4.25" fill="none" stroke="var(--tl-muted)" stroke-width="1.6"/></svg>';

  class TruthLayerChat extends HTMLElement {
    static get observedAttributes() {
      return ['accent', 'title'];
    }

    constructor() {
      super();
      this.root = this.attachShadow({ mode: 'open' });
      this.busy = false;
      this.info = null;
    }

    get endpoint() {
      return (this.getAttribute('endpoint') || '').replace(/\/+$/, '');
    }

    connectedCallback() {
      if (this.rendered) return;
      this.rendered = true;
      const inline = this.getAttribute('mode') === 'inline';
      this.root.innerHTML = `
        <style>${STYLE}</style>
        ${inline ? '' : `<button class="launcher" part="launcher" aria-label="Open chat" aria-expanded="false">${ICON_CHAT}${ICON_SHUT}</button>`}
        <section class="panel" part="panel" ${inline ? '' : 'hidden'} role="${inline ? 'region' : 'dialog'}" aria-label="Chat">
          <header>
            <div class="seal">${ICON_MARK}</div>
            <div><div class="title">Assistant</div><div class="subtitle">Answers from the docs, with sources</div></div>
            <button class="close" type="button" aria-label="Close chat">${ICON_X}</button>
          </header>
          <div class="log" aria-live="polite"></div>
          <form>
            <textarea rows="1" placeholder="Ask a question…" aria-label="Your question"></textarea>
            <button class="send" type="submit" disabled>Ask ${ICON_SEND}</button>
          </form>
          <div class="foot">Answers can be wrong, so check the sources.</div>
        </section>`;
      this.$ = (sel) => this.root.querySelector(sel);
      this.log = this.$('.log');
      this.input = this.$('textarea');
      this.sendBtn = this.$('.send');
      this.applyAccent();

      this.$('.launcher')?.addEventListener('click', () => this.toggle());
      this.$('.close').addEventListener('click', () => this.toggle(false));
      this.$('form').addEventListener('submit', (e) => {
        e.preventDefault();
        this.ask(this.input.value);
      });
      this.input.addEventListener('input', () => {
        this.input.style.height = 'auto';
        this.input.style.height = `${Math.min(this.input.scrollHeight, 140)}px`;
        this.sendBtn.disabled = this.busy || !this.input.value.trim();
      });
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.ask(this.input.value);
        }
        if (e.key === 'Escape') this.toggle(false);
      });
      this.log.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (chip) return this.ask(chip.dataset.q);
        const cite = e.target.closest('.cite');
        if (cite) {
          const card = cite.closest('.msg')?.querySelector(`.src[data-n="${cite.dataset.n}"]`);
          if (card) {
            card.scrollIntoView({ block: 'nearest' });
            card.classList.add('flash');
            setTimeout(() => card.classList.remove('flash'), 900);
          }
        }
      });
      this.renderEmpty();
      this.loadInfo();
    }

    attributeChangedCallback() {
      if (this.rendered) {
        this.applyAccent();
        this.applyTitle();
      }
    }

    applyAccent() {
      const a = this.getAttribute('accent');
      if (a) this.style.setProperty('--tl-accent', a);
      // Pick dark or white text on the accent, whichever reads better (any host color works).
      const probe = document.createElement('span');
      probe.style.cssText = 'position:absolute;visibility:hidden;color:var(--tl-accent)';
      this.root.appendChild(probe);
      const m = getComputedStyle(probe).color.match(/[\d.]+/g);
      probe.remove();
      if (!m) return;
      const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      const L = 0.2126 * lin(+m[0]) + 0.7152 * lin(+m[1]) + 0.0722 * lin(+m[2]);
      const onWhite = 1.05 / (L + 0.05);
      const onDark = (L + 0.05) / 0.0672; // #152320 has luminance ≈ 0.0172
      this.style.setProperty('--tl-on-accent', onWhite >= onDark ? '#ffffff' : '#152320');
    }

    applyTitle() {
      this.$('.title').textContent = this.getAttribute('title') || this.info?.name || 'Assistant';
    }

    async loadInfo() {
      try {
        const r = await fetch(`${this.endpoint}/api/info`);
        this.info = await r.json();
        this.applyTitle();
        if (!this.log.querySelector('.msg')) this.renderEmpty();
      } catch {
        this.applyTitle();
      }
    }

    toggle(open) {
      const panel = this.$('.panel');
      if (this.getAttribute('mode') === 'inline') return;
      const show = open ?? panel.hidden;
      panel.hidden = !show;
      this.$('.launcher')?.setAttribute('aria-expanded', String(show));
      this.$('.launcher')?.setAttribute('aria-label', show ? 'Close chat' : 'Open chat');
      if (show) setTimeout(() => this.input.focus(), 50);
      else if (open === false) this.$('.launcher')?.focus();
    }

    renderEmpty() {
      const suggestions = this.info?.suggestions ?? [];
      const name = this.info?.name?.replace(/ assistant$/i, '') || 'the product';
      this.log.innerHTML = `
        <div class="empty">
          <h3>Hi! Ask me anything about ${esc(name)}.</h3>
          <p>I answer from the docs and show you exactly where each answer came from.</p>
          <ul class="sources legend" aria-label="How sources are shown">
            <li class="src truth">${MARK_TRUTH}<span class="h">Source of truth</span><span class="meta">spec or changelog · file:line · &lt;age&gt;</span></li>
            <li class="src">${MARK_PLAIN}<span class="h">Docs page</span><span class="meta">docs page · file:line · &lt;age&gt;</span></li>
          </ul>
          ${suggestions.length ? `<div class="chips">${suggestions.map((s) => `<button class="chip" type="button" data-q="${esc(s)}"><span>${esc(s)}</span>${ICON_ASK}</button>`).join('')}</div>` : ''}
        </div>`;
    }

    add(html, cls) {
      this.log.querySelector('.empty')?.remove();
      const el = document.createElement('div');
      el.className = `msg ${cls}`;
      el.innerHTML = html;
      this.log.appendChild(el);
      this.log.scrollTop = this.log.scrollHeight;
      return el;
    }

    async ask(text) {
      const question = String(text || '').trim();
      if (!question || this.busy) return;
      this.busy = true;
      this.input.value = '';
      this.input.style.height = 'auto';
      this.sendBtn.disabled = true;
      this.add(esc(question), 'user');
      const pending = this.add('<div class="typing" role="status" aria-label="Looking through the docs"><i></i><i></i><i></i></div>', 'bot');
      try {
        const r = await fetch(`${this.endpoint}/api/ask`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ question }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
        pending.innerHTML = this.renderAnswer(data);
      } catch (e) {
        pending.innerHTML = `<div class="answer muted">Hmm, that didn't work: ${esc(e.message)}. Try again in a moment.</div>`;
      } finally {
        this.busy = false;
        this.sendBtn.disabled = !this.input.value.trim();
        // Show the start of the answer, not the end of the source list.
        const asked = pending.previousElementSibling;
        this.log.scrollTop = (asked ?? pending).offsetTop - 12;
        this.dispatchEvent(new CustomEvent('truthlayer-answer', { detail: { question }, bubbles: true, composed: true }));
      }
    }

    renderAnswer(data) {
      const searchOnly = data.mode !== 'llm';
      const body = searchOnly ? `<p class="muted">${esc(data.answer)}</p>` : renderMarkdown(data.answer);
      const warnings = (data.warnings || [])
        .map((w) => `<div class="warn" role="note">${ICON_WARN}<span>${esc(w.text)}</span></div>`)
        .join('');
      const sources = (data.sources || [])
        .map(
          (s) => `
          <li class="src${s.truth ? ' truth' : ''}" data-n="${s.n}">
            ${s.truth ? MARK_TRUTH : MARK_PLAIN}
            <span class="n">${s.n}</span>
            <span class="h">${esc(s.heading)}</span>
            <span class="meta">${esc(s.file)}:${s.line}${s.truth ? ' · source of truth' : ''} · updated ${esc(s.age)}</span>
            ${searchOnly && s.snippet ? `<span class="snip">${esc(s.snippet)}</span>` : ''}
          </li>`,
        )
        .join('');
      return `<div class="answer">${body}</div>${warnings}${sources ? `<ul class="sources" aria-label="Sources">${sources}</ul>` : ''}`;
    }
  }

  customElements.define('truthlayer-chat', TruthLayerChat);
})();
