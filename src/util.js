import fs from 'node:fs';
import path from 'node:path';

export const toPosix = (p) => p.split(path.sep).join('/');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.truthlayer', '.cache']);

/** Recursively list files under `dir` whose names end with one of `exts`. */
export function walk(dir, exts) {
  const out = [];
  (function rec(d) {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (SKIP_DIRS.has(e.name)) continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) rec(full);
      else if (exts.some((x) => e.name.toLowerCase().endsWith(x))) out.push(full);
    }
  })(dir);
  return out.sort();
}

/** Convert a simple glob (`*`, `**`, `?`) to a RegExp that matches posix paths. */
export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        i++;
        if (glob[i + 1] === '/') {
          i++;
          re += '(?:.*/)?';
        } else {
          re += '.*';
        }
      } else {
        re += '[^/]*';
      }
    } else if (ch === '?') {
      re += '[^/]';
    } else {
      re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re.replace(/^\.\//, '')}$`);
}

export function matchesAny(file, globs) {
  return globs.some((g) => globToRegExp(g.replace(/^\.\//, '')).test(file));
}

export function timeAgo(date, now = new Date()) {
  if (!date) return 'unknown date';
  const days = Math.floor((now - date) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 45) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (months < 18) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.round(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

export const isoDate = (d) => (d ? d.toISOString().slice(0, 10) : 'unknown');

const useColor = () => process.stdout.isTTY && !process.env.NO_COLOR;
const wrap = (code) => (s) => (useColor() ? `\x1b[${code}m${s}\x1b[0m` : String(s));
export const color = {
  red: wrap(31),
  yellow: wrap(33),
  green: wrap(32),
  cyan: wrap(36),
  gray: wrap(90),
  bold: wrap(1),
  dim: wrap(2),
};

export function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
