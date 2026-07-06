'use strict';
/**
 * Unit tests for the write-time-guard classifier (areaFor) and payload reader
 * (readContent). Node built-in runner only — `node --test hooks/`. No deps.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { areaFor, contentAreas, allAreasFor, readContent } = require('./write-time-guard.js');

// --- areaFor: PATH-based backend/data (snippet has no keyword) ---

test('service .ts in src/server/ → backend-api even without keyword', () => {
  assert.strictEqual(areaFor('src/server/services/contatoService.ts', 'return doStuff();'), 'backend-api');
});

test('.ts in models/ → data-query by path', () => {
  assert.strictEqual(areaFor('src/models/user.ts', 'export type User = {};'), 'data-query');
});

test('.go in db/ → data-query by path', () => {
  assert.strictEqual(areaFor('internal/db/store.go', 'package db'), 'data-query');
});

// --- areaFor: Rust ---

test('Rust axum handler → backend-api', () => {
  const c = 'use axum::Router;\nasync fn create(req: Request) -> Response { }';
  assert.strictEqual(areaFor('src/lib.rs', c), 'backend-api');
});

test('Rust sqlx query → data-query', () => {
  assert.strictEqual(areaFor('src/lib.rs', 'let rows = sqlx::query!("select 1").fetch_all(&pool);'), 'data-query');
});

// --- areaFor: Go ---

test('Go gin handler → backend-api', () => {
  assert.strictEqual(areaFor('handler.go', 'func h(c *gin.Context) { c.JSON(200, nil) }'), 'backend-api');
});

test('Go gorm access → data-query', () => {
  assert.strictEqual(areaFor('store.go', 'db.gorm.Find(&users)'), 'data-query');
});

test('Go _test.go → tests', () => {
  assert.strictEqual(areaFor('handler_test.go', 'func TestX(t *testing.T){}'), 'tests');
});

// --- areaFor: CSS ---

test('.scss → frontend-ui', () => {
  assert.strictEqual(areaFor('styles/app.scss', '.x { color: red; }'), 'frontend-ui');
});

test('.css → frontend-ui', () => {
  assert.strictEqual(areaFor('app.css', 'body{}'), 'frontend-ui');
});

// --- areaFor: existing behavior preserved ---

test('.tsx component → frontend-ui', () => {
  assert.strictEqual(areaFor('src/app/page.tsx', 'export default () => null;'), 'frontend-ui');
});

test('components/ui shadcn primitive → null', () => {
  assert.strictEqual(areaFor('src/components/ui/button.tsx', 'export const Button = () => null;'), null);
});

test('schema.prisma → schema', () => {
  assert.strictEqual(areaFor('prisma/schema.prisma', 'model X {}'), 'schema');
});

test('node_modules file → null', () => {
  assert.strictEqual(areaFor('node_modules/x/index.js', 'axum::Router'), null);
});

test('plain .md → null', () => {
  assert.strictEqual(areaFor('README.md', '# hi'), null);
});

// --- readContent: MultiEdit shape ---

test('readContent concatenates MultiEdit edits[].new_string', () => {
  const payload = { tool_input: { edits: [{ new_string: 'gin.Context' }, { new_string: 'router' }] } };
  const c = readContent(payload, 'x.go');
  assert.ok(c.includes('gin.Context'));
  assert.ok(c.includes('router'));
});

test('readContent prefers content, then new_string', () => {
  assert.strictEqual(readContent({ tool_input: { content: 'A' } }, 'x'), 'A');
  assert.strictEqual(readContent({ tool_input: { new_string: 'B' } }, 'x'), 'B');
});

test('MultiEdit backend classifies via concatenated content', () => {
  const payload = { tool_input: { file_path: 'x.go', edits: [{ new_string: 'func h(c *gin.Context){}' }] } };
  assert.strictEqual(areaFor('x.go', readContent(payload, 'x.go')), 'backend-api');
});

// --- contentAreas: cross-cutting error-handling / performance triggers ---

test('catch block triggers error-handling', () => {
  assert.deepStrictEqual(contentAreas('src/x.ts', 'try { a() } catch (e) { throw e }'), ['error-handling']);
});

test('go `if err != nil` triggers error-handling', () => {
  assert.ok(contentAreas('x.go', 'if err != nil { return err }').includes('error-handling'));
});

test('await inside for loop triggers performance', () => {
  const c = 'for (const id of ids) { await fetch(id); }';
  assert.ok(contentAreas('src/x.ts', c).includes('performance'));
});

test('while(true) triggers performance', () => {
  assert.ok(contentAreas('src/x.ts', 'while (true) { tick(); }').includes('performance'));
});

test('contentAreas ignores non-code files', () => {
  assert.deepStrictEqual(contentAreas('README.md', 'catch me'), []);
});

test('contentAreas ignores vendored code', () => {
  assert.deepStrictEqual(contentAreas('node_modules/x/i.js', 'catch (e) {}'), []);
});

// --- allAreasFor: primary + extras, deduped ---

test('backend service with a catch → both backend-api and error-handling', () => {
  const areas = allAreasFor('src/server/services/x.ts', 'export function f(){ try{a()}catch(e){log(e)} }');
  assert.deepStrictEqual(areas, ['backend-api', 'error-handling']);
});

test('plain util with no triggers → empty', () => {
  assert.deepStrictEqual(allAreasFor('src/lib/add.ts', 'export const add = (a,b)=>a+b;'), []);
});
