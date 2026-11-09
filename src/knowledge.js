import fs from 'node:fs';
import path from 'node:path';
import {
  detectPlan,
  endpointEvents,
  extractFacts,
  findEndpoints,
  normalizePath,
  rewriteChange,
} from './extract.js';
import { createDateLookup } from './git.js';
import { parseChangelog } from './sources/changelog.js';
import { parseMarkdown } from './sources/markdown.js';
import { parseOpenApi } from './sources/openapi.js';
import { matchesAny, toPosix, walk } from './util.js';

const MD_EXTS = ['.md', '.mdx', '.markdown'];

/** "docs/v1/limits.md" -> "v1". Facts in versioned folders are only compared with the same version. */
function versionScope(relFile) {
  const dirs = relFile.split('/').slice(0, -1);
  const seg = dirs.find((d) => /^v?\d+(?:\.(?:\d+|x))*$/i.test(d));
  return seg ? seg.toLowerCase() : '';
}

function listFiles(source, exts) {
  if (!fs.existsSync(source.path)) {
    throw new Error(`Source not found: ${source.path} (type: ${source.type}). Fix the path in truthlayer.yml.`);
  }
  return fs.statSync(source.path).isDirectory() ? walk(source.path, exts) : [source.path];
}

/** Read every source in the config and turn it into facts, sections and endpoints. */
export function buildKnowledge(config) {
  const dateOf = createDateLookup(config.root);
  const rel = (abs) => toPosix(path.relative(config.root, abs)) || path.basename(abs);
  const ignored = (f) => matchesAny(f, config.check.ignore_paths ?? []);

  const kb = {
    config,
    files: [],
    facts: [],
    sections: [],
    endpoints: [],
    mentions: [],
    events: [],
    basePaths: [],
    latest: null,
  };

  const pushFact = (f, meta) => {
    const plan = meta.plan ?? null;
    const scope = meta.scope ?? '';
    kb.facts.push({
      ...f,
      ...meta,
      plan,
      scope,
      group: [f.kind, f.subject, plan ?? '', scope].join('|'),
      id: `${meta.file}:${meta.line}:${f.kind}:${f.subject}`,
    });
  };

  for (const source of config.sources) {
    if (source.type === 'markdown') {
      for (const abs of listFiles(source, MD_EXTS)) {
        const file = rel(abs);
        if (ignored(file)) continue;
        const date = dateOf(abs);
        const { sections, sentences } = parseMarkdown(fs.readFileSync(abs, 'utf8'));
        kb.files.push({ file, type: 'markdown', date, truth: source.truth });
        for (const s of sections) kb.sections.push({ ...s, file, date, type: 'markdown', truth: source.truth });
        const scope = versionScope(file);
        for (const s of sentences) {
          const plan = s.plan ?? detectPlan(s.text, s.heading);
          for (const f of extractFacts(s.text, { isTable: s.isTable })) {
            pushFact(f, { file, line: s.line, sentence: s.text, date, type: 'markdown', truth: source.truth, plan, scope });
          }
          for (const e of findEndpoints(s.text)) {
            kb.mentions.push({ ...e, file, line: s.line, sentence: s.text, date, scope });
          }
        }
      }
    }

    if (source.type === 'openapi') {
      for (const abs of listFiles(source, ['.yaml', '.yml', '.json'])) {
        const file = rel(abs);
        if (ignored(file)) continue;
        const date = dateOf(abs);
        const spec = parseOpenApi(fs.readFileSync(abs, 'utf8'), file);
        kb.files.push({ file, type: 'openapi', date, truth: source.truth });
        kb.basePaths.push(...spec.basePaths);
        for (const e of spec.endpoints) kb.endpoints.push({ ...e, file, date });
        for (const s of spec.sections) kb.sections.push({ ...s, file, date, type: 'openapi', truth: source.truth });
        const meta = { file, date, type: 'openapi', truth: source.truth };
        for (const f of spec.facts) pushFact(f, { ...meta, line: f.line, sentence: f.raw });
        for (const s of spec.sentences) {
          for (const f of extractFacts(s.text)) {
            pushFact(f, { ...meta, line: s.line, sentence: s.text, plan: detectPlan(s.text, s.heading) });
          }
        }
      }
    }

    if (source.type === 'changelog') {
      for (const abs of listFiles(source, MD_EXTS)) {
        const file = rel(abs);
        if (ignored(file)) continue;
        const fileDate = dateOf(abs);
        const { entries, latest } = parseChangelog(fs.readFileSync(abs, 'utf8'));
        kb.files.push({ file, type: 'changelog', date: fileDate, truth: source.truth });
        for (const entry of entries) {
          const date = entry.date ?? fileDate;
          kb.sections.push({
            heading: `${entry.version}${entry.date ? ` (${entry.date.toISOString().slice(0, 10)})` : ''}`,
            path: ['Changelog'],
            line: entry.line,
            endLine: entry.items.at(-1)?.line ?? entry.line,
            text: entry.items.map((i) => `- ${i.text}`).join('\n'),
            file,
            date,
            type: 'changelog',
            truth: source.truth,
          });
          for (const item of entry.items) {
            const { text, oldValue } = rewriteChange(item.text);
            for (const f of extractFacts(text)) {
              pushFact(f, {
                file, line: item.line, sentence: item.text, date, type: 'changelog', truth: source.truth,
                plan: detectPlan(item.text, ''), version: entry.version, oldValue,
              });
            }
            for (const e of endpointEvents(item.text)) {
              kb.events.push({ ...e, file, line: item.line, sentence: item.text, date, version: entry.version });
            }
          }
        }
        if (latest && (!kb.latest || latest.date > kb.latest.date)) {
          kb.latest = latest;
          pushFact(
            { kind: 'product_version', subject: 'latest version', value: latest.version, raw: `## ${latest.version}` },
            { file, line: latest.line, sentence: `Latest release: ${latest.version}`, date: latest.date ?? fileDate, type: 'changelog', truth: source.truth, version: latest.version },
          );
        }
      }
    }
  }

  kb.basePaths = [...new Set(kb.basePaths)];
  for (const m of kb.mentions) m.key = normalizePath(m.path, kb.basePaths);
  for (const e of kb.events) e.key = normalizePath(e.path, kb.basePaths);
  return kb;
}
