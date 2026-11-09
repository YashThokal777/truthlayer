import { cleanInline, planFromCell, splitSentences } from '../extract.js';

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => cleanInline(c.trim()));
}

/**
 * Parse a Markdown file into:
 *  - sections: heading-based chunks for search and chat
 *  - sentences: short pieces of text (with line numbers) that facts are extracted from
 *
 * Supports `<!-- truthlayer-ignore -->` (skip the next line) and
 * `<!-- truthlayer-ignore-file -->` (skip facts in the whole file).
 */
export function parseMarkdown(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  const sentences = [];
  let inFence = false;
  let inFront = false;
  let ignoreNext = false;
  let ignoreFile = false;
  const stack = [];
  let current = { heading: '', path: [], line: 1, lines: [] };
  let table = null;

  const flush = (endLine) => {
    const body = current.lines.join('\n').trim();
    if (body || current.heading) {
      sections.push({
        heading: current.heading,
        path: current.path,
        line: current.line,
        endLine,
        text: body,
      });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const ln = i + 1;

    if (i === 0 && raw.trim() === '---') {
      inFront = true;
      continue;
    }
    if (inFront) {
      if (raw.trim() === '---' || raw.trim() === '...') inFront = false;
      continue;
    }
    if (/<!--\s*truthlayer-ignore-file\s*-->/i.test(raw)) ignoreFile = true;

    if (/^\s*(```|~~~)/.test(raw)) {
      inFence = !inFence;
      current.lines.push(raw);
      continue;
    }
    if (inFence) {
      current.lines.push(raw);
      continue;
    }

    const h = raw.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (h) {
      flush(ln - 1);
      const level = h[1].length;
      const title = cleanInline(h[2]);
      stack.length = level - 1;
      stack[level - 1] = title;
      current = { heading: title, path: stack.filter(Boolean), line: ln, lines: [] };
      table = null;
      continue;
    }

    current.lines.push(raw);

    if (/<!--\s*truthlayer-ignore\s*-->/i.test(raw)) {
      if (raw.replace(/<!--[\s\S]*?-->/g, '').trim() === '') ignoreNext = true;
      continue;
    }
    if (ignoreNext) {
      if (raw.trim() === '') continue;
      ignoreNext = false;
      continue;
    }
    if (ignoreFile) continue;

    const heading = current.heading;

    if (/^\s*\|/.test(raw)) {
      const cells = splitRow(raw);
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
      if (!table) {
        table = { headers: cells, plans: cells.map(planFromCell) };
        continue;
      }
      const label = cells[0] ?? '';
      const columnPlans = table.plans.some((p, idx) => idx > 0 && p);
      cells.forEach((cell, idx) => {
        if (idx === 0 || !cell) return;
        if (columnPlans) {
          // | Feature | Free | Pro |  ->  "10 Projects" on the Free plan
          if (!table.plans[idx]) return;
          sentences.push({ text: `${cell} ${label}`, line: ln, heading, plan: table.plans[idx], isTable: true });
        } else {
          // | Plan | Projects |  ->  "10 Projects" on the plan named in the first cell
          sentences.push({ text: `${cell} ${table.headers[idx] ?? ''}`.trim(), line: ln, heading, plan: planFromCell(label), isTable: true });
        }
      });
      continue;
    }
    table = null;

    const clean = cleanInline(raw.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '').replace(/^\s*>\s?/, ''));
    if (!clean) continue;
    for (const s of splitSentences(clean)) {
      sentences.push({ text: s, line: ln, heading, plan: null, isTable: false });
    }
  }
  flush(lines.length);
  return { sections, sentences };
}
