#!/usr/bin/env node
'use strict';
/**
 * guardrails:init-guards bootstrap — scaffolds project-local guards.
 *
 * Idempotent: never clobbers a file that already exists (so agent-enriched overlays
 * and a hand-edited ledger survive re-runs). Reports created vs skipped.
 *
 * Usage: node init-guards.js [projectDir]
 *
 * Creates in <projectDir>:
 *   .guardrails/GUARDRAILS.md          — invariant ledger (from template)
 *   .guardrails/backend-api.md         — overlay stub (agent fills real helper names)
 *   .guardrails/data-query.md          — overlay stub
 *   .guardrails/frontend-ui.md         — overlay stub
 *   .guardrails/tests.md               — overlay stub
 *   .guardrails/pre-commit             — gate + secret scan (from template)
 *   .guardrails/guardrails.eslint.mjs  — stack lint fragment (ts/next only)
 * The mechanical scaffold is deterministic; the project-aware content is left for the
 * agent to fill (see SKILL.md) — that overlay is what carries the real signal.
 */

const fs = require('node:fs');
const path = require('node:path');
const { detect } = require('../../stacks/detect.js');

const PLUGIN_ROOT = path.resolve(__dirname, '..', '..');

const OVERLAY_STUBS = {
  'backend-api.md':
    '# project overlay · backend-api\n' +
    '# Fill with THIS project\'s canonical names so the write-time digest names real code:\n' +
    '# • scope/ownership helper (e.g. scopeUserWhere(ctx)) — where by-id reads/writes get filtered\n' +
    '# • where identity comes from (ctx/session field) and the field-whitelist convention\n' +
    '# • typed-error type + logger call, and the transaction wrapper\n' +
    '# Delete this comment as you fill it. Empty overlay = base frame only.\n',
  'data-query.md':
    '# project overlay · data-query\n' +
    '# Fill with: the ORM/query builder, the list-query convention (select shape, take/limit,\n' +
    '# count-in-db helper), and the soft-delete filter this project uses.\n',
  'frontend-ui.md':
    '# project overlay · frontend-ui\n' +
    '# Fill with: the design-token names, shared components to reuse, the Select/Combobox\n' +
    '# rule, navigation/link convention, and the loading-state convention.\n',
  'tests.md':
    '# project overlay · tests\n' +
    '# Fill with: the test runner + command, the fake/mock convention, and the\n' +
    '# co-location convention for this project.\n',
};

function copyIfAbsent(src, dest, created, skipped) {
  if (fs.existsSync(dest)) {
    skipped.push(path.basename(dest));
    return;
  }
  fs.copyFileSync(src, dest);
  created.push(path.basename(dest));
}

function writeIfAbsent(dest, content, created, skipped) {
  if (fs.existsSync(dest)) {
    skipped.push(path.basename(dest));
    return;
  }
  fs.writeFileSync(dest, content);
  created.push(path.basename(dest));
}

function main() {
  const projectDir = process.argv[2] || process.cwd();
  const info = detect(projectDir);
  const dir = path.join(projectDir, '.guardrails');
  fs.mkdirSync(dir, { recursive: true });

  const created = [];
  const skipped = [];

  copyIfAbsent(path.join(PLUGIN_ROOT, 'templates', 'GUARDRAILS.md'), path.join(dir, 'GUARDRAILS.md'), created, skipped);
  copyIfAbsent(path.join(PLUGIN_ROOT, 'templates', 'pre-commit'), path.join(dir, 'pre-commit'), created, skipped);
  for (const [name, content] of Object.entries(OVERLAY_STUBS)) {
    writeIfAbsent(path.join(dir, name), content, created, skipped);
  }

  // Stack lint fragment (ts/next only; other stacks scaffold ledger + pre-commit only).
  if (info.stack === 'ts-node' || info.stack === 'node') {
    copyIfAbsent(path.join(PLUGIN_ROOT, 'stacks', 'ts-node', 'guardrails.eslint.mjs'), path.join(dir, 'guardrails.eslint.mjs'), created, skipped);
  } else if (info.stack === 'nextjs') {
    // ship both fragments; the project spreads ts-node then nextjs
    copyIfAbsent(path.join(PLUGIN_ROOT, 'stacks', 'ts-node', 'guardrails.eslint.mjs'), path.join(dir, 'guardrails.ts-node.eslint.mjs'), created, skipped);
    copyIfAbsent(path.join(PLUGIN_ROOT, 'stacks', 'nextjs', 'guardrails.eslint.mjs'), path.join(dir, 'guardrails.nextjs.eslint.mjs'), created, skipped);
  }

  process.stdout.write(JSON.stringify({ stack: info.stack, frameworks: info.frameworks, created, skipped }, null, 2) + '\n');
}

main();
