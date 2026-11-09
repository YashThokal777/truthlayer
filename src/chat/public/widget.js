// <truthlayer-chat> — an embeddable chat widget with cited answers.
//
//   <script src="https://your-server/widget.js"></script>
//   <truthlayer-chat endpoint="https://your-server"></truthlayer-chat>
//
// Attributes:
//   endpoint  URL of the TruthLayer server (default: same origin)
//   mode      "bubble" (floating button, default) or "inline" (fills its container)
//   title     Header title (default: the name in truthlayer.yml)
//   accent    Accent color, e.g. "#4f46e5"
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

  const STYLE = `
    :host {
      --tl-accent: #4f46e5;
      --tl-bg: #ffffff;
      --tl-surface: #f6f7f9;
      --tl-text: #14161a;
      --tl-muted: #646b77;
      --tl-border: #e3e6ea;
      --tl-user: var(--tl-accent);
      --tl-user-text: #ffffff;
      --tl-warn-bg: #fff7e0;
      --tl-warn-text: #7a4a00;
      --tl-warn-border: #f3d48a;
      --tl-ok: #12805c;
      --tl-shadow: 0 12px 40px rgba(15, 18, 25, 0.16), 0 2px 8px rgba(15, 18, 25, 0.06);
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: var(--tl-text);
      font-size: 14.5px;
      line-height: 1.55;
    }
    @media (prefers-color-scheme: dark) {
      :host(:not([theme="light"])) {
        --tl-bg: #15171c;
        --tl-surface: #1d2027;
        --tl-text: #eceef2;
        --tl-muted: #9aa1ad;
        --tl-border: #2c3039;
        --tl-warn-bg: #2e2513;
        --tl-warn-text: #f5d38b;
        --tl-warn-border: #5b4617;
        --tl-ok: #4fd1a1;
        --tl-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
      }
    }
    :host([theme="dark"]) {
      --tl-bg: #15171c; --tl-surface: #1d2027; --tl-text: #eceef2; --tl-muted: #9aa1ad; --tl-border: #2c3039;
      --tl-warn-bg: #2e2513; --tl-warn-text: #f5d38b; --tl-warn-border: #5b4617; --tl-ok: #4fd1a1;
    }
    * { box-sizing: border-box; }
    button { font: inherit; cursor: pointer; }

    .launcher {
      position: fixed; right: 20px; bottom: 20px; z-index: 2147483000;
      width: 56px; height: 56px; border-radius: 50%; border: 0;
      background: var(--tl-accent); color: #fff; box-shadow: var(--tl-shadow);
      display: grid; place-items: center; transition: transform .2s ease;
    }
    .launcher:hover { transform: scale(1.06); }
    .launcher svg { width: 26px; height: 26px; }

    .panel {
      display: flex; flex-direction: column; background: var(--tl-bg);
      border: 1px solid var(--tl-border); overflow: hidden;
    }
    :host([mode="inline"]) { display: block; height: 100%; }
    :host([mode="inline"]) .panel { height: 100%; border-radius: 16px; }
    :host(:not([mode="inline"])) .panel {
      position: fixed; right: 20px; bottom: 88px; z-index: 2147483000;
      width: min(400px, calc(100vw - 32px)); height: min(620px, calc(100vh - 120px));
      border-radius: 18px; box-shadow: var(--tl-shadow);
      transform-origin: bottom right; transition: opacity .18s ease, transform .18s ease;
    }
    :host(:not([mode="inline"])) .panel[hidden] { display: flex; opacity: 0; transform: translateY(8px) scale(.98); pointer-events: none; }
    @media (max-width: 480px) {
      :host(:not([mode="inline"])) .panel { right: 8px; left: 8px; width: auto; bottom: 84px; height: calc(100vh - 100px); }
    }

    header { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--tl-border); }
    .mark { width: 30px; height: 30px; border-radius: 9px; background: var(--tl-accent); color: #fff; display: grid; place-items: center; flex: none; }
    .mark svg { width: 17px; height: 17px; }
    .title { font-weight: 650; font-size: 15px; }
    .subtitle { color: var(--tl-muted); font-size: 12.5px; }
    .close { margin-left: auto; background: none; border: 0; color: var(--tl-muted); width: 32px; height: 32px; border-radius: 8px; }
    .close:hover { background: var(--tl-surface); }
    :host([mode="inline"]) .close { display: none; }

    .log { position: relative; flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 14px; scroll-behavior: smooth; }
    .empty { margin: auto 0; text-align: center; color: var(--tl-muted); padding: 8px; }
    .empty h3 { color: var(--tl-text); margin: 0 0 4px; font-size: 16px; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 14px; }
    .chip { border: 1px solid var(--tl-border); background: var(--tl-bg); color: var(--tl-text); border-radius: 999px; padding: 7px 12px; font-size: 13px; transition: border-color .15s, background .15s; }
    .chip:hover { border-color: var(--tl-accent); background: var(--tl-surface); }

    .msg { max-width: 92%; animation: rise .22s ease; }
    .msg.user { align-self: flex-end; background: var(--tl-user); color: var(--tl-user-text); padding: 9px 13px; border-radius: 16px 16px 4px 16px; white-space: pre-wrap; word-wrap: break-word; }
    .msg.bot { align-self: flex-start; width: 100%; max-width: 100%; }
    .bubble { background: var(--tl-surface); padding: 11px 14px; border-radius: 4px 16px 16px 16px; word-wrap: break-word; }
    .bubble p { margin: 0 0 8px; } .bubble p:last-child { margin-bottom: 0; }
    .bubble ul, .bubble ol { margin: 4px 0 8px; padding-left: 20px; }
    .bubble code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12.5px; background: var(--tl-bg); border: 1px solid var(--tl-border); padding: 1px 5px; border-radius: 5px; }
    .bubble pre { background: var(--tl-bg); border: 1px solid var(--tl-border); border-radius: 10px; padding: 10px; overflow-x: auto; }
    .bubble pre code { border: 0; padding: 0; background: none; }
    .muted { color: var(--tl-muted); }
    .cite { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 4px; margin: 0 1px; border-radius: 6px; border: 0; background: var(--tl-accent); color: #fff; font-size: 11px; font-weight: 600; vertical-align: 1px; }

    .warn { margin-top: 8px; display: flex; gap: 8px; background: var(--tl-warn-bg); color: var(--tl-warn-text); border: 1px solid var(--tl-warn-border); border-radius: 10px; padding: 8px 10px; font-size: 13px; }
    .sources { margin-top: 8px; display: grid; gap: 6px; }
    .src { display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; align-items: start; padding: 8px 10px; border: 1px solid var(--tl-border); border-radius: 10px; font-size: 12.5px; transition: border-color .2s, background .2s; }
    .src.flash { border-color: var(--tl-accent); background: var(--tl-surface); }
    .src .n { grid-row: span 2; width: 20px; height: 20px; border-radius: 6px; background: var(--tl-surface); display: grid; place-items: center; font-weight: 600; font-size: 11px; }
    .src .h { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .src .meta { color: var(--tl-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .src .snip { grid-column: 2; color: var(--tl-muted); margin-top: 4px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; white-space: pre-line; }
    .tag { display: inline-block; font-size: 10.5px; font-weight: 600; padding: 0 6px; border-radius: 999px; color: var(--tl-ok); border: 1px solid currentColor; margin-left: 4px; vertical-align: 1px; }

    .typing { display: inline-flex; gap: 4px; padding: 12px 14px; background: var(--tl-surface); border-radius: 4px 16px 16px 16px; }
    .typing i { width: 6px; height: 6px; border-radius: 50%; background: var(--tl-muted); animation: blink 1.2s infinite ease-in-out; }
    .typing i:nth-child(2) { animation-delay: .15s; } .typing i:nth-child(3) { animation-delay: .3s; }

    form { display: flex; gap: 8px; align-items: flex-end; padding: 12px; border-top: 1px solid var(--tl-border); }
    textarea { flex: 1; resize: none; max-height: 140px; min-height: 42px; font: inherit; color: var(--tl-text); background: var(--tl-surface); border: 1px solid transparent; border-radius: 12px; padding: 10px 12px; outline: none; transition: border-color .15s; }
    textarea:focus { border-color: var(--tl-accent); }
    .send { flex: none; width: 42px; height: 42px; border: 0; border-radius: 12px; background: var(--tl-accent); color: #fff; display: grid; place-items: center; transition: opacity .15s; }
    .send:disabled { opacity: .45; cursor: default; }
    .send svg { width: 18px; height: 18px; }
    .foot { text-align: center; font-size: 11px; color: var(--tl-muted); padding: 0 0 8px; }

    @keyframes rise { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
    @keyframes blink { 0%, 80%, 100% { opacity: .25; } 40% { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } .log { scroll-behavior: auto; } }
  `;

  const ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>';
  const ICON_X = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const ICON_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const ICON_MARK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg>';

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
        ${inline ? '' : `<button class="launcher" part="launcher" aria-label="Open chat">${ICON_CHAT}</button>`}
        <section class="panel" part="panel" ${inline ? '' : 'hidden'} role="dialog" aria-label="Chat">
          <header>
            <div class="mark">${ICON_MARK}</div>
            <div><div class="title">Assistant</div><div class="subtitle">Answers from the docs, with sources</div></div>
            <button class="close" aria-label="Close chat">${ICON_X}</button>
          </header>
          <div class="log" aria-live="polite"></div>
          <form>
            <textarea rows="1" placeholder="Ask a question…" aria-label="Your question"></textarea>
            <button class="send" type="submit" aria-label="Send" disabled>${ICON_SEND}</button>
          </form>
          <div class="foot">Answers can be wrong. Check the sources.</div>
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
        if (chip) return this.ask(chip.textContent);
        const cite = e.target.closest('.cite');
        if (cite) {
          const card = cite.closest('.msg')?.querySelector(`.src[data-n="${cite.dataset.n}"]`);
          if (card) {
            card.scrollIntoView({ block: 'nearest' });
            card.classList.add('flash');
            setTimeout(() => card.classList.remove('flash'), 1200);
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
      const show = open ?? panel.hidden;
      panel.hidden = !show;
      if (show) setTimeout(() => this.input.focus(), 50);
    }

    renderEmpty() {
      const suggestions = this.info?.suggestions ?? [];
      this.log.innerHTML = `
        <div class="empty">
          <h3>Ask anything about ${esc(this.info?.name?.replace(/ assistant$/i, '') || 'the product')}</h3>
          <div>Every answer links to the page it came from.</div>
          ${suggestions.length ? `<div class="chips">${suggestions.map((s) => `<button class="chip" type="button">${esc(s)}</button>`).join('')}</div>` : ''}
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
      const pending = this.add('<div class="typing" aria-label="Thinking"><i></i><i></i><i></i></div>', 'bot');
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
        pending.innerHTML = `<div class="bubble muted">Something went wrong: ${esc(e.message)}</div>`;
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
        .map((w) => `<div class="warn" role="note"><span aria-hidden="true">⚠</span><span>${esc(w.text)}</span></div>`)
        .join('');
      const sources = (data.sources || [])
        .map(
          (s) => `
          <div class="src" data-n="${s.n}">
            <span class="n">${s.n}</span>
            <span class="h">${esc(s.heading)}${s.truth ? '<span class="tag">source of truth</span>' : ''}</span>
            <span class="meta">${esc(s.file)}:${s.line} · updated ${esc(s.age)}</span>
            ${searchOnly && s.snippet ? `<span class="snip">${esc(s.snippet)}</span>` : ''}
          </div>`,
        )
        .join('');
      return `<div class="bubble">${body}</div>${warnings}${sources ? `<div class="sources">${sources}</div>` : ''}`;
    }
  }

  customElements.define('truthlayer-chat', TruthLayerChat);
})();
