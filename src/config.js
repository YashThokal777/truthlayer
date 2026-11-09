import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export const CONFIG_NAMES = ['truthlayer.yml', 'truthlayer.yaml', '.truthlayer.yml'];

export const SOURCE_TYPES = {
  markdown: { truth: false },
  openapi: { truth: true },
  changelog: { truth: true },
};

export const DEFAULTS = {
  name: 'Product Assistant',
  sources: [],
  check: {
    stale_after_days: 180,
    // never | error | warning — "never" means the check only reports and never fails CI.
    fail_on: 'never',
    ignore_paths: [],
  },
  assistant: {
    provider: 'gemini',
    top_k: 5,
    max_tokens: 2048,
    suggestions: [],
  },
};

/**
 * Ready-made settings for AI providers with a free tier. Every provider uses the
 * OpenAI-compatible "chat/completions" API, so "custom" works with any such service.
 * Values set in truthlayer.yml (base_url, model, ...) override the preset.
 */
export const PROVIDERS = {
  gemini: {
    base_url: 'https://generativelanguage.googleapis.com/v1beta/openai',
    // Tested on the free tier on 2026-11-09: 3.5 Flash answers in ~2 s, while newer
    // models (3.8 Flash, "flash-latest") hung for more than 45 s.
    model: 'gemini-3.5-flash',
    fallback_models: ['gemini-3.1-flash-lite'],
    api_key_env: 'GEMINI_API_KEY',
    fallback_key_env: 'GOOGLE_API_KEY',
    reasoning_effort: 'low',
  },
  groq: {
    base_url: 'https://api.groq.com/openai/v1',
    model: 'openai/gpt-oss-20b',
    api_key_env: 'GROQ_API_KEY',
  },
  ollama: {
    base_url: 'http://localhost:11434/v1',
    model: 'llama3.2',
    api_key_env: 'OLLAMA_API_KEY',
  },
  custom: {
    api_key_env: 'TRUTHLAYER_API_KEY',
  },
};

function resolveAssistant(raw = {}) {
  const provider = String(raw.provider ?? (raw.base_url ? 'custom' : DEFAULTS.assistant.provider)).toLowerCase();
  if (!PROVIDERS[provider]) {
    throw new ConfigError(`assistant.provider "${raw.provider}" is not supported. Use one of: ${Object.keys(PROVIDERS).join(', ')}.`);
  }
  const a = { ...DEFAULTS.assistant, ...PROVIDERS[provider], ...raw, provider };
  if (!a.base_url) throw new ConfigError('assistant.provider "custom" needs an assistant.base_url.');
  if (!a.model) throw new ConfigError('assistant.model is missing.');
  return a;
}

export class ConfigError extends Error {}

export function findConfig(cwd) {
  for (const name of CONFIG_NAMES) {
    const p = path.join(cwd, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function loadConfig({ cwd = process.cwd(), configPath } = {}) {
  const file = configPath ? path.resolve(cwd, configPath) : findConfig(cwd);
  if (!file || !fs.existsSync(file)) {
    throw new ConfigError(
      `No truthlayer.yml found in ${cwd}.\nRun "truthlayer init" to create one.`,
    );
  }
  let raw;
  try {
    raw = YAML.parse(fs.readFileSync(file, 'utf8')) ?? {};
  } catch (e) {
    throw new ConfigError(`Could not read ${file}: ${e.message}`);
  }
  const root = path.dirname(file);
  const config = {
    file,
    root,
    name: raw.name ?? DEFAULTS.name,
    check: { ...DEFAULTS.check, ...(raw.check ?? {}) },
    assistant: resolveAssistant(raw.assistant ?? {}),
    sources: [],
  };
  if (!Array.isArray(raw.sources) || raw.sources.length === 0) {
    throw new ConfigError(`${path.basename(file)} has no "sources". Add at least one source.`);
  }
  raw.sources.forEach((s, i) => {
    if (!s || typeof s !== 'object') throw new ConfigError(`sources[${i}] must be an object.`);
    const type = String(s.type ?? '').toLowerCase();
    if (!SOURCE_TYPES[type]) {
      throw new ConfigError(
        `sources[${i}].type "${s.type}" is not supported. Use one of: ${Object.keys(SOURCE_TYPES).join(', ')}.`,
      );
    }
    if (!s.path) throw new ConfigError(`sources[${i}] (${type}) needs a "path".`);
    config.sources.push({
      type,
      path: path.resolve(root, s.path),
      truth: s.truth ?? SOURCE_TYPES[type].truth,
    });
  });
  if (!['never', 'error', 'warning'].includes(config.check.fail_on)) {
    throw new ConfigError(`check.fail_on must be "never", "error" or "warning".`);
  }
  return config;
}
