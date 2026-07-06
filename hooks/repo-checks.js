#!/usr/bin/env node
'use strict';
/**
 * Repo-wide pre-commit checks — the cross-file invariants the write-time hook can't see
 * (it sees one file at a time). Called by .guardrails/pre-commit AFTER the GATE.
 *
 * This is a PRE-COMMIT CHECK, not a harness hook: it MAY exit non-zero to BLOCK a commit.
 * It blocks ONLY the inequivocal classes (cyclic import, swallowed catch) and WARNS on the
 * heuristic ones (large file, unbounded query, duplicate helper) — warnings never block.
 * On its OWN internal error it fails OPEN (exit 0 + stderr note) — a crashing check must not
 * wedge every commit in the repo.
 *
 * Zero deps, Node built-ins only. Usage: node repo-checks.js [projectDir]
 *
 * Escapes:
 *   • per-line   `guardrails-ok: <why>` on the offending line (or the import line) skips it.
 *   • per-check  GUARDRAILS_SKIP=cycles,catch,size,query,dup  disables named checks.
 */

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const SRC_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|zig|rs|go|rb|java|kt|php|cs|vue|svelte)$/;
const JS_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const VENDORED = /(^|\/)(node_modules|dist|build|\.next|vendor|__generated__|\.git|coverage|out)\//;
const ALLOW = 'guardrails-ok:';

/** List tracked source files under root. Prefers `git ls-files` (respects .gitignore); walks on fallback. */
function listSourceFiles(root) {
  let files = [];
  try {
    const out = cp.execSync('git ls-files -z', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    files = out.split('\0').filter(Boolean);
  } catch {
    files = walk(root, root);
  }
  return files
    .map((f) => f.replace(/\\/g, '/'))
    .filter((f) => SRC_EXT.test(f) && !VENDORED.test(f));
}

function walk(dir, root) {
  const out = [];
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(root, full).replace(/\\/g, '/');
    if (VENDORED.test('/' + rel + '/')) continue;
    if (e.isDirectory()) out.push(...walk(full, root));
    else out.push(rel);
  }
  return out;
}

function read(root, rel) {
  try {
    return fs.readFileSync(path.join(root, rel), 'utf8');
  } catch {
    return '';
  }
}

/** Map a regex match index to a 1-based line number. */
function lineAt(content, index) {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) if (content[i] === '\n') line++;
  return line;
}

const JS_LIKE = /\.(ts|tsx|js|jsx|mjs|cjs|zig|rs|go|java|kt|cs|vue|svelte)$/;

/**
 * Blank comments and (optionally) string literals to spaces, preserving length and newlines so
 * line numbers still align. Strings are always TRACKED (so a `//` inside "http://x" is not read
 * as a comment) but only BLANKED when keepStrings is false. This is what stops the swallowed-catch
 * / query / dup checks from firing on a pattern that lives in a comment or a quoted example — the
 * false positives that would otherwise block a commit. keepStrings=true is for the cycle check,
 * where the import path itself is a string that must survive.
 */
