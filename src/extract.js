// Pattern-based fact extraction.
//
// TruthLayer only extracts facts that are easy to check: numbers with a clear meaning
// (rate limits, prices, plan limits, sizes, timeouts, versions) and API endpoints.
// Open-ended "does sentence A contradict sentence B" checks create too many false alarms,
// so they are left out on purpose.

const NUM = String.raw`\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?`;

export function parseNum(s) {
  if (s == null) return null;
  const t = String(s).replace(/[$,\s]/g, '');
  if (/^unlimited$/i.test(t)) return Infinity;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const TIME_UNITS = {
  s: 'second', sec: 'second', secs: 'second', second: 'second', seconds: 'second',
  m: 'minute', min: 'minute', mins: 'minute', minute: 'minute', minutes: 'minute',
  h: 'hour', hr: 'hour', hrs: 'hour', hour: 'hour', hours: 'hour',
  d: 'day', day: 'day', days: 'day',
};
const TIME_UNIT_SRC = 'seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|s|m|h|d';
const SECONDS = { ms: 0.001, millisecond: 0.001, milliseconds: 0.001, s: 1, sec: 1, secs: 1, second: 1, seconds: 1, m: 60, min: 60, mins: 60, minute: 60, minutes: 60 };
const MB = { kb: 1 / 1024, mb: 1, gb: 1024, tb: 1024 * 1024 };
const DAYS = { day: 1, days: 1, month: 30, months: 30, year: 365, years: 365 };

// ---------- plans ----------

const PLAN_WORDS = 'free|hobby|starter|basic|pro|professional|team|teams|business|enterprise|growth|scale|premium|plus|developer|startup';
const PLAN_AFTER = new RegExp(String.raw`\b(${PLAN_WORDS})\s+(?:plan|tier|edition)s?\b`, 'i');
const PLAN_BEFORE = new RegExp(String.raw`\b(?:plan|tier)\s*[:=]\s*(${PLAN_WORDS})\b`, 'i');
const PLAN_ALONE = new RegExp(String.raw`^\s*\**(${PLAN_WORDS})\**(?:\s+(?:plan|tier))?\s*$`, 'i');

function normPlan(p) {
  const x = p.toLowerCase();
  if (x === 'professional') return 'pro';
  if (x === 'teams') return 'team';
  return x;
}

export function planFromCell(cell) {
  const m = String(cell ?? '').match(PLAN_ALONE);
  return m ? normPlan(m[1]) : null;
}

export function detectPlan(sentence, heading) {
  const m = sentence.match(PLAN_AFTER) || sentence.match(PLAN_BEFORE);
  if (m) return normPlan(m[1]);
  if (heading) {
    const h = heading.match(PLAN_AFTER) || heading.match(PLAN_ALONE);
    if (h) return normPlan(h[1]);
  }
  return null;
}

// ---------- endpoints ----------

const ENDPOINT_RE = /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+`?((?:https?:\/\/[^\s/`]+)?\/[A-Za-z0-9_\-/{}.:~]*)`?/g;

export function normalizePath(p, basePaths = []) {
  let x = String(p)
    .replace(/^https?:\/\/[^/]+/i, '')
    .split('?')[0]
    .replace(/[.,;:)]+$/, '');
  x = x.replace(/\{[^}]*\}/g, '{}').replace(/\/:[A-Za-z_][A-Za-z0-9_]*/g, '/{}');
  if (x.length > 1) x = x.replace(/\/+$/, '');
  for (const base of basePaths) {
    if (base && base !== '/' && (x === base || x.startsWith(base + '/'))) {
      x = x.slice(base.length) || '/';
      break;
    }
  }
  return x.toLowerCase();
}

export function findEndpoints(text) {
  const out = [];
  for (const m of text.matchAll(ENDPOINT_RE)) {
    const path = m[2].replace(/[.,;:)]+$/, '');
    if (path.length < 2) continue;
    out.push({ method: m[1].toUpperCase(), path, raw: `${m[1].toUpperCase()} ${path}` });
  }
  return out;
}

// ---------- extractors ----------

const RATE_RE = new RegExp(
  String.raw`(${NUM})\s*(?:api\s+)?(?:requests?|calls?|reqs?)\s*(?:\/\s*|(?:per|an?|every|each)\s+)(${TIME_UNIT_SRC})\b`,
  'gi',
);
const RATE2_RE = new RegExp(
  String.raw`(?:rate[- ]?limit(?:ed|s)?|throttled?)\b[^.]*?\b(${NUM})\s*(?:\/\s*|per\s+)(${TIME_UNIT_SRC})\b`,
  'i',
);
const PRICE_RE = new RegExp(
  String.raw`\$\s?(${NUM})\s*(?:usd\s*)?(?:\/\s*|(?:per|an?|each)\s+)(?:(user|seat|member)\s*(?:\/\s*|per\s+))?(month|mo|year|yr|annum)\b`,
  'gi',
);
const NOUNS =
  'api keys?|team members?|members?|seats?|users?|projects?|workspaces?|webhooks?|integrations?|environments?|custom domains?|domains?|collaborators?|applications?|apps?|sites?|databases?|builds?|deployments?|agents?|bots?|messages?|credits?|documents?|files?|tokens?|pages?';
const QTY_RE = new RegExp(
  String.raw`(?<![\w$.,])(unlimited|${NUM})\s+((?:active|private|public|concurrent|monthly|custom)\s+)?(${NOUNS})\b(?:\s+per\s+(account|workspace|organi[sz]ation|org|team|project|user|month|day))?`,
  'gi',
);
const LIMIT_CTX = /\b(up to|max(?:imum)?|limit(?:s|ed)?|includes?|included|allows?|allowed|can (?:create|have|add|invite|use)|per (?:account|workspace|organi[sz]ation|org|team|project)|plans?|tiers?|quota|cap(?:ped)?)\b/i;
const STORAGE_RE = new RegExp(String.raw`(${NUM})\s*(KB|MB|GB|TB)\b(?:\s+of)?\s+(storage|space|disk|bandwidth|transfer)`, 'gi');
const STORAGE2_RE = new RegExp(String.raw`\b(storage|bandwidth)\b[^.]{0,30}?\b(${NUM})\s*(KB|MB|GB|TB)\b`, 'i');
const SIZE_RE = new RegExp(
  String.raw`\b(file|upload|attachment|request|payload|request body|body|image)\s+size\s+(?:limit\s+)?(?:is\s+|of\s+)?(?:up to\s+|at most\s+)?(${NUM})\s*(KB|MB|GB)\b`,
  'gi',
);
const SIZE2_RE = new RegExp(
  String.raw`\b(files?|uploads?|attachments?|images?|payloads?)\s+(?:can be|are limited to|must be (?:under|smaller than|less than)|up to)\s+(?:up to\s+)?(${NUM})\s*(KB|MB|GB)\b`,
  'gi',
);
const PAGE_RE = new RegExp(
  String.raw`(${NUM})\s+(?:items|results|records|objects|entries|rows)\s+per\s+(?:page|request|response)`,
  'gi',
);
const PAGE2_RE = new RegExp(
  String.raw`(?:page[_ ]?size|per_page|\blimit\b\`?\s*(?:parameter|param))[^.]*?\b(?:max(?:imum)?(?:\s+of|\s+is)?|up to|at most|cannot exceed)\s+(${NUM})`,
  'i',
);
const RETENTION_RE = new RegExp(
  String.raw`\b(?:retain(?:ed|s)?|kept|stored|retention(?:\s+period)?(?:\s+(?:of|is))?|history(?:\s+(?:of|for))?)\s+(?:for\s+)?(?:up to\s+)?(${NUM})\s*(days?|months?|years?)\b`,
  'gi',
);
const TIMEOUT_RE = new RegExp(
  String.raw`\b(?:times?\s?out|timeout)s?\s+(?:(?:is|of|after|at|limit(?:\s+is)?)\s+)?(?:after\s+)?(${NUM})\s*(ms|milliseconds?|seconds?|secs?|s|minutes?|mins?|m)\b`,
  'gi',
);
const RUNTIMES = String.raw`node(?:\.js|js)?|python|java|golang|go(?=\s+v?1\.\d)|ruby|php|\.net|dotnet|rust|deno|bun|postgres(?:ql)?|mysql|redis|docker|kubernetes|ios|android|typescript|next\.js|nextjs`;
const MINVER_RE = new RegExp(
  String.raw`\b(${RUNTIMES})\s+(?:version\s+)?v?(\d+(?:\.\d+){0,2})(\+|\s+or\s+(?:later|higher|newer|above|greater))?`,
  'gi',
);
const MINVER_CTX = /\b(requires?|required|minimum|at least|needs?|need)\b/i;
const PRODVER_RE = /\b(?:latest|current|newest)\s+(?:stable\s+)?(?:version|release)\s*(?:is|:|=)?\s*v?(\d+\.\d+(?:\.\d+)?)/i;

