import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

export function gitRoot(cwd) {
  try {
    return path.resolve(git(['rev-parse', '--show-toplevel'], cwd).trim());
  } catch {
    return null;
  }
}

/**
 * Returns a function abs path -> Date of last change.
 * Uses the last git commit date, but files with uncommitted changes (or not in git)
 * use the file's modified time, because that is newer and more honest.
 */
export function createDateLookup(cwd) {
  const root = gitRoot(cwd);
  const committed = new Map();
  const dirty = new Set();
  if (root) {
    try {
      const log = git(['log', '--format=__C__%cI', '--name-only', '--no-renames', '--', '.'], root);
      let current = null;
      for (const line of log.split('\n')) {
        if (line.startsWith('__C__')) current = new Date(line.slice(5));
        else if (line.trim() && current) {
          const abs = path.resolve(root, line.trim());
          if (!committed.has(abs)) committed.set(abs, current);
        }
      }
      const status = git(['status', '--porcelain', '--untracked-files=all'], root);
      for (const line of status.split('\n')) {
        if (!line.trim()) continue;
        const p = line.slice(3).replace(/^"|"$/g, '');
        dirty.add(path.resolve(root, p.includes(' -> ') ? p.split(' -> ')[1] : p));
      }
    } catch {
      // Repository with no commits yet: fall back to file times.
    }
  }
  return (abs) => {
    const key = path.resolve(abs);
    if (!dirty.has(key) && committed.has(key)) return committed.get(key);
    try {
      return fs.statSync(key).mtime;
    } catch {
      return null;
    }
  };
}

/** Absolute paths of files changed between `base` and the working tree. */
export function changedFiles(cwd, base) {
  const root = gitRoot(cwd);
  if (!root) throw new Error('--base needs a git repository.');
  let out;
  try {
    out = git(['diff', '--name-only', base], root);
  } catch {
    throw new Error(
      `Could not compare with "${base}". In GitHub Actions, use actions/checkout with "fetch-depth: 0".`,
    );
  }
  const untracked = git(['ls-files', '--others', '--exclude-standard'], root);
  return new Set(
    [...out.split('\n'), ...untracked.split('\n')]
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => path.resolve(root, l)),
  );
}
