#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { analyze, groupLabel } from './check/analyze.js';
import { ConfigError, loadConfig } from './config.js';
import { changedFiles, gitRoot } from './git.js';
import { initProject } from './init.js';
import { buildKnowledge } from './knowledge.js';
import { toJson, toMarkdown, toTerminal } from './report/format.js';
import { color, toPosix } from './util.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(here, '..', 'package.json'), 'utf8'));

const HELP = `
${color.bold('truthlayer')} ${pkg.version} — docs CI for AI assistants

${color.bold('Usage')}
  truthlayer init                 Create truthlayer.yml (and a GitHub workflow with --github-action)
  truthlayer check                Find outdated and conflicting facts in your docs
  truthlayer dev                  Open a local chat playground and knowledge report
  truthlayer ask "question"       Ask your docs a question in the terminal
  truthlayer facts                List every fact TruthLayer found (for debugging)

${color.bold('Common options')}
  --cwd <dir>                     Project folder (default: current folder)
  --config <file>                 Path to truthlayer.yml

${color.bold('check options')}
  --base <git-ref>                Only show findings that touch files changed since <git-ref>
  --format terminal|markdown|json Output format (default: terminal)
  --output <file>                 Write the report to a file
  --json-output <file>            Also write the report as JSON
  --strict                        Exit with code 1 when there are errors

${color.bold('dev options')}
  --port <n>                      Port (default: 4141)
  --host <host>                   Host (default: 127.0.0.1)

${color.bold('init options')}
  --github-action                 Also create .github/workflows/truthlayer.yml
  --force                         Overwrite existing files
`;

function fail(msg, code = 2) {
  process.stderr.write(`${color.red('error')} ${msg}\n`);
  process.exit(code);
}

function options(argv, extra = {}) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      cwd: { type: 'string' },
      config: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
      ...extra,
    },
  });
  return { ...values, positionals, cwd: path.resolve(values.cwd ?? process.cwd()) };
}

function loadEnv(dir) {
  try {
    process.loadEnvFile(path.join(dir, '.env'));
  } catch {
    /* no .env file */
  }
}

/** Build GitHub blob links in PR comments, when running inside GitHub Actions. */
function githubLinker(config) {
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY } = process.env;
  const sha = process.env.TRUTHLAYER_SHA || process.env.GITHUB_SHA;
  const root = gitRoot(config.root);
  if (!GITHUB_SERVER_URL || !GITHUB_REPOSITORY || !sha || !root) return undefined;
  return (file, line) => {
    const fromRoot = toPosix(path.relative(root, path.resolve(config.root, file)));
    return `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/blob/${sha}/${fromRoot}#L${line}`;
  };
}

async function cmdCheck(argv) {
  const o = options(argv, {
    base: { type: 'string' },
    format: { type: 'string', default: 'terminal' },
    output: { type: 'string' },
    'json-output': { type: 'string' },
    strict: { type: 'boolean' },
  });
  if (!['terminal', 'markdown', 'json'].includes(o.format)) fail('--format must be terminal, markdown or json.');
  const config = loadConfig({ cwd: o.cwd, configPath: o.config });
  const kb = buildKnowledge(config);

  let changed;
  if (o.base) {
    changed = new Set();
    for (const abs of changedFiles(config.root, o.base)) changed.add(toPosix(path.relative(config.root, abs)));
  }
  const report = analyze(kb, { changed });

  const text =
    o.format === 'json'
      ? toJson(report)
      : o.format === 'markdown'
        ? toMarkdown(report, { link: githubLinker(config) })
        : toTerminal(report);
  if (o.output) {
    fs.mkdirSync(path.dirname(path.resolve(o.output)), { recursive: true });
    fs.writeFileSync(path.resolve(o.output), text);
    if (o.format !== 'terminal') process.stdout.write(toTerminal(report) + '\n');
  } else {
    process.stdout.write(text + (text.endsWith('\n') ? '' : '\n'));
  }
  if (o['json-output']) {
    fs.mkdirSync(path.dirname(path.resolve(o['json-output'])), { recursive: true });
    fs.writeFileSync(path.resolve(o['json-output']), toJson(report));
  }

  const failOn = o.strict ? 'error' : config.check.fail_on;
  const s = report.summary;
  if ((failOn === 'error' && s.errors) || (failOn === 'warning' && (s.errors || s.warnings))) process.exit(1);
}

async function cmdFacts(argv) {
  const o = options(argv);
  const config = loadConfig({ cwd: o.cwd, configPath: o.config });
  const kb = buildKnowledge(config);
  const groups = new Map();
  for (const f of kb.facts) {
    if (!groups.has(f.group)) groups.set(f.group, []);
    groups.get(f.group).push(f);
  }
  for (const facts of groups.values()) {
    console.log(color.bold(groupLabel(facts[0])));
    for (const f of facts) {
      const tag = f.truth ? color.green('truth') : color.gray('doc  ');
      console.log(`  ${tag} ${color.cyan(`${f.file}:${f.line}`)}  ${f.raw}`);
    }
  }
  console.log(color.gray(`\n${kb.facts.length} facts, ${kb.endpoints.length} endpoints in spec, ${kb.mentions.length} endpoint mentions in docs`));
}

async function cmdDev(argv) {
  const o = options(argv, { port: { type: 'string', default: '4141' }, host: { type: 'string', default: '127.0.0.1' } });
  const config = loadConfig({ cwd: o.cwd, configPath: o.config });
  loadEnv(config.root);
  const { startServer } = await import('./chat/server.js');
  await startServer(config, { port: Number(o.port), host: o.host });
}

async function cmdAsk(argv) {
  const o = options(argv);
  const question = o.positionals.join(' ').trim();
  if (!question) fail('Write a question, for example: truthlayer ask "What is the rate limit?"');
  const config = loadConfig({ cwd: o.cwd, configPath: o.config });
  loadEnv(config.root);
  const { createAssistant } = await import('./chat/answer.js');
  const assistant = createAssistant(config);
  const res = await assistant.ask(question);
  console.log('');
  console.log(res.answer);
  if (res.warnings.length) {
    console.log('');
    for (const w of res.warnings) console.log(color.yellow(`⚠ ${w.text}`));
  }
  if (res.sources.length) {
    console.log('');
    console.log(color.bold('Sources'));
    for (const s of res.sources) console.log(`  [${s.n}] ${color.cyan(`${s.file}:${s.line}`)} ${s.heading} ${color.gray(`· ${s.age}`)}`);
  }
  console.log('');
}

async function cmdInit(argv) {
  const o = options(argv, { 'github-action': { type: 'boolean' }, force: { type: 'boolean' } });
  const res = initProject(o.cwd, { githubAction: o['github-action'], force: o.force });
  for (const line of res.messages) console.log(line);
}

const commands = { check: cmdCheck, facts: cmdFacts, dev: cmdDev, ask: cmdAsk, init: cmdInit };

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === '--version' || cmd === '-v') return console.log(pkg.version);
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h' || !commands[cmd]) {
    process.stdout.write(HELP + '\n');
    if (cmd && !commands[cmd] && !['help', '--help', '-h'].includes(cmd)) process.exit(2);
    return;
  }
  if (rest.includes('--help') || rest.includes('-h')) return process.stdout.write(HELP + '\n');
  await commands[cmd](rest);
}

main().catch((e) => {
  if (e instanceof ConfigError || e?.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') fail(e.message);
  fail(e?.message ?? String(e), 2);
});
