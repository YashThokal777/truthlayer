import { sameValue } from '../extract.js';
import { capitalize } from '../util.js';

const KIND_LABELS = {
  rate_limit: (s) => `API rate limit (${s})`,
  price: (s) => `Price (${s})`,
  quantity: (s) => `${capitalize(s)} limit`,
  storage: (s) => `${capitalize(s)} limit`,
  size_limit: (s) => `Maximum ${s}`,
  pagination: () => 'Maximum items per page',
  retention: () => 'Data retention',
  timeout: (s) => capitalize(s),
  min_version: (s) => capitalize(s),
  product_version: () => 'Latest product version',
};

export function groupLabel(fact) {
  const base = (KIND_LABELS[fact.kind] ?? capitalize)(fact.subject);
  const plan = fact.plan ? ` — ${capitalize(fact.plan)} plan` : '';
  const scope = fact.scope ? ` — ${fact.scope} docs` : '';
  return `${base}${plan}${scope}`;
}

const item = (f, role, note) => ({
  role,
  file: f.file,
  line: f.line,
  raw: f.raw,
  sentence: f.sentence,
  date: f.date,
  type: f.type,
  note,
});

function distinctValues(facts) {
  const out = [];
  for (const f of facts) if (!out.some((v) => sameValue(v, f.value))) out.push(f.value);
  return out;
}

/** Of the changelog facts in a group, only the newest one is still true. */
function currentTruth(truths) {
  const changelog = truths.filter((f) => f.type === 'changelog');
  const others = truths.filter((f) => f.type !== 'changelog');
  if (!changelog.length) return others;
  const newest = changelog.reduce((a, b) => ((b.date ?? 0) > (a.date ?? 0) ? b : a));
  return [...others, newest];
}

function checkFacts(kb, findings) {
  const groups = new Map();
  for (const f of kb.facts) {
    if (!groups.has(f.group)) groups.set(f.group, []);
    groups.get(f.group).push(f);
  }

  for (const facts of groups.values()) {
    const label = groupLabel(facts[0]);
    const truths = currentTruth(facts.filter((f) => f.truth));
    const docs = facts.filter((f) => !f.truth);

    if (truths.length) {
      if (distinctValues(truths).length > 1) {
        findings.push({
          type: 'conflict',
          severity: 'error',
          title: label,
          summary: 'Your sources of truth disagree with each other.',
          items: truths.map((t) => item(t, 'truth')),
          hint: 'Decide which value is right and fix the other source first.',
        });
        continue;
      }
      const ref = truths.find((t) => t.type === 'changelog') ?? truths[0];
      const wrong = docs.filter((d) => !sameValue(d.value, ref.value));
      if (!wrong.length) continue;
      const changed = ref.oldValue != null && wrong.some((w) => sameValue(w.value, ref.oldValue));
      findings.push({
        type: 'stale',
        severity: 'error',
        title: label,
        summary: `${wrong.length === 1 ? '1 page says' : `${wrong.length} pages say`} something different from the source of truth.`,
        items: [
          ...truths.map((t) => item(t, 'truth')),
          ...wrong.map((w) => item(w, 'outdated')),
        ],
        hint: changed
          ? `Changelog ${ref.version} changed this from ${ref.oldValue} to ${ref.value}. The page still shows the old value.`
          : 'Update the page, or add <!-- truthlayer-ignore --> above the line if it is correct.',
      });
      continue;
    }

    if (distinctValues(docs).length > 1) {
      const sorted = [...docs].sort((a, b) => (b.date ?? 0) - (a.date ?? 0));
      findings.push({
        type: 'conflict',
        severity: 'error',
        title: label,
        summary: `${new Set(docs.map((d) => d.file)).size} pages give different values. Your assistant may answer either one.`,
        items: sorted.map((d, i) => item(d, 'conflict', i === 0 ? 'newest' : undefined)),
        hint: 'Pick the correct value and update the other pages. The newest page is listed first.',
      });
    }
  }
}

