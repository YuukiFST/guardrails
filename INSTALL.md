# Install

## 1. Add the plugin to Claude Code

**From a local clone (dev):** add this repo as a marketplace and install the plugin.

```
/plugin marketplace add /absolute/path/to/guardrails
/plugin install guardrails@guardrails
```

**From git:** point the marketplace at the repo URL instead of the local path.

Restart the session (or `/clear`) so the SessionStart hook loads. You should see the
`[guardrails · write-time discipline ACTIVE]` context at session start.

## 2. Bootstrap a project

In the target repo, run the init skill:

```
/guardrails:init-guards
```

It detects the stack and creates `.guardrails/` (ledger, overlay stubs, pre-commit, lint
fragment). Then:

- **Wire the lint gate** (ts/next): spread `.guardrails/guardrails*.eslint.mjs` into the
  project's `eslint.config`. Confirm `npx eslint` is clean before committing the rule.
- **Wire the pre-commit**: set `git config core.hooksPath` to a dir containing the hook (or copy
  `.guardrails/pre-commit` to `.git/hooks/pre-commit`) and set its `GATE` to your check command.
- **Fill the overlays**: edit `.guardrails/*.md` to name your real helpers (scope function,
  logger, ORM conventions, design tokens, test runner). This is what makes the digests strong.
- **Fill the ledger coverage** in `.guardrails/GUARDRAILS.md`.

## 3. Verify

- New session in the project → `[guardrails …]` context appears and points at your ledger.
- Edit a backend file → the `backend-api` digest is injected once (not on the second edit).
- Attempt a commit with `--no-verify` → blocked.

## Requirements

- Node.js (the hooks and scripts are plain Node, no dependencies).
- Optional: `gitleaks` on PATH for the pre-commit secret scan (skipped if absent).
