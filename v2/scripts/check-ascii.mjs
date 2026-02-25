#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

const root = resolve(process.cwd());

const defaultTargets = [
  'AGENT_GUIDE.md',
  'TASK_TEMPLATE.md',
  'docs',
  'packages',
];

const skipDirs = new Set([
  '.git',
  'node_modules',
  'dist',
  'target',
  '.turbo',
  '.next',
]);

const allowedExt = new Set(['.md', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.rs', '.html', '.css', '.yml', '.yaml']);

const args = process.argv.slice(2);
const targets = args.length > 0 ? args : defaultTargets;

function hasAllowedExt(path) {
  const idx = path.lastIndexOf('.');
  if (idx < 0) return false;
  return allowedExt.has(path.slice(idx).toLowerCase());
}

function shouldScanFile(absPath) {
  const rel = relative(root, absPath).replaceAll('\\', '/');
  if (rel.includes('/dist/')) return false;
  if (rel.startsWith('packages/') && !rel.includes('/src/') && !rel.endsWith('/README.md')) {
    return false;
  }
  if (!rel.startsWith('packages/')) {
    if (!(rel.startsWith('docs/') || rel === 'AGENT_GUIDE.md' || rel === 'TASK_TEMPLATE.md')) {
      return false;
    }
  }
  return hasAllowedExt(rel);
}

function walk(absPath, out) {
  let st;
  try {
    st = statSync(absPath);
  } catch {
    return;
  }

  if (st.isDirectory()) {
    const base = absPath.split(/[\\/]/).at(-1) || '';
    if (skipDirs.has(base)) return;
    for (const ent of readdirSync(absPath)) {
      walk(join(absPath, ent), out);
    }
    return;
  }

  if (st.isFile() && shouldScanFile(absPath)) {
    out.push(absPath);
  }
}

function findNonAsciiLines(text) {
  const hits = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/[^\x00-\x7F]/.test(line)) {
      hits.push({ lineNo: i + 1, line });
    }
  }
  return hits;
}

const files = [];
for (const target of targets) {
  walk(resolve(root, target), files);
}

files.sort();

let violations = 0;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const hits = findNonAsciiLines(text);
  for (const hit of hits) {
    violations += 1;
    const rel = relative(root, file).replaceAll('\\', '/');
    process.stdout.write(`${rel}:${hit.lineNo}: ${hit.line}\n`);
  }
}

if (violations > 0) {
  process.stderr.write(`\nASCII check failed: ${violations} non-ASCII line(s) found.\n`);
  process.exit(1);
}

process.stdout.write('ASCII check passed.\n');