const RUNTIME_NAMES = { 'node.js': 'node', nodejs: 'node', postgresql: 'postgres', golang: 'go', dotnet: '.net', nextjs: 'next.js' };

function singular(noun) {
  let n = noun.toLowerCase().replace(/\s+/g, ' ').trim();
  n = n.replace(/(?<!s)s$/, '');
  if (n === 'team member') return 'member';
  if (n === 'application') return 'app';
  return n;
}

/**
 * Extract checkable facts from one sentence.
 * Returns [{ kind, subject, value, raw }] — `subject` + plan + scope decide which facts get compared.
 */
export function extractFacts(sentence, { isTable = false } = {}) {
  const facts = [];
  const eps = findEndpoints(sentence);
  const epKey = eps.length === 1 ? ` ${eps[0].method} ${normalizePath(eps[0].path)}` : '';
  const add = (kind, subject, value, raw) => {
    if (value == null) return;
    facts.push({ kind, subject, value, raw: raw.trim() });
  };

  let rate = false;
  for (const m of sentence.matchAll(RATE_RE)) {
    rate = true;
    add('rate_limit', `per ${TIME_UNITS[m[2].toLowerCase()]}${epKey}`, parseNum(m[1]), m[0]);
  }
  if (!rate) {
    const m = sentence.match(RATE2_RE);
    if (m) add('rate_limit', `per ${TIME_UNITS[m[2].toLowerCase()]}${epKey}`, parseNum(m[1]), m[0]);
  }

  for (const m of sentence.matchAll(PRICE_RE)) {
    const unit = { mo: 'month', yr: 'year', annum: 'year' }[m[3].toLowerCase()] ?? m[3].toLowerCase();
    add('price', `${m[2] ? `per ${m[2].toLowerCase()} ` : ''}per ${unit}`, parseNum(m[1]), m[0]);
  }

  if (isTable || LIMIT_CTX.test(sentence)) {
    for (const m of sentence.matchAll(QTY_RE)) {
      const adj = m[2] ? m[2].trim().toLowerCase() + ' ' : '';
      const per = m[4] ? ` per ${m[4].toLowerCase()}` : '';
      add('quantity', `${adj}${singular(m[3])}${per}`, parseNum(m[1]), m[0]);
    }
  }

  let storage = false;
  for (const m of sentence.matchAll(STORAGE_RE)) {
    storage = true;
    add('storage', m[3].toLowerCase() === 'bandwidth' || m[3].toLowerCase() === 'transfer' ? 'bandwidth' : 'storage', parseNum(m[1]) * MB[m[2].toLowerCase()], m[0]);
  }
  if (!storage) {
    const m = sentence.match(STORAGE2_RE);
    if (m) add('storage', m[1].toLowerCase(), parseNum(m[2]) * MB[m[3].toLowerCase()], m[0]);
  }

  let size = false;
  for (const m of sentence.matchAll(SIZE_RE)) {
    size = true;
    add('size_limit', `${m[1].toLowerCase()} size`, parseNum(m[2]) * MB[m[3].toLowerCase()], m[0]);
  }
  if (!size) {
    for (const m of sentence.matchAll(SIZE2_RE)) {
      add('size_limit', `${singular(m[1])} size`, parseNum(m[2]) * MB[m[3].toLowerCase()], m[0]);
    }
  }

  let page = false;
  for (const m of sentence.matchAll(PAGE_RE)) {
    page = true;
    add('pagination', 'items per page', parseNum(m[1]), m[0]);
  }
  if (!page) {
    const m = sentence.match(PAGE2_RE);
    if (m) add('pagination', 'items per page', parseNum(m[1]), m[0]);
  }

  for (const m of sentence.matchAll(RETENTION_RE)) {
    add('retention', 'data retention', parseNum(m[1]) * DAYS[m[2].toLowerCase()], m[0]);
  }

  for (const m of sentence.matchAll(TIMEOUT_RE)) {
    add('timeout', `timeout${epKey}`, parseNum(m[1]) * SECONDS[m[2].toLowerCase()], m[0]);
  }

  if (MINVER_CTX.test(sentence) || /\+|or (?:later|higher|newer|above|greater)/i.test(sentence)) {
    for (const m of sentence.matchAll(MINVER_RE)) {
      if (!m[3] && !MINVER_CTX.test(sentence)) continue;
      const name = m[1].toLowerCase();
      add('min_version', `minimum ${RUNTIME_NAMES[name] ?? name} version`, m[2], m[0]);
    }
  }

  const pv = sentence.match(PRODVER_RE);
  if (pv) add('product_version', 'latest version', pv[1], pv[0]);

  return facts;
}

