import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { ConfigError, loadConfig } from '../src/config.js';

function withConfig(yml, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'truthlayer-'));
  fs.writeFileSync(path.join(dir, 'truthlayer.yml'), `sources:\n  - type: markdown\n    path: ./docs\n${yml}`);
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('Gemini is the default provider', () => {
  withConfig('', (dir) => {
    const a = loadConfig({ cwd: dir }).assistant;
    assert.equal(a.provider, 'gemini');
    assert.equal(a.base_url, 'https://generativelanguage.googleapis.com/v1beta/openai');
    assert.equal(a.api_key_env, 'GEMINI_API_KEY');
  });
});

test('provider presets can be overridden', () => {
  withConfig('assistant:\n  provider: groq\n  model: my-model\n', (dir) => {
    const a = loadConfig({ cwd: dir }).assistant;
    assert.equal(a.base_url, 'https://api.groq.com/openai/v1');
    assert.equal(a.model, 'my-model');
  });
});

test('a base_url without a provider means custom', () => {
  withConfig('assistant:\n  base_url: http://localhost:1234/v1\n  model: local\n', (dir) => {
    assert.equal(loadConfig({ cwd: dir }).assistant.provider, 'custom');
  });
});

test('unknown providers give a clear error', () => {
  withConfig('assistant:\n  provider: nope\n', (dir) => {
    assert.throws(() => loadConfig({ cwd: dir }), ConfigError);
  });
});
