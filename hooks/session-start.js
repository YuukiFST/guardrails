#!/usr/bin/env node
'use strict';
/**
 * SessionStart hook — activates the write-time discipline in EVERY session.
 *
 * Injects a portable "definition of done" checklist as additionalContext at session
 * start (startup/resume/clear/compact), so the discipline is live from message 1 —
 * without depending on the agent choosing to re-read a rules file. Also points at the
 * project's own ledger (.guardrails/GUARDRAILS.md) when init-guards has created one.
 *
 * Robust by design: NEVER throws, ALWAYS exits 0. A SessionStart hook that fails must
 * not block the session from opening. On any error, injects nothing.
 */

const fs = require('node:fs');
const path = require('node:path');

const BASE = [
  '[guardrails · write-time discipline ACTIVE]',
  'Definition of done for ANY code change (compiling is not enough):',
  '• Type-check/build clean + run the tests that cover what you touched.',
  '• Scan the diff against the project invariant ledger (.guardrails/GUARDRAILS.md if present):',
  '   auth/scope (IDOR) · atomic writes · no swallowed errors · FK/identity from ctx not input · no PII in payload.',
  '• Money/auth/data-integrity change → ADVERSARIAL check: try to REFUTE the change, not confirm it.',
  '• Fix the CLASS, not the instance: grep siblings of the same pattern → fix all → strengthen the guard',
  '   (reviewer → test → lint) → record the line in the ledger, same commit.',
  '• Every incident (prod error · data drift · owner course-correction) becomes a permanent sensor (test + ledger line).',
].join('\n');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

try {
  const payload = JSON.parse(readStdin() || '{}');
  const projectDir = String((payload && payload.cwd) || process.cwd());
  let context = BASE;
  try {
    fs.accessSync(path.join(projectDir, '.guardrails', 'GUARDRAILS.md'));
    context += '\n• This project has .guardrails/GUARDRAILS.md — read it before touching a guarded area.';
  } catch {
    context += '\n• No .guardrails/ yet — run /guardrails:init-guards to generate the ledger + per-stack gates.';
  }
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: context,
      },
    }),
  );
} catch {
  // best-effort: never blocks the session.
}
process.exit(0);
