import YAML from 'yaml';
import { normalizePath, splitSentences } from '../extract.js';

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
const PAGE_PARAMS = new Set(['limit', 'per_page', 'perpage', 'page_size', 'pagesize', 'size', 'count', 'max_results']);
const RATE_KEYS = ['x-rate-limit', 'x-ratelimit', 'x-rate-limits', 'x-ratelimit-limit'];
const PERIODS = { s: 'second', sec: 'second', second: 'second', m: 'minute', min: 'minute', minute: 'minute', h: 'hour', hr: 'hour', hour: 'hour', d: 'day', day: 'day' };

function readPeriod(period) {
  const m = String(period ?? 'minute').trim().toLowerCase().match(/^(\d+)?\s*([a-z]+?)s?$/);
  if (!m) return null;
  const n = Number(m[1] ?? 1);
  const unit = PERIODS[m[2]];
  if (!unit) return null;
  if (n === 1) return unit;
  if (n === 60 && unit === 'second') return 'minute';
  if (n === 60 && unit === 'minute') return 'hour';
  if (n === 24 && unit === 'hour') return 'day';
  return null;
}

function readRate(obj) {
  for (const key of RATE_KEYS) {
    const v = obj?.[key];
    if (v == null) continue;
    if (typeof v === 'object') {
      const limit = Number(v.limit ?? v.requests ?? v.max ?? v.value);
      const unit = readPeriod(v.period ?? v.window ?? v.per ?? v.interval ?? v.unit);
      if (Number.isFinite(limit) && unit) return { key, limit, unit };
    }
  }
  return null;
}

function resolveRef(spec, node) {
  if (!node?.$ref || !node.$ref.startsWith('#/')) return node;
  return node.$ref
    .slice(2)
    .split('/')
    .reduce((o, k) => o?.[k.replace(/~1/g, '/').replace(/~0/g, '~')], spec);
}

/**
 * Parse an OpenAPI (3.x) or Swagger (2.0) file.
 * The spec is treated as a source of truth: its endpoints, rate limits and
 * pagination maximums are compared against the docs.
 */
export function parseOpenApi(text, relFile) {
  let spec;
  try {
    spec = relFile.toLowerCase().endsWith('.json') ? JSON.parse(text) : YAML.parse(text);
  } catch (e) {
    throw new Error(`Could not parse OpenAPI file ${relFile}: ${e.message}`);
  }
  if (!spec || typeof spec !== 'object') throw new Error(`${relFile} is empty or not an OpenAPI file.`);

  const lines = text.split(/\r?\n/);
  const lineOf = (needle, from = 0) => {
    if (!needle) return 1;
    for (let i = from; i < lines.length; i++) if (lines[i].includes(needle)) return i + 1;
    return 1;
  };

  const basePaths = new Set();
  for (const s of spec.servers ?? []) {
    try {
      const p = new URL(String(s.url).replace(/\{[^}]*\}/g, 'x'), 'http://x').pathname.replace(/\/+$/, '');
      if (p) basePaths.add(p.toLowerCase());
    } catch {
      /* ignore bad server urls */
    }
  }
  if (spec.basePath) basePaths.add(String(spec.basePath).replace(/\/+$/, '').toLowerCase());
  const bases = [...basePaths].filter(Boolean);

  const endpoints = [];
  const sentences = [];
  const facts = [];
  const sections = [];

  if (spec.info?.description) {
    const ln = lineOf('description');
    for (const s of splitSentences(String(spec.info.description).replace(/\s*\n\s*/g, ' '))) {
      sentences.push({ text: s, line: ln, heading: 'API overview', plan: null, isTable: false });
    }
    sections.push({ heading: spec.info.title ?? 'API overview', path: [], line: ln, endLine: ln, text: String(spec.info.description) });
  }

  const rootRate = readRate(spec);
  if (rootRate) {
    facts.push({
      kind: 'rate_limit',
      subject: `per ${rootRate.unit}`,
      value: rootRate.limit,
      raw: `${rootRate.key}: ${rootRate.limit} per ${rootRate.unit}`,
      line: lineOf(rootRate.key),
    });
  }

  const pageMax = new Map();
  for (const [p, rawItem] of Object.entries(spec.paths ?? {})) {
    const item = resolveRef(spec, rawItem) ?? {};
    const pathLine = lineOf(p);
    for (const method of METHODS) {
      const op = item[method];
      if (!op) continue;
      const M = method.toUpperCase();
      const opLine = lineOf(`${method}:`, pathLine - 1);
      const key = normalizePath(p, bases);
      endpoints.push({ method: M, path: p, key, deprecated: !!op.deprecated, line: opLine, summary: op.summary ?? '' });

      const words = [op.summary, op.description].filter(Boolean).join('. ');
      for (const s of splitSentences(words.replace(/\s*\n\s*/g, ' '))) {
        sentences.push({ text: `${M} ${p}: ${s}`, line: opLine, heading: `${M} ${p}`, plan: null, isTable: false });
      }

      const opRate = readRate(op);
      if (opRate) {
        facts.push({
          kind: 'rate_limit',
          subject: `per ${opRate.unit} ${M} ${key}`,
          value: opRate.limit,
          raw: `${M} ${p} ${opRate.key}: ${opRate.limit} per ${opRate.unit}`,
          line: lineOf(opRate.key, opLine - 1),
        });
      }

      const params = [...(item.parameters ?? []), ...(op.parameters ?? [])].map((x) => resolveRef(spec, x)).filter(Boolean);
      for (const prm of params) {
        const max = prm.schema?.maximum ?? prm.maximum;
        if (prm.in === 'query' && PAGE_PARAMS.has(String(prm.name).toLowerCase()) && Number.isFinite(Number(max))) {
          if (!pageMax.has(Number(max))) pageMax.set(Number(max), { name: prm.name, line: lineOf('maximum') });
        }
      }

      sections.push({
        heading: `${M} ${p}`,
        path: [],
        line: opLine,
        endLine: opLine,
        text: [`${M} ${p}`, op.summary, op.description, op.deprecated ? 'This endpoint is deprecated.' : '', params.length ? `Parameters: ${params.map((x) => x.name).join(', ')}` : '']
          .filter(Boolean)
          .join('\n'),
      });
    }
  }

  // Only trust the pagination maximum when every endpoint agrees on it.
  if (pageMax.size === 1) {
    const [[value, info]] = [...pageMax];
    facts.push({ kind: 'pagination', subject: 'items per page', value, raw: `${info.name} maximum: ${value}`, line: info.line });
  }

  return { endpoints, sentences, facts, sections, basePaths: bases };
}
