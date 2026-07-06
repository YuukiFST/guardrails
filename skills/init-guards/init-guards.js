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

// Default pre-commit GATE per detected stack — the command that kills the ledger
// classes with the stack's native tools. Empty for generic (the template warns).
const GATE_DEFAULTS = {
  nextjs: 'npx tsc --noEmit && npx eslint .',
  'ts-node': 'npx tsc --noEmit && npx eslint .',
  node: 'npx eslint .',
  python: 'ruff check . && pytest -q',
  go: 'go vet ./... && go test ./...',
  rust: 'cargo clippy -- -D warnings && cargo test',
  generic: '',
};

/** Write the pre-commit from the template with GATE_DEFAULT filled for this stack. */
function writePreCommit(templateSrc, dest, stack, created, skipped) {
  if (fs.existsSync(dest)) {
    skipped.push(path.basename(dest));
    return;
  }
  const gate = GATE_DEFAULTS[stack] || '';
  const tpl = fs.readFileSync(templateSrc, 'utf8');
  // Escape for a double-quoted bash assignment (backslash, ", $, backtick).
  const esc = gate.replace(/([\\"$`])/g, '\\$1');
  const filled = tpl.replace(/^GATE_DEFAULT=""$/m, `GATE_DEFAULT="${esc}"`);
  fs.writeFileSync(dest, filled);
  created.push(path.basename(dest));
}

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
  writePreCommit(path.join(PLUGIN_ROOT, 'templates', 'pre-commit'), path.join(dir, 'pre-commit'), info.stack, created, skipped);
  for (const [name, content] of Object.entries(OVERLAY_STUBS)) {
    writeIfAbsent(path.join(dir, name), content, created, skipped);
  }

  // Stack lint fragment. The "nextjs" fragment is really a Tailwind color-token gate —
  // ship it for any Tailwind project, not just Next.
  const nextSteps = [];
  const isJs = info.stack === 'ts-node' || info.stack === 'node' || info.stack === 'nextjs';
  const hasTailwind = info.stack === 'nextjs' || (info.frameworks || []).includes('tailwind');
  if (isJs && hasTailwind) {
    // ship both fragments; the project spreads ts-node then tailwind
    copyIfAbsent(path.join(PLUGIN_ROOT, 'stacks', 'ts-node', 'guardrails.eslint.mjs'), path.join(dir, 'guardrails.ts-node.eslint.mjs'), created, skipped);
    copyIfAbsent(path.join(PLUGIN_ROOT, 'stacks', 'nextjs', 'guardrails.eslint.mjs'), path.join(dir, 'guardrails.tailwind.eslint.mjs'), created, skipped);
    nextSteps.push('Spread the eslint fragments into your flat config: ...guardrailsTsNode then ...guardrailsTailwind. Confirm `npx eslint` is clean before committing.');
  } else if (isJs) {
    copyIfAbsent(path.join(PLUGIN_ROOT, 'stacks', 'ts-node', 'guardrails.eslint.mjs'), path.join(dir, 'guardrails.eslint.mjs'), created, skipped);
    nextSteps.push('Spread .guardrails/guardrails.eslint.mjs into your flat config. Confirm `npx eslint` is clean before committing.');
  } else if (info.stack === 'python') {
    copyIfAbsent(path.join(PLUGIN_ROOT, 'stacks', 'python', 'guardrails.ruff.toml'), path.join(dir, 'guardrails.ruff.toml'), created, skipped);
    nextSteps.push('Merge .guardrails/guardrails.ruff.toml into your ruff config (ruff.toml or [tool.ruff.lint]). Gate: `ruff check . && pytest -q`.');
  } else if (info.stack === 'go') {
    copyIfAbsent(path.join(PLUGIN_ROOT, 'stacks', 'go', 'guardrails.golangci.yml'), path.join(dir, 'guardrails.golangci.yml'), created, skipped);
    nextSteps.push('Merge .guardrails/guardrails.golangci.yml into your .golangci.yml. Gate: `golangci-lint run ./...`.');
  } else if (info.stack === 'rust') {
    copyIfAbsent(path.join(PLUGIN_ROOT, 'stacks', 'rust', 'guardrails.clippy.toml'), path.join(dir, 'guardrails.clippy.toml'), created, skipped);
    copyIfAbsent(path.join(PLUGIN_ROOT, 'stacks', 'rust', 'guardrails-lints.rs'), path.join(dir, 'guardrails-lints.rs'), created, skipped);
    nextSteps.push('Copy the clippy.toml to your crate root and paste guardrails-lints.rs attrs into main.rs/lib.rs. Gate: `cargo clippy -- -D warnings && cargo test`.');
  } else {
    nextSteps.push('Generic stack: no lint fragment. Set GATE_DEFAULT in .guardrails/pre-commit to your check command.');
  }

  process.stdout.write(JSON.stringify({ stack: info.stack, frameworks: info.frameworks, created, skipped, next_steps: nextSteps }, null, 2) + '\n');
}

main();
