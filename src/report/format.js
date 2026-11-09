import { color, timeAgo } from '../util.js';

export const BADGES = {
  stale: 'Outdated',
  removed_endpoint: 'Removed endpoint',
  conflict: 'Conflict',
  deprecated_endpoint: 'Deprecated endpoint',
  unknown_endpoint: 'Unknown endpoint',
  old_page: 'Old page',
};

const ROLE_LABEL = {
  truth: 'source of truth',
  outdated: 'outdated',
  conflict: 'says',
  warning: 'mentions',
  old: 'last updated',
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function summaryLine(s) {
  const parts = [plural(s.pages, 'page')];
  if (s.specs) parts.push(plural(s.specs, 'OpenAPI spec'));
  if (s.changelogs) parts.push(plural(s.changelogs, 'changelog'));
  return `Scanned ${parts.join(', ')} · ${plural(s.facts, 'fact')}${s.prMode ? ' · showing only files changed in this PR' : ''}`;
}

// ---------- terminal ----------

export function toTerminal(report, { cwdLabel } = {}) {
  const s = report.summary;
  const out = [];
  out.push('');
  out.push(`${color.bold('TruthLayer')} ${color.gray('·')} ${report.name}${cwdLabel ? color.gray(`  (${cwdLabel})`) : ''}`);
  out.push(color.gray(summaryLine(s)));
  out.push('');
  out.push(
    '  ' +
      [
        (s.outdated ? color.red : color.green)(`${s.outdated ? '✖' : '✔'} ${s.outdated} outdated`),
        (s.conflicts ? color.yellow : color.green)(`${s.conflicts ? '⚠' : '✔'} ${plural(s.conflicts, 'conflict')}`),
        (s.endpointWarnings ? color.yellow : color.green)(`${s.endpointWarnings ? '⚠' : '✔'} ${plural(s.endpointWarnings, 'endpoint warning')}`),
        color.gray(`ℹ ${plural(s.oldPages, 'old page')}`),
      ].join('   '),
  );

  if (!report.findings.length) {
    out.push('');
    out.push(color.green('  No outdated or conflicting facts found. Your assistant is in sync with your docs.'));
    out.push('');
    return out.join('\n');
  }

  for (const f of report.findings) {
    const paint = f.severity === 'error' ? color.red : f.severity === 'warning' ? color.yellow : color.gray;
    const icon = f.severity === 'error' ? '✖' : f.severity === 'warning' ? '⚠' : 'ℹ';
    out.push('');
    out.push(`${paint(`${icon} ${BADGES[f.type].toUpperCase()}`)}  ${color.bold(f.title)}`);
    out.push(`  ${f.summary}`);
    const width = Math.min(48, Math.max(...f.items.map((i) => `${i.file}:${i.line}`.length)));
    for (const i of f.items) {
      if (f.type === 'old_page') continue;
      const mark = i.role === 'truth' ? color.green('✓') : i.role === 'outdated' ? color.red('✗') : color.yellow('•');
      const where = `${i.file}:${i.line}`.padEnd(width);
      const role = (ROLE_LABEL[i.role] ?? i.role).padEnd(15);
      const note = i.note ? color.cyan(` (${i.note})`) : '';
      out.push(`    ${mark} ${color.gray(role)} ${color.cyan(where)}  ${i.raw}${note}  ${color.gray(`· ${timeAgo(i.date)}`)}`);
    }
    if (f.hint) out.push(color.gray(`  → ${f.hint}`));
  }
  out.push('');
  if (s.errors) {
    out.push(color.gray('  Your AI assistant may give wrong answers until these are fixed.'));
    out.push('');
  }
  return out.join('\n');
}

// ---------- markdown (GitHub PR comment) ----------

const esc = (t) => String(t ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').replace(/</g, '&lt;');

export function toMarkdown(report, { link } = {}) {
  const s = report.summary;
  const lines = ['<!-- truthlayer-report -->'];
  const where = (i) => {
    const label = `\`${i.file}:${i.line}\``;
    const url = link?.(i.file, i.line);
    return url ? `[${label}](${url})` : label;
  };

  const main = report.findings.filter((f) => f.severity !== 'info');
  const info = report.findings.filter((f) => f.severity === 'info');

  if (!main.length) {
    lines.push('<!-- truthlayer-clean -->');
    lines.push('## ✅ TruthLayer knowledge check');
    lines.push('');
    lines.push(`No outdated or conflicting facts found. ${summaryLine(s)}.`);
  } else {
    lines.push('## 🧠 TruthLayer knowledge check');
    lines.push('');
    lines.push(`**${s.outdated} outdated · ${plural(s.conflicts, 'conflict')} · ${plural(s.endpointWarnings, 'endpoint warning')}** — ${summaryLine(s)}.`);
    lines.push('');
    lines.push('> Your AI assistant may give wrong answers until these are fixed.');
    for (const f of main) {
      const icon = f.severity === 'error' ? '🔴' : '🟡';
      lines.push('');
      lines.push(`### ${icon} ${BADGES[f.type]}: ${esc(f.title)}`);
      lines.push('');
      lines.push(f.summary);
      lines.push('');
      lines.push('| | Where | Says |');
      lines.push('|---|---|---|');
      for (const i of f.items) {
        const role = { truth: '✅ Source of truth', outdated: '❌ Outdated', conflict: `⚠️ Says${i.note ? ` (${i.note})` : ''}`, warning: '⚠️ Mentions' }[i.role] ?? i.role;
        lines.push(`| ${role} | ${where(i)} | ${esc(i.raw)} |`);
      }
      if (f.hint) {
        lines.push('');
        lines.push(`💡 ${esc(f.hint).replace(/\\\|/g, '|')}`);
      }
    }
  }

  if (info.length) {
    lines.push('');
    lines.push(`<details><summary>ℹ️ ${plural(info.length, 'page')} not updated for a long time</summary>`);
    lines.push('');
    for (const f of info) lines.push(`- ${where(f.items[0])} — ${f.summary}`);
    lines.push('');
    lines.push('</details>');
  }
  lines.push('');
  lines.push('<sub>Checked by <a href="https://github.com/YashThokal777/truthlayer">TruthLayer</a>. Mark a line as correct with <code>&lt;!-- truthlayer-ignore --&gt;</code>.</sub>');
  lines.push('');
  return lines.join('\n');
}

export function toJson(report) {
  return JSON.stringify(report, null, 2) + '\n';
}
