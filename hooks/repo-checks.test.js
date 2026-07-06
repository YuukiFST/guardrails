'use strict';
/**
 * Unit tests for repo-checks (the repo-wide pre-commit checks). Builds throwaway fixture
 * dirs under os.tmpdir (no git — listSourceFiles falls back to a filesystem walk). No deps.
 * Run: node --test hooks/*.test.js
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  listSourceFiles,
  findSwallowedCatches,
  findCycles,
  findLargeFiles,
  findUnboundedQueries,
  findDuplicateHelpers,
} = require('./repo-checks.js');

let counter = 0;
function fixture(fileMap) {
  const dir = path.join(os.tmpdir(), `guardrails-rc-${process.pid}-${counter++}`);
  fs.mkdirSync(dir, { recursive: true });
  for (const [rel, content] of Object.entries(fileMap)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

// --- swallowed catch ---

test('empty JS catch is flagged', () => {
  const root = fixture({ 'a.ts': 'try { f() } catch {}\n' });
  const hits = findSwallowedCatches(root, listSourceFiles(root));
  assert.strictEqual(hits.length, 1);
  assert.strictEqual(hits[0].line, 1);
});

test('.catch(() => null) is flagged', () => {
  const root = fixture({ 'a.js': 'p.catch(() => null)\n' });
  assert.strictEqual(findSwallowedCatches(root, listSourceFiles(root)).length, 1);
});

test('python except: pass is flagged', () => {
  const root = fixture({ 'a.py': 'try:\n    f()\nexcept:\n    pass\n' });
  assert.strictEqual(findSwallowedCatches(root, listSourceFiles(root)).length, 1);
});

test('zig catch unreachable is flagged', () => {
  const root = fixture({ 'a.zig': 'const v = f() catch unreachable;\n' });
  assert.strictEqual(findSwallowedCatches(root, listSourceFiles(root)).length, 1);
});

test('a real catch that logs is NOT flagged', () => {
  const root = fixture({ 'a.ts': 'try { f() } catch (e) { logger.error(e); throw e; }\n' });
  assert.strictEqual(findSwallowedCatches(root, listSourceFiles(root)).length, 0);
});

test('guardrails-ok on the catch line skips it', () => {
  const root = fixture({ 'a.ts': 'try { f() } catch {} // guardrails-ok: nothing to do\n' });
  assert.strictEqual(findSwallowedCatches(root, listSourceFiles(root)).length, 0);
});

test('catch {} inside a line comment is NOT flagged', () => {
  const root = fixture({ 'a.ts': '// example of a bad pattern: catch {}\nconst x = 1;\n' });
  assert.strictEqual(findSwallowedCatches(root, listSourceFiles(root)).length, 0);
});

test('catch {} inside a string literal is NOT flagged', () => {
  const root = fixture({ 'a.ts': "const msg = 'do not write catch {} here';\n" });
  assert.strictEqual(findSwallowedCatches(root, listSourceFiles(root)).length, 0);
});

test('catch unreachable in a block comment is NOT flagged', () => {
  const root = fixture({ 'a.zig': '// a note: catch unreachable is banned\nconst v = f() catch unreachable;\n' });
  const hits = findSwallowedCatches(root, listSourceFiles(root));
  assert.strictEqual(hits.length, 1);
  assert.strictEqual(hits[0].line, 2); // only the real one on line 2
});

test('a real catch is still flagged even with a nearby comment', () => {
  const root = fixture({ 'a.ts': '// ok\ntry { f() } catch {}\n' });
  assert.strictEqual(findSwallowedCatches(root, listSourceFiles(root)).length, 1);
});

test('catch with a comment-only body is documented intent → NOT flagged', () => {
  const root = fixture({ 'a.ts': 'try { f() } catch {\n  // best-effort, never throw\n}\n' });
  assert.strictEqual(findSwallowedCatches(root, listSourceFiles(root)).length, 0);
});

// --- cyclic import ---

test('A→B→A is reported as a cycle', () => {
  const root = fixture({
    'a.ts': "import { b } from './b';\nexport const a = 1;\n",
    'b.ts': "import { a } from './a';\nexport const b = 2;\n",
  });
  const cycle = findCycles(root, listSourceFiles(root));
  assert.ok(cycle, 'expected a cycle');
  assert.ok(cycle.length >= 2);
});

test('bare side-effect import cycle A→B→A is detected', () => {
  const root = fixture({
    'a.ts': "import './b';\nexport const a = 1;\n",
    'b.ts': "import './a';\nexport const b = 2;\n",
  });
  const cycle = findCycles(root, listSourceFiles(root));
  assert.ok(cycle, 'expected a bare-import cycle');
  assert.ok(cycle.length >= 2);
});

test('acyclic A→B→C is not a cycle', () => {
  const root = fixture({
    'a.ts': "import './b';\n",
    'b.ts': "import './c';\n",
    'c.ts': 'export const c = 3;\n',
  });
  assert.strictEqual(findCycles(root, listSourceFiles(root)), null);
});

test('guardrails-ok on an import line breaks the cycle detection', () => {
  const root = fixture({
    'a.ts': "import { b } from './b';\n",
    'b.ts': "import { a } from './a'; // guardrails-ok: intentional\n",
  });
  assert.strictEqual(findCycles(root, listSourceFiles(root)), null);
});

// --- large file ---

test('file over 500 lines warns', () => {
  const root = fixture({ 'big.ts': 'const x = 1;\n'.repeat(501) });
  const hits = findLargeFiles(root, listSourceFiles(root));
  assert.strictEqual(hits.length, 1);
});

test('small file does not warn', () => {
  const root = fixture({ 'small.ts': 'const x = 1;\n'.repeat(10) });
  assert.strictEqual(findLargeFiles(root, listSourceFiles(root)).length, 0);
});

// --- unbounded query ---

test('findMany without take warns', () => {
  const root = fixture({ 'q.ts': 'const r = await prisma.user.findMany({ where: { active: true } });\n' });
  assert.strictEqual(findUnboundedQueries(root, listSourceFiles(root)).length, 1);
});

test('findMany with take does not warn', () => {
  const root = fixture({ 'q.ts': 'const r = await prisma.user.findMany({ where: {}, take: 50 });\n' });
  assert.strictEqual(findUnboundedQueries(root, listSourceFiles(root)).length, 0);
});

// --- duplicate helper ---

test('formatMoney defined in two files warns', () => {
  const root = fixture({
    'a.ts': 'export function formatMoney(n) { return n; }\n',
    'b.ts': 'const formatMoney = (n) => n;\n',
  });
  const hits = findDuplicateHelpers(root, listSourceFiles(root));
  assert.strictEqual(hits.length, 1);
  assert.strictEqual(hits[0].name, 'formatMoney');
});

test('a helper defined once does not warn', () => {
  const root = fixture({ 'a.ts': 'export function formatMoney(n) { return n; }\n' });
  assert.strictEqual(findDuplicateHelpers(root, listSourceFiles(root)).length, 0);
});