function stripNonCode(content, filePath, keepStrings) {
  const hash = !JS_LIKE.test(filePath); // '#' is a comment in py/rb/sh; a private field in JS — don't touch JS
  const n = content.length;
  let out = '';
  let state = 'code'; // code | line | block | sq | dq | bt | tsq | tdq
  let i = 0;
  const blank = (s) => (keepStrings ? s : ' '.repeat(s.length));
  while (i < n) {
    const c = content[i];
    const two = content.slice(i, i + 2);
    const three = content.slice(i, i + 3);
    if (state === 'code') {
      if (two === '//') { state = 'line'; out += '  '; i += 2; continue; }
      if (hash && c === '#') { state = 'line'; out += ' '; i += 1; continue; }
      if (two === '/*') { state = 'block'; out += '  '; i += 2; continue; }
      if (three === "'''") { state = 'tsq'; out += blank("'''"); i += 3; continue; }
      if (three === '"""') { state = 'tdq'; out += blank('"""'); i += 3; continue; }
      if (c === "'") { state = 'sq'; out += blank("'"); i += 1; continue; }
      if (c === '"') { state = 'dq'; out += blank('"'); i += 1; continue; }
      if (c === '`') { state = 'bt'; out += blank('`'); i += 1; continue; }
      out += c; i += 1; continue;
    }
    if (state === 'line') {
      if (c === '\n') { state = 'code'; out += '\n'; } else out += ' ';
      i += 1; continue;
    }
    if (state === 'block') {
      if (two === '*/') { state = 'code'; out += '  '; i += 2; continue; }
      out += c === '\n' ? '\n' : ' '; i += 1; continue;
    }
    // inside a string
    const closers = { sq: "'", dq: '"', bt: '`', tsq: "'''", tdq: '"""' };
    const closer = closers[state];
    if (c === '\\' && state !== 'tsq' && state !== 'tdq') { out += blank(content.slice(i, i + 2)); i += 2; continue; }
    if (content.slice(i, i + closer.length) === closer) { state = 'code'; out += blank(closer); i += closer.length; continue; }
    out += c === '\n' ? '\n' : blank(c); i += 1; continue;
  }
  return out;
}

/**
 * Scan for a global regex. Matches against `searchContent` (same length as raw, so lines align)
 * but reports the RAW line text; skips any hit whose raw line carries a `guardrails-ok:` escape.
 */
function scan(rawContent, regex, searchContent) {
  const hay = searchContent || rawContent;
  const hits = [];
  const lines = rawContent.split('\n');
  let m;
  regex.lastIndex = 0;
  while ((m = regex.exec(hay))) {
    const line = lineAt(hay, m.index);
    const text = (lines[line - 1] || '').trim();
    if (!text.includes(ALLOW)) hits.push({ line, text });
    if (m.index === regex.lastIndex) regex.lastIndex++; // guard against zero-width
  }
  return hits;
}

// --- Check: swallowed catch (BLOCK) ---
// Empty JS/TS catch, no-op promise catch, bare python except-pass, zig catch unreachable/{}.
// An EMPTY catch block. Matched on comment/string-stripped code, then re-checked against the RAW
// body: a `catch { /* best-effort */ }` keeps its comment in raw and is treated as DOCUMENTED
// intent (skipped) — only a body that is empty in the RAW source is the inequivocal forgotten
// swallow that blocks. `// catch {}` written inside a comment never matches (the keyword is blanked).
const EMPTY_CATCH = /catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;
// The unambiguous swallows that block regardless of an inner comment.
const OTHER_SWALLOW = new RegExp(
  [
    '\\.catch\\s*\\(\\s*\\(\\s*[^)]*\\)\\s*=>\\s*(?:null|undefined|\\{\\s*\\})\\s*\\)', // .catch(() => null|undefined|{})
    'except[^\\n:]*:\\s*(?:#[^\\n]*)?\\n\\s*pass\\b', // except ...: \n pass
    'except[^\\n:]*:\\s*pass\\b', // except ...: pass  (same line)
    'catch\\s+unreachable', // zig catch unreachable
  ].join('|'),
  'g',
);

function findSwallowedCatches(root, files) {
  const out = [];
  for (const f of files) {
    const raw = read(root, f);
    const code = stripNonCode(raw, f, false);
    const rawLines = raw.split('\n');
    let m;
    EMPTY_CATCH.lastIndex = 0;
    while ((m = EMPTY_CATCH.exec(code))) {
      // Re-check the RAW span: if the braces hold a comment (non-ws in raw), it's documented → skip.
      const rawSpan = raw.slice(m.index, m.index + m[0].length);
      if (!/\{\s*\}\s*$/.test(rawSpan)) continue;
      const line = lineAt(code, m.index);
      const text = (rawLines[line - 1] || '').trim();
      if (!text.includes(ALLOW)) out.push({ file: f, line, text });
    }
    for (const h of scan(raw, OTHER_SWALLOW, code)) out.push({ file: f, line: h.line, text: h.text });
  }
  return out;
}

