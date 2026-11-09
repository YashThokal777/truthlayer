import { cleanInline, compareVersions, splitSentences } from '../extract.js';

const HEADING_RE = /^(#{1,3})\s+(.*)$/;
const VERSION_RE = /\[?v?(\d+\.\d+(?:\.\d+)?(?:-[\w.]+)?)\]?/;
const DATE_RE = /(\d{4}-\d{2}-\d{2})/;

/**
 * Parse a "Keep a Changelog" style file:
 *   ## [2.0.0] - 2026-10-01
 *   - Increased the rate limit from 100 to 200 requests per minute.
 */
export function parseChangelog(text) {
  const lines = text.split(/\r?\n/);
  const entries = [];
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h = line.match(HEADING_RE);
    if (h) {
      const title = h[2];
      const vm = title.match(VERSION_RE);
      const unreleased = /unreleased/i.test(title);
      if ((vm && h[1].length <= 2) || unreleased) {
        const dm = title.match(DATE_RE);
        cur = {
          version: unreleased ? 'Unreleased' : vm[1],
          date: dm ? new Date(`${dm[1]}T00:00:00Z`) : unreleased ? new Date() : null,
          line: i + 1,
          items: [],
        };
        entries.push(cur);
      }
      continue;
    }
    if (!cur) continue;
    const clean = cleanInline(line.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, ''));
    if (!clean) continue;
    for (const s of splitSentences(clean)) cur.items.push({ text: s, line: i + 1 });
  }
  const released = entries.filter((e) => e.version !== 'Unreleased');
  const latest = released.length
    ? released.reduce((a, b) => (compareVersions(b.version, a.version) > 0 ? b : a))
    : null;
  return { entries, latest };
}
