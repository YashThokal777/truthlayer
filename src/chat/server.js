import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { color } from '../util.js';
import { createAssistant, llmStatus } from './answer.js';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/widget.js': ['widget.js', 'text/javascript; charset=utf-8'],
  '/embed': ['embed.html', 'text/html; charset=utf-8'],
};

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'content-type': type,
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'cache-control': 'no-store',
  });
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}

function readBody(req, limit = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('Request too large.'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function createServer(config) {
  const assistant = createAssistant(config);
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (req.method === 'OPTIONS') return send(res, 204, '', 'text/plain');
      if (req.method === 'GET' && STATIC[url.pathname]) {
        const [file, type] = STATIC[url.pathname];
        return send(res, 200, fs.readFileSync(path.join(PUBLIC, file), 'utf8'), type);
      }
      if (req.method === 'GET' && url.pathname === '/api/info') return send(res, 200, assistant.info());
      if (req.method === 'GET' && url.pathname === '/api/report') return send(res, 200, assistant.report());
      if (req.method === 'POST' && url.pathname === '/api/ask') {
        let question = '';
        try {
          question = String(JSON.parse(await readBody(req)).question ?? '').trim();
        } catch {
          return send(res, 400, { error: 'Send JSON like {"question": "..."}' });
        }
        if (!question) return send(res, 400, { error: 'The question is empty.' });
        if (question.length > 2000) return send(res, 400, { error: 'The question is too long.' });
        return send(res, 200, await assistant.ask(question));
      }
      return send(res, 404, { error: 'Not found' });
    } catch (e) {
      return send(res, 500, { error: e.message });
    }
  });
}

export function startServer(config, { port = 4141, host = '127.0.0.1' } = {}) {
  const server = createServer(config);
  return new Promise((resolve, reject) => {
    server.once('error', (e) => {
      if (e.code === 'EADDRINUSE') reject(new Error(`Port ${port} is busy. Try: truthlayer dev --port ${port + 1}`));
      else reject(e);
    });
    server.listen(port, host, () => {
      const s = llmStatus(config);
      const shown = host === '0.0.0.0' ? 'localhost' : host;
      console.log('');
      console.log(`${color.bold('TruthLayer')} ${color.gray('·')} ${config.name}`);
      console.log(`  Playground  ${color.cyan(`http://${shown}:${port}`)}`);
      console.log(`  Widget      ${color.gray(`<script src="http://${shown}:${port}/widget.js"></script><truthlayer-chat endpoint="http://${shown}:${port}"></truthlayer-chat>`)}`);
      console.log(
        s.enabled
          ? `  AI          ${color.green('on')} ${color.gray(`(${s.model})`)}`
          : `  AI          ${color.yellow('off')} ${color.gray(`— search-only mode. Put ${s.keyEnv}=... in a .env file to turn on written answers.`)}`,
      );
      console.log(color.gray('  Press Ctrl+C to stop.'));
      console.log('');
      resolve(server);
    });
  });
}