// ---------- changelog helpers ----------

const FROM_TO_RE = new RegExp(
  String.raw`\bfrom\s+(\$?\s?(?:${NUM}))\s*(?:[A-Za-z/]+(?:\s+[A-Za-z/]+)?\s+)?to\s+(\$?\s?(?:${NUM}))`,
  'i',
);
const PREVIOUSLY_RE = new RegExp(String.raw`\(?\s*(?:previously|formerly|was)\s+(\$?\s?(?:${NUM}))\s*\)?`, 'i');

/** "Increased the limit from 100 to 200 requests" -> { text: "Increased the limit 200 requests", oldValue: 100 } */
export function rewriteChange(sentence) {
  let m = sentence.match(FROM_TO_RE);
  if (m) return { text: sentence.replace(m[0], m[2]), oldValue: parseNum(m[1]) };
  m = sentence.match(PREVIOUSLY_RE);
  if (m) return { text: sentence.replace(m[0], ' '), oldValue: parseNum(m[1]) };
  return { text: sentence, oldValue: null };
}

/** Endpoints a changelog sentence marks as removed or deprecated. */
export function endpointEvents(sentence) {
  let status = null;
  if (/\b(removed|deleted|dropped|sunset|no longer available)\b/i.test(sentence)) status = 'removed';
  else if (/\bdeprecat/i.test(sentence)) status = 'deprecated';
  if (!status) return [];
  // Ignore the replacement endpoint in "Deprecated X, use Y instead".
  const head = sentence.split(/\b(?:in favou?r of|use|replaced (?:by|with)|instead|migrate to|switch to)\b/i)[0];
  return findEndpoints(head).map((e) => ({ ...e, status }));
}

// ---------- values ----------

export function versionEq(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return false;
  return true;
}

export function compareVersions(a, b) {
  const pa = String(a).split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  const pb = String(b).split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

export function sameValue(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a === b || Math.abs(a - b) < 1e-9;
  if (typeof a === 'string' && typeof b === 'string') return versionEq(a, b);
  return a === b;
}

export function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z`$(])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function cleanInline(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*|__/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}