// --- Check: cyclic import (BLOCK), JS/TS only ---
// Three shapes, each capturing the relative specifier in a different group:
//   1. import/export ... from '...'   2. bare side-effect `import '...'`   3. require('...')
// The bare form has no `from`, so it needs its own alternative — a cycle built from
// side-effect imports would otherwise be silently missed (a false negative in a blocking check).
const IMPORT_RE = /(?:import|export)[\s\S]*?from\s*['"](\.[^'"]+)['"]|import\s+['"](\.[^'"]+)['"]|require\s*\(\s*['"](\.[^'"]+)['"]/g;

/** Resolve a relative specifier from `fromFile` to a real repo file, or null. */
function resolveImport(root, fromFile, spec) {
  const baseDir = path.dirname(path.join(root, fromFile));
  const target = path.resolve(baseDir, spec);
  const cands = [
    target,
    ...['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].map((e) => target + e),
    ...['index.ts', 'index.tsx', 'index.js', 'index.jsx', 'index.mjs', 'index.cjs'].map((e) => path.join(target, e)),
  ];
  for (const c of cands) {
    try {
      if (fs.statSync(c).isFile()) return path.relative(root, c).replace(/\\/g, '/');
    } catch {
      // keep trying
    }
  }
  return null;
}

/** Build import graph and return the first cycle found as an array of files, or null. */
function findCycles(root, files) {
  const jsFiles = files.filter((f) => JS_EXT.test(f));
  const set = new Set(jsFiles);
  const graph = new Map();
  for (const f of jsFiles) {
    const raw = read(root, f);
    const content = stripNonCode(raw, f, true); // blank comments (keep string import paths)
    const deps = new Set();
    const lines = raw.split('\n');
    let m;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(content))) {
      const line = lines[lineAt(content, m.index) - 1] || '';
      if (line.includes(ALLOW)) continue;
      const spec = m[1] || m[2] || m[3]; // from-import | bare import | require
      const resolved = resolveImport(root, f, spec);
      // resolved !== f: a file importing itself is degenerate, not a cross-module cycle — skip it.
      if (resolved && set.has(resolved) && resolved !== f) deps.add(resolved);
    }
    graph.set(f, [...deps]);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map(jsFiles.map((f) => [f, WHITE]));
  const stack = [];
  let cycle = null;

  function dfs(node) {
    color.set(node, GRAY);
    stack.push(node);
    for (const dep of graph.get(node) || []) {
      if (cycle) return;
      const c = color.get(dep);
      if (c === GRAY) {
        cycle = stack.slice(stack.indexOf(dep)).concat(dep);
        return;
      }
      if (c === WHITE) dfs(dep);
    }
    stack.pop();
    color.set(node, BLACK);
  }

  for (const f of jsFiles) {
    if (cycle) break;
    if (color.get(f) === WHITE) dfs(f);
  }
  return cycle;
}

// --- Check: large file (WARN) ---
function findLargeFiles(root, files, limit = 500) {
  const out = [];
  for (const f of files) {
    const content = read(root, f);
    if (content.includes(ALLOW)) continue; // whole-file opt-out
    const n = content.split('\n').length;
    if (n > limit) out.push({ file: f, lines: n });
  }
  return out;
}

// --- Check: unbounded findMany (WARN), JS/TS only ---
const FINDMANY_RE = /\.findMany\s*\(([\s\S]{0,400}?)\)/g;
function findUnboundedQueries(root, files) {
  const out = [];
  for (const f of files.filter((x) => JS_EXT.test(x))) {
    const raw = read(root, f);
    const content = stripNonCode(raw, f, false);
    const rawLines = raw.split('\n');
    let m;
    FINDMANY_RE.lastIndex = 0;
    while ((m = FINDMANY_RE.exec(content))) {
      const args = m[1];
      if (/\b(take|limit|first|cursor)\b/.test(args)) continue;
      const line = lineAt(content, m.index);
      const text = (rawLines[line - 1] || '').trim();
      if (text.includes(ALLOW)) continue;
      out.push({ file: f, line, text });
    }
  }
  return out;
}

// --- Check: duplicate helper (WARN) — same distinctive name defined in >1 file ---
const DEF_RE = /(?:function|const|let|var|def|fn)\s+((?:format|mask|scope|parse|serialize|validate)[A-Z]\w*)/g;
function findDuplicateHelpers(root, files) {
  const byName = new Map();
  for (const f of files) {
    const raw = read(root, f);
    const content = stripNonCode(raw, f, false);
    const rawLines = raw.split('\n');
    let m;
    DEF_RE.lastIndex = 0;
    const seenHere = new Set();
    while ((m = DEF_RE.exec(content))) {
      const name = m[1];
      const line = lineAt(content, m.index);
      const text = (rawLines[line - 1] || '').trim();
      if (text.includes(ALLOW)) continue;
      const key = `${f}:${name}`;
      if (seenHere.has(key)) continue; // count a name once per file
      seenHere.add(key);
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push({ file: f, line });
    }
  }
  const out = [];
  for (const [name, locs] of byName) {
    if (locs.length > 1) out.push({ name, locs });
  }
  return out;
}

function skipped() {
  return new Set(
    String(process.env.GUARDRAILS_SKIP || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/** Run all checks. Returns { blocking: [...msgs], warnings: [...msgs] }. */
function run(root) {
  const skip = skipped();
  const files = listSourceFiles(root);
  const blocking = [];
  const warnings = [];

  if (!skip.has('catch')) {
    for (const h of findSwallowedCatches(root, files)) {
      blocking.push(`${h.file}:${h.line}: swallowed error — ${h.text}`);
    }
  }
  if (!skip.has('cycles')) {
    const cycle = findCycles(root, files);
    if (cycle) blocking.push(`cyclic import: ${cycle.join(' → ')}`);
  }
  if (!skip.has('size')) {
    for (const h of findLargeFiles(root, files)) {
      warnings.push(`${h.file}: ${h.lines} lines (>500) — consider decomposing`);
    }
  }
  if (!skip.has('query')) {
    for (const h of findUnboundedQueries(root, files)) {
      warnings.push(`${h.file}:${h.line}: findMany without take/limit — ${h.text}`);
    }
  }
  if (!skip.has('dup')) {
    for (const h of findDuplicateHelpers(root, files)) {
      warnings.push(`duplicate helper "${h.name}" in ${h.locs.map((l) => `${l.file}:${l.line}`).join(', ')}`);
    }
  }
  return { blocking, warnings };
}

function main() {
  const root = process.argv[2] || process.cwd();
  let result;
  try {
    result = run(root);
  } catch (err) {
    // Fail open: a crash here must not block every commit.
    process.stderr.write(`guardrails repo-checks: internal error, skipping (${err && err.message})\n`);
    process.exit(0);
  }
  for (const w of result.warnings) process.stderr.write(`guardrails ⚠ ${w}\n`);
  if (result.blocking.length) {
    process.stderr.write('\nguardrails ✖ commit blocked — fix or annotate with `guardrails-ok: <why>`:\n');
    for (const b of result.blocking) process.stderr.write(`  ${b}\n`);
    process.stderr.write('  (disable a check for one commit: GUARDRAILS_SKIP=cycles,catch,size,query,dup)\n');
    process.exit(1);
  }
  process.exit(0);
}

module.exports = {
  listSourceFiles,
  findSwallowedCatches,
  findCycles,
  findLargeFiles,
  findUnboundedQueries,
  findDuplicateHelpers,
  run,
};

if (require.main === module) main();
