import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { analyze } from '../src/check/analyze.js';
import { loadConfig } from '../src/config.js';
import { buildKnowledge } from '../src/knowledge.js';
import { toMarkdown } from '../src/report/format.js';

const example = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'examples', 'acme-docs');

function run(dir = example) {
  return analyze(buildKnowledge(loadConfig({ cwd: dir })));
}

test('the example finds every planted problem and nothing else', () => {
  const r = run();
  const found = r.findings.map((f) => `${f.type}: ${f.title}`).sort();
  assert.deepEqual(found, [
    'conflict: Minimum node version',
    'deprecated_endpoint: POST /v1/exports',
    'removed_endpoint: GET /v1/reports',
    'stale: API rate limit (per minute)',
    'stale: Maximum items per page',
    'stale: Project limit — Free plan',
  ]);
  assert.equal(r.summary.errors, 4);
  assert.equal(r.summary.warnings, 2);
});

test('stale findings point at the outdated line and explain the change', () => {
  const rate = run().findings.find((f) => f.title === 'API rate limit (per minute)');
  const outdated = rate.items.filter((i) => i.role === 'outdated');
  assert.deepEqual(outdated.map((i) => `${i.file}:${i.line}`), ['docs/api/rate-limits.md:3']);
  assert.match(rate.hint, /from 100 to 200/);
});

test('PR mode keeps only findings that touch changed files', () => {
  const kb = buildKnowledge(loadConfig({ cwd: example }));
  const r = analyze(kb, { changed: new Set(['docs/faq.md']) });
  assert.deepEqual(r.findings.map((f) => f.title), ['Minimum node version']);
});

test('markdown report has the PR marker, and a clean marker when all is fine', () => {
  const md = toMarkdown(run());
  assert.ok(md.startsWith('<!-- truthlayer-report -->'));
  assert.ok(!md.includes('truthlayer-clean'));

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'truthlayer-'));
  fs.mkdirSync(path.join(dir, 'docs'));
  fs.writeFileSync(path.join(dir, 'docs', 'a.md'), '# A\nEach key can make 100 requests per minute.\n');
  fs.writeFileSync(path.join(dir, 'docs', 'b.md'), '# B\nThe limit is 100 requests per minute.\n');
  fs.writeFileSync(path.join(dir, 'truthlayer.yml'), 'sources:\n  - type: markdown\n    path: ./docs\n');
  const clean = run(dir);
  assert.equal(clean.findings.length, 0);
  assert.ok(toMarkdown(clean).includes('<!-- truthlayer-clean -->'));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('versioned docs folders are not compared with current facts', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'truthlayer-'));
  fs.mkdirSync(path.join(dir, 'docs', 'v1'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'docs', 'limits.md'), '# Limits\nEach key can make 200 requests per minute.\n');
  fs.writeFileSync(path.join(dir, 'docs', 'v1', 'limits.md'), '# Limits (v1)\nEach key can make 100 requests per minute.\n');
  fs.writeFileSync(path.join(dir, 'truthlayer.yml'), 'sources:\n  - type: markdown\n    path: ./docs\n');
  assert.equal(run(dir).findings.length, 0);
  fs.rmSync(dir, { recursive: true, force: true });
});

function tempProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'truthlayer-'));
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), text);
  }
  return dir;
}

test('different values in one file are not a conflict, but across files they are a warning', () => {
  const dir = tempProject({
    'truthlayer.yml': 'sources:\n  - type: markdown\n    path: ./docs\n',
    'docs/a.md': '# A\nSmall servers need at least 100 GB of disk.\n\nLarge servers need at least 500 GB of disk.\n',
  });
  assert.equal(run(dir).findings.length, 0);
  fs.writeFileSync(path.join(dir, 'docs', 'b.md'), '# B\nRequires Node.js 18 or later.\n');
  fs.writeFileSync(path.join(dir, 'docs', 'c.md'), '# C\nRequires Node.js 20 or later.\n');
  const r = run(dir);
  assert.deepEqual(r.findings.map((f) => `${f.type} ${f.severity}`), ['conflict warning']);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('unknown endpoints are only reported for paths that look like this API', () => {
  const dir = tempProject({
    'truthlayer.yml': 'sources:\n  - type: markdown\n    path: ./docs\n  - type: openapi\n    path: ./openapi.yaml\n',
    'openapi.yaml': 'openapi: 3.0.0\ninfo: { title: t, version: "1" }\npaths:\n  /users:\n    get: { responses: { "200": { description: ok } } }\n',
    'docs/a.md': [
      '# A',
      'Call `GET /users/{id}/roles` to list roles.',
      'Salesforce data comes from `GET /sobjects/Account`.',
      'Discovery lives at `GET /.well-known/openid-configuration`.',
      '',
    ].join('\n'),
  });
  const r = run(dir);
  assert.deepEqual(r.findings.map((f) => `${f.type}: ${f.title}`), ['unknown_endpoint: GET /users/{id}/roles']);
  fs.rmSync(dir, { recursive: true, force: true });
});
