import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detectPlan, endpointEvents, extractFacts, normalizePath, rewriteChange, sameValue } from '../src/extract.js';
import { parseMarkdown } from '../src/sources/markdown.js';

const one = (sentence, opts) => extractFacts(sentence, opts).map(({ kind, subject, value }) => ({ kind, subject, value }));

test('rate limits in different writing styles', () => {
  assert.deepEqual(one('Each key can make 100 requests per minute.'), [{ kind: 'rate_limit', subject: 'per minute', value: 100 }]);
  assert.deepEqual(one('Limit: 1,000 requests/day'), [{ kind: 'rate_limit', subject: 'per day', value: 1000 }]);
  assert.deepEqual(one('You are rate limited to 20/sec.'), [{ kind: 'rate_limit', subject: 'per second', value: 20 }]);
  assert.deepEqual(one('`GET /v1/search` allows 10 requests per second.'), [{ kind: 'rate_limit', subject: 'per second GET /v1/search', value: 10 }]);
});

test('prices and plan limits', () => {
  assert.deepEqual(one('The Pro plan costs $39 per month.'), [{ kind: 'price', subject: 'per month', value: 39 }]);
  assert.deepEqual(one('Teams pay $10/user/month.'), [{ kind: 'price', subject: 'per user per month', value: 10 }]);
  assert.deepEqual(one('The Free plan includes up to 5 projects.'), [{ kind: 'quantity', subject: 'project', value: 5 }]);
  assert.deepEqual(one('You can have 3 API keys per project.'), [{ kind: 'quantity', subject: 'api key per project', value: 3 }]);
  assert.equal(one('Paid plans include unlimited projects.')[0].value, Infinity);
});

test('quantity needs a "limit" word, so normal sentences are ignored', () => {
  assert.deepEqual(one('We talked to 40 users last week.'), []);
  assert.deepEqual(one('10 Projects', { isTable: true })[0].value, 10);
});

test('sizes, storage, pagination, timeouts, retention, versions', () => {
  assert.deepEqual(one('The maximum file size is 25 MB.'), [{ kind: 'size_limit', subject: 'file size', value: 25 }]);
  assert.deepEqual(one('Each workspace gets 10 GB of storage.'), [{ kind: 'storage', subject: 'storage', value: 10240 }]);
  assert.deepEqual(one('Request up to 50 items per page.'), [{ kind: 'pagination', subject: 'items per page', value: 50 }]);
  assert.deepEqual(one('Requests time out after 30 seconds.'), [{ kind: 'timeout', subject: 'timeout', value: 30 }]);
  assert.deepEqual(one('Logs are kept for 30 days.'), [{ kind: 'retention', subject: 'data retention', value: 30 }]);
  assert.deepEqual(one('The CLI requires Node.js 18 or later.'), [{ kind: 'min_version', subject: 'minimum node version', value: '18' }]);
  assert.deepEqual(one('We support Python 3.8, 3.9 and 3.10.'), []);
  assert.deepEqual(one('The latest version is 2.0.'), [{ kind: 'product_version', subject: 'latest version', value: '2.0' }]);
});

test('plans are detected from the sentence or the heading', () => {
  assert.equal(detectPlan('On the Free plan you get 3 seats.', ''), 'free');
  assert.equal(detectPlan('You get 3 seats.', 'Professional plan'), 'pro');
  assert.equal(detectPlan('Feel free to ask.', ''), null);
});

test('changelog "from X to Y" keeps the new value and remembers the old one', () => {
  const r = rewriteChange('Increased the rate limit from 100 to 200 requests per minute.');
  assert.equal(r.oldValue, 100);
  assert.deepEqual(one(r.text), [{ kind: 'rate_limit', subject: 'per minute', value: 200 }]);
  assert.equal(rewriteChange('Pro now costs $39 per month (previously $29).').oldValue, 29);
});

test('changelog endpoint events ignore the replacement endpoint', () => {
  const ev = endpointEvents('Deprecated `POST /v1/exports` in favor of `POST /v1/exports/jobs`.');
  assert.deepEqual(ev.map((e) => [e.raw, e.status]), [['POST /v1/exports', 'deprecated']]);
  assert.equal(endpointEvents('Removed `GET /v1/reports`.')[0].status, 'removed');
});

test('paths are normalized', () => {
  assert.equal(normalizePath('https://api.acme.dev/v1/users/{id}', ['/v1']), '/users/{}');
  assert.equal(normalizePath('/v1/users/:userId/', ['/v1']), '/users/{}');
});

test('versions compare by number', () => {
  assert.ok(sameValue('2.0', '2.0.0'));
  assert.ok(!sameValue('18', '20'));
});

test('markdown tables with plan columns', () => {
  const { sentences } = parseMarkdown('| Feature | Free | Pro |\n|---|---|---|\n| Projects | 10 | Unlimited |\n');
  assert.deepEqual(sentences.map((s) => [s.text, s.plan]), [['10 Projects', 'free'], ['Unlimited Projects', 'pro']]);
});

test('ignore comments and code blocks', () => {
  const md = '# A\n<!-- truthlayer-ignore -->\nOld: 100 requests per minute.\n\n```\n200 requests per minute\n```\nNow: 300 requests per minute.\n';
  const { sentences } = parseMarkdown(md);
  assert.deepEqual(sentences.map((s) => s.text), ['Now: 300 requests per minute.']);
});
