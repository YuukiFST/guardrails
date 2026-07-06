---
name: init-guards
description: Bootstrap guardrails in a project — detect the stack and generate the invariant ledger, per-stack lint gate, pre-commit, and project-aware write-time overlays. Use when setting up guardrails in a new or existing repo, or when asked to "init guardrails", "set up the ledger", or "add the write-time guards" to this project.
---

# init-guards

Bootstraps the project-local half of guardrails. The plugin ships the stack-agnostic
frame; this fills in **this project's** specifics — which is what carries the real signal.

## Steps

1. **Run the scaffold** (idempotent — never clobbers existing files):
   ```
   node "${CLAUDE_PLUGIN_ROOT}/skills/init-guards/init-guards.js" .
   ```
   It detects the stack and creates `.guardrails/`: `GUARDRAILS.md` (ledger), overlay
   stubs, `pre-commit`, and the stack lint fragment. It prints `{ stack, created, skipped }`.

2. **Wire the lint gate** (ts/next only). Spread the fragment into the project's eslint
   flat config, scoped to the source glob:
   ```js
   import guardrails from './.guardrails/guardrails.eslint.mjs' // ts-node
   // nextjs: import both *.ts-node.* then *.nextjs.* and spread in that order
   export default [ ...existing, ...guardrails ]
   ```
   Confirm `npx eslint` still runs clean on current code before committing the rule.

3. **Wire the pre-commit**. Point git at it and set the gate command:
   ```
   git config core.hooksPath .githooks   # or install .guardrails/pre-commit as .git/hooks/pre-commit
   ```
   Edit `.guardrails/pre-commit` `GATE` to the project's real check (e.g. `npm run check`
   or `ruff check . && pytest -q`).

4. **Enrich the overlays** — the important step a script can't do. Open each
   `.guardrails/*.md` stub and replace the guidance comments with THIS project's real
   names: the scope/ownership helper, where identity comes from, the typed-error + logger,
   the ORM list-query convention, the design tokens, the test runner. Grep the codebase to
   find them; cite what you found. An empty overlay means the write-time hook injects only
   the generic frame — weaker.

5. **Fill the ledger coverage column** in `GUARDRAILS.md`: for each defect class, record
   the concrete guard now installed (lint rule, test file, reviewer). Add rows for classes
   specific to this project.

## Done when

`node .../init-guards.js .` printed the created files, the lint fragment is wired and runs
clean, the pre-commit gate is set, and at least `backend-api.md` + the ledger name real
project code (not the stub comments).
