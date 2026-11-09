import { analyze } from '../check/analyze.js';
import { buildKnowledge } from '../knowledge.js';
import { isoDate, timeAgo } from '../util.js';
import { SearchIndex } from './search.js';

const MAX_SOURCE_CHARS = 1800;

function isLocal(url) {
  try {
    const h = new URL(url).hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.localhost');
  } catch {
    return false;
  }
}

export function llmStatus(config) {
  const a = config.assistant;
  const baseUrl = process.env.TRUTHLAYER_BASE_URL || a.base_url;
  const model = process.env.TRUTHLAYER_MODEL || a.model;
  const key =
    process.env[a.api_key_env] || (a.fallback_key_env && process.env[a.fallback_key_env]) || process.env.TRUTHLAYER_API_KEY || '';
  const local = isLocal(baseUrl);
  return {
    enabled: !!key || local,
    key,
    local,
    model,
    baseUrl,
    provider: a.provider,
    keyEnv: a.api_key_env,
    maxTokens: a.max_tokens,
    reasoningEffort: a.reasoning_effort,
  };
}

async function chatCompletion({ baseUrl, key, model, messages, maxTokens, reasoningEffort }) {
  const body = { model, messages, temperature: 0.2, max_tokens: maxTokens ?? 2048 };
  if (reasoningEffort) body.reasoning_effort = reasoningEffort;
  const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const text = (await res.text()).slice(0, 300);
    if (res.status === 429) throw new Error('The AI provider rate limit was reached (free tiers allow only a few requests per minute). Wait a minute and try again.');
    if (res.status === 401 || res.status === 403 || /api key not valid|invalid api key|API_KEY_INVALID/i.test(text)) {
      throw new Error('The API key was rejected. Check the key in your .env file.');
    }
    if (res.status === 404) throw new Error(`The model "${model}" was not found. Check assistant.model in truthlayer.yml.`);
    throw new Error(`The AI provider returned ${res.status}: ${text}`);
  }
  const data = await res.json();
  return String(data.choices?.[0]?.message?.content ?? '').trim();
}

function systemPrompt(name) {
  return [
    `You are ${name}, a helpful assistant for a software product.`,
    'Answer ONLY with information from the numbered sources below. Do not use outside knowledge.',
    'Cite every claim with the source number in square brackets, like [1] or [2][3].',
    'If the sources do not contain the answer, say "I could not find this in the docs." and suggest which page might help.',
    'If sources disagree, say so clearly, and prefer sources marked "source of truth", then the newest source.',
    'Keep answers short and clear. Use simple English. Use bullet points for steps.',
  ].join('\n');
}

/**
 * The assistant reloads the docs when they change (at most every 3 seconds),
 * so editing a page and asking again shows the new answer.
 */
export function createAssistant(config) {
  let cache = null;
  let loadedAt = 0;

  const load = () => {
    if (cache && Date.now() - loadedAt < 3000) return cache;
    const kb = buildKnowledge(config);
    const report = analyze(kb);
    const index = new SearchIndex(kb.sections.filter((s) => s.text || s.heading));
    cache = { kb, report, index };
    loadedAt = Date.now();
    return cache;
  };

  const warningsFor = (report, sources) => {
    const out = [];
    for (const f of report.findings) {
      if (f.severity === 'info') continue;
      const hit = f.items.find((i) => i.role !== 'truth' && sources.some((s) => s.file === i.file && i.line >= s.line && i.line <= (s.endLine ?? s.line)));
      if (!hit) continue;
      const truth = f.items.find((i) => i.role === 'truth');
      out.push({
        findingId: f.id,
        type: f.type,
        text: truth
          ? `${hit.file} may be outdated: it says "${hit.raw}", but ${truth.file} says "${truth.raw}".`
          : `${f.title}: ${f.summary}`,
      });
    }
    return out;
  };

  return {
    info() {
      const { kb, report } = load();
      return {
        name: config.name,
        llm: llmStatus(config).enabled,
        model: llmStatus(config).model,
        suggestions: config.assistant.suggestions ?? [],
        pages: kb.files.length,
        summary: report.summary,
      };
    },

    report() {
      return load().report;
    },

    async ask(question) {
      const { report, index } = load();
      const hits = index.search(question, config.assistant.top_k ?? 5);
      const sources = hits.map((h, i) => ({
        n: i + 1,
        file: h.doc.file,
        line: h.doc.line,
        endLine: h.doc.endLine,
        heading: h.doc.heading || h.doc.file,
        type: h.doc.type,
        truth: !!h.doc.truth,
        date: h.doc.date ? isoDate(h.doc.date) : null,
        age: timeAgo(h.doc.date),
        snippet: h.doc.text.slice(0, 280),
        text: h.doc.text,
      }));
      const warnings = warningsFor(report, sources);
      const publicSources = sources.map(({ text, endLine, ...s }) => s);

      if (!sources.length) {
        return { mode: 'none', answer: 'I could not find anything about this in the docs.', sources: [], warnings: [] };
      }

      const status = llmStatus(config);
      if (!status.enabled) {
        return {
          mode: 'search',
          answer: `No AI key is set, so here are the most relevant parts of the docs. Add ${status.keyEnv} to a .env file to get written answers.`,
          sources: publicSources,
          warnings,
        };
      }

      const context = sources
        .map((s) => {
          const tag = s.truth ? ', source of truth' : '';
          return `[${s.n}] ${s.file}:${s.line} — ${s.heading} (last updated ${s.date ?? 'unknown'}${tag})\n${s.text.slice(0, MAX_SOURCE_CHARS)}`;
        })
        .join('\n\n');
      const known = warnings.length ? `\n\nKnown problems in these sources:\n${warnings.map((w) => `- ${w.text}`).join('\n')}` : '';

      try {
        const answer = await chatCompletion({
          baseUrl: status.baseUrl,
          key: status.key,
          model: status.model,
          maxTokens: status.maxTokens,
          reasoningEffort: status.reasoningEffort,
          messages: [
            { role: 'system', content: systemPrompt(config.name) },
            { role: 'user', content: `Sources:\n\n${context}${known}\n\nQuestion: ${question}` },
          ],
        });
        return { mode: 'llm', answer: answer || 'The AI returned an empty answer. Please try again.', sources: publicSources, warnings };
      } catch (e) {
        return { mode: 'error', answer: `${e.message} Showing the most relevant parts of the docs instead.`, sources: publicSources, warnings };
      }
    },
  };
}
