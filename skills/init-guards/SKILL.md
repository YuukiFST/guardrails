---
name: init-guards
description: Bootstrap guardrails in a project — detect the stack and generate the invariant ledger, per-stack lint gate, pre-commit, and project-aware write-time overlays. Use when setting up guardrails in a new or existing repo, or when asked to "init guardrails", "set up the ledger", or "add the write-time guards" to this project.
---

# init-guards

Bootstraps the project-local half of guardrails. The plugin ships the stack-agnostic
frame; this fills in **this project's** specifics — which is what carries the real signal.

## Steps

1. **Run the scaffold** (idempotent — never clobbers existing files). This SKILL.md lives at
   `<plugin-root>/skills/init-guards/SKILL.md`, so the script is next to it — resolve the plugin
   root from this file's path and run:
   ```
   node <plugin-root>/skills/init-guards/init-guards.js .
   ```
   (If `${CLAUDE_PLUGIN_ROOT}` is set in your environment it also works; don't depend on it.)
   It detects the stack and creates `.guardrails/`: `GUARDRAILS.md` (ledger), overlay
   stubs, `pre-commit`, and the stack lint fragment. It prints `{ stack, created, skipped, next_steps }`.

2. **Wire the lint gate** — the fragment for the detected stack (see the printed
   `next_steps`). Confirm the linter runs clean on current code before committing the rule.
   - **ts-node / node**: spread `.guardrails/guardrails.eslint.mjs` into the eslint flat
     config, scoped to the source glob:
     ```js
     import guardrails from './.guardrails/guardrails.eslint.mjs'
     export default [ ...existing, ...guardrails ]
     ```
   - **Tailwind (any JS stack, incl. next/remix/nuxt/sveltekit)**: import both
     `*.ts-node.*` then `*.tailwind.*` and spread in that order.
   - **python**: merge `.guardrails/guardrails.ruff.toml` into `ruff.toml` / `[tool.ruff.lint]`.
     Gate: `ruff check . && pytest -q`.
   - **go**: merge `.guardrails/guardrails.golangci.yml` into `.golangci.yml`.
     Gate: `golangci-lint run ./...`.
   - **rust**: copy `guardrails.clippy.toml` to the crate root and paste
     `guardrails-lints.rs` attrs into `main.rs`/`lib.rs`. Gate: `cargo clippy -- -D warnings && cargo test`.

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