function checkEndpoints(kb, findings) {
  const spec = new Map(kb.endpoints.map((e) => [`${e.method} ${e.key}`, e]));
  const events = new Map();
  for (const e of kb.events) {
    const k = `${e.method} ${e.key}`;
    const prev = events.get(k);
    if (!prev || (e.date ?? 0) > (prev.date ?? 0)) events.set(k, e);
  }
  const hasSpec = kb.endpoints.length > 0;
  const byEndpoint = new Map();

  for (const m of kb.mentions) {
    if (m.scope) continue; // versioned docs may describe old endpoints on purpose
    const k = `${m.method} ${m.key}`;
    const inSpec = spec.get(k);
    const event = events.get(k);
    let type = null;
    if (event?.status === 'removed' && !inSpec) type = 'removed_endpoint';
    else if (inSpec?.deprecated || event?.status === 'deprecated') type = 'deprecated_endpoint';
    else if (hasSpec && !inSpec) type = 'unknown_endpoint';
    if (!type) continue;
    if (!byEndpoint.has(k)) byEndpoint.set(k, { type, mention: m, inSpec, event, items: [] });
    byEndpoint.get(k).items.push(m);
  }

  for (const [k, g] of byEndpoint) {
    const truthItems = [];
    if (g.event) truthItems.push({ role: 'truth', file: g.event.file, line: g.event.line, raw: g.event.sentence, sentence: g.event.sentence, date: g.event.date, type: 'changelog' });
    else if (g.inSpec) truthItems.push({ role: 'truth', file: g.inSpec.file, line: g.inSpec.line, raw: `${k} — deprecated: true`, sentence: '', date: g.inSpec.date, type: 'openapi' });
    const docs = g.items.map((m) => ({ role: g.type === 'deprecated_endpoint' ? 'warning' : 'outdated', file: m.file, line: m.line, raw: m.raw, sentence: m.sentence, date: m.date, type: 'markdown' }));
    const text = {
      removed_endpoint: { severity: 'error', summary: `Docs mention ${g.mention.raw}, but it was removed${g.event ? ` in ${g.event.version}` : ''}.`, hint: 'Remove or replace this endpoint in the docs.' },
      deprecated_endpoint: { severity: 'warning', summary: `Docs mention ${g.mention.raw}, which is deprecated.`, hint: 'Point readers to the new endpoint, or mark this one as deprecated in the docs.' },
      unknown_endpoint: { severity: 'warning', summary: `Docs mention ${g.mention.raw}, but it is not in your OpenAPI spec.`, hint: 'Check for a typo, a renamed path, or a missing endpoint in the spec.' },
    }[g.type];
    findings.push({ type: g.type, title: g.mention.raw, items: [...truthItems, ...docs], ...text });
  }
}

function checkAge(kb, findings, now) {
  const limit = Number(kb.config.check.stale_after_days);
  if (!limit || limit <= 0) return;
  for (const f of kb.files) {
    if (f.type !== 'markdown' || !f.date) continue;
    const days = Math.floor((now - f.date) / 86_400_000);
    if (days < limit) continue;
    findings.push({
      type: 'old_page',
      severity: 'info',
      title: f.file,
      summary: `Not updated for ${days} days.`,
      items: [{ role: 'old', file: f.file, line: 1, raw: '', sentence: '', date: f.date, type: 'markdown' }],
      hint: 'Check that this page is still correct.',
    });
  }
}

const ORDER = { error: 0, warning: 1, info: 2 };

/**
 * Run every check.
 * @param {object} kb from buildKnowledge
 * @param {{ changed?: Set<string>, now?: Date }} opts `changed`: only keep findings that touch these files (posix, relative)
 */
export function analyze(kb, { changed, now = new Date() } = {}) {
  const findings = [];
  checkFacts(kb, findings);
  checkEndpoints(kb, findings);
  if (!changed) checkAge(kb, findings, now);
  const kept = changed ? findings.filter((f) => f.items.some((i) => changed.has(i.file))) : findings;
  kept.sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || a.title.localeCompare(b.title));
  kept.forEach((f, i) => (f.id = i + 1));

  const count = (t) => kept.filter((f) => t.includes(f.type)).length;
  return {
    name: kb.config.name,
    findings: kept,
    summary: {
      pages: kb.files.filter((f) => f.type === 'markdown').length,
      specs: kb.files.filter((f) => f.type === 'openapi').length,
      changelogs: kb.files.filter((f) => f.type === 'changelog').length,
      facts: kb.facts.length,
      endpoints: kb.endpoints.length,
      outdated: count(['stale', 'removed_endpoint']),
      conflicts: count(['conflict']),
      endpointWarnings: count(['deprecated_endpoint', 'unknown_endpoint']),
      oldPages: count(['old_page']),
      errors: kept.filter((f) => f.severity === 'error').length,
      warnings: kept.filter((f) => f.severity === 'warning').length,
      infos: kept.filter((f) => f.severity === 'info').length,
      prMode: !!changed,
    },
  };
}
