import fs from 'node:fs';
import path from 'node:path';
import { findConfig } from './config.js';
import { color, toPosix } from './util.js';

const DOC_DIRS = ['docs', 'documentation', 'doc', 'content/docs', 'website/docs', 'pages/docs', 'content'];
const SPEC_FILES = ['openapi.yaml', 'openapi.yml', 'openapi.json', 'swagger.yaml', 'swagger.yml', 'swagger.json', 'api/openapi.yaml', 'api/openapi.yml', 'api/openapi.json', 'docs/openapi.yaml', 'docs/openapi.json'];
const CHANGELOGS = ['CHANGELOG.md', 'CHANGES.md', 'HISTORY.md', 'docs/changelog.md', 'docs/CHANGELOG.md'];

const first = (cwd, list) => list.find((p) => fs.existsSync(path.join(cwd, p)));

export const WORKFLOW = `# Runs TruthLayer on every pull request and comments with outdated or conflicting facts.
name: TruthLayer

on:
  pull_request:
    paths:
      - '**/*.md'
      - '**/*.mdx'
      - '**/openapi.*'
      - '**/swagger.*'
      - 'truthlayer.yml'

permissions:
  contents: read
  pull-requests: write

jobs:
  knowledge-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # needed for git dates and for comparing with the base branch
      - uses: YashThokal777/truthlayer@main
        with:
          strict: 'false'  # set to 'true' to fail the PR when TruthLayer finds errors
`;

export function initProject(cwd, { githubAction = false, force = false } = {}) {
  const messages = [];
  const existing = findConfig(cwd);
  const configPath = path.join(cwd, 'truthlayer.yml');

  if (existing && !force) {
    messages.push(color.yellow(`${path.basename(existing)} already exists. Use --force to overwrite it.`));
  } else {
    const docs = first(cwd, DOC_DIRS);
    const spec = first(cwd, SPEC_FILES);
    const changelog = first(cwd, CHANGELOGS);
    const sources = [];
    sources.push(`  - type: markdown\n    path: ./${docs ?? 'docs'}${docs ? '' : '   # change this to your docs folder'}`);
    if (spec) sources.push(`  - type: openapi        # source of truth for endpoints and limits\n    path: ./${toPosix(spec)}`);
    else sources.push(`  # - type: openapi\n  #   path: ./openapi.yaml`);
    if (changelog) sources.push(`  - type: changelog      # source of truth for what changed\n    path: ./${toPosix(changelog)}`);
    else sources.push(`  # - type: changelog\n  #   path: ./CHANGELOG.md`);

    const name = path.basename(path.resolve(cwd));
    const yml = `# TruthLayer config. Docs: https://github.com/YashThokal777/truthlayer
name: ${name} Assistant

sources:
${sources.join('\n')}

check:
  stale_after_days: 180   # pages older than this are listed as "old"
  fail_on: never          # never | error | warning
  ignore_paths: []        # e.g. ["docs/legacy/**"]

assistant:
  # gemini (free key: https://aistudio.google.com/apikey) -> put GEMINI_API_KEY=... in .env
  # groq -> GROQ_API_KEY · ollama -> fully local, no key · custom -> set base_url, model, api_key_env
  provider: gemini
  # model: gemini-3.5-flash
  suggestions: []
`;
    fs.writeFileSync(configPath, yml);
    messages.push(`${color.green('✔')} Created truthlayer.yml`);
    messages.push(color.gray(`  docs: ${docs ?? 'not found (edit the path)'} · openapi: ${spec ?? 'not found'} · changelog: ${changelog ?? 'not found'}`));
  }

  if (githubAction) {
    const wf = path.join(cwd, '.github', 'workflows', 'truthlayer.yml');
    if (fs.existsSync(wf) && !force) {
      messages.push(color.yellow('.github/workflows/truthlayer.yml already exists. Use --force to overwrite it.'));
    } else {
      fs.mkdirSync(path.dirname(wf), { recursive: true });
      fs.writeFileSync(wf, WORKFLOW);
      messages.push(`${color.green('✔')} Created .github/workflows/truthlayer.yml`);
    }
  }

  messages.push('');
  messages.push('Next steps:');
  messages.push(`  ${color.cyan('npx truthlayer check')}   find outdated and conflicting facts`);
  messages.push(`  ${color.cyan('npx truthlayer dev')}     open the chat playground`);
  return { messages };
}
