import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createAssistant } from '../src/chat/answer.js';
import { loadConfig } from '../src/config.js';

const example = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'examples', 'acme-docs');
const seen = [];
let server;
let base;

before(async () => {
  // Fake provider: "slow-model" never answers in time, "busy-model" returns 429, "good-model" answers.
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const { model } = JSON.parse(body);
      seen.push(model);
      if (model === 'slow-model') return setTimeout(() => res.end('{}'), 3000);
      res.writeHead(model === 'busy-model' ? 429 : 200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: `answer from ${model} [1]` } }] }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}/v1`;
});

after(() => {
  server.closeAllConnections();
  server.close();
});

function assistantWith(models) {
  const config = loadConfig({ cwd: example });
  Object.assign(config.assistant, {
    provider: 'custom',
    base_url: base,
    model: models[0],
    fallback_models: models.slice(1),
    timeout_seconds: 1,
    reasoning_effort: undefined,
  });
  return createAssistant(config);
}

test('a slow or busy model falls back to the next model', async () => {
  seen.length = 0;
  const res = await assistantWith(['slow-model', 'busy-model', 'good-model']).ask('What is the API rate limit?');
  assert.equal(res.mode, 'llm');
  assert.equal(res.model, 'good-model');
  assert.deepEqual(seen, ['slow-model', 'busy-model', 'good-model']);
});

test('when every model fails, the answer falls back to search results', async () => {
  const res = await assistantWith(['busy-model']).ask('What is the API rate limit?');
  assert.equal(res.mode, 'error');
  assert.match(res.answer, /rate limit was reached/);
  assert.ok(res.sources.length > 0);
});
