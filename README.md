# guardrails

**Review skills fix defects after they're written — expensive and late. guardrails moves that
knowledge to write time, so code is right from commit 1.** A Claude Code plugin that injects a
short security/performance/architecture digest at the moment you edit a file, ships lint gates
that fail on the recurring defect classes, and maintains a per-project invariant ledger. It
distills ~40-50 write-time invariants from the review skills into prevention.

Portable and multi-stack: install it in any repo (Next.js, Node/TS, Python, Go, Rust, or a bare
directory) and get the guardrails from the first commit — no per-project rewriting.

## Scope — complement to the review skills, not a replacement

guardrails **reduces** how much the review skills have to catch (the ~40-50 invariants below are
prevented at write time), but it does **not** replace them. It only ever sees the single file being
edited — it can't do diff-aware or whole-codebase reasoning. Keep running the review skills:

| guardrails prevents (write time) | still needs a review skill |
|---|---|
| The recurring per-file invariants: IDOR/scope, identity-from-input, swallowed errors, non-atomic writes, mass assignment, over-fetch, hardcoded colors, missing loading state | Whole-codebase audit + prioritized plan → **/improve** |
| Named defect classes flagged as you type | Diff-aware review (what changed vs what existed) → **/autoreview** |
| Lint gate that fails the commit on those classes | Adversarial audit of a real diff — races, idempotency, leaks → **/thermo-nuclear** |
| A digest reminding you of deep-module rules | Exploring the whole system for shallow modules → **/codebase-design**, **/improve-codebase-architecture** |

Prevention catches the classes it knows about in the file you touch; review catches everything
prevention can't see. Use both.

## How it works

1. **SessionStart** injects the "definition of done" discipline, so it's live from message 1.
2. **On every edit**, a PostToolUse hook classifies the file's area (backend / data-query /
   frontend-ui / tests / schema) and injects that area's digest once per session. The digest is a
   merge of the plugin's stack-agnostic frame + the project's own `.guardrails/<area>.md` overlay —
   the overlay (naming your real helpers) is what carries the strong signal.
3. **`/guardrails:init-guards`** detects the stack and generates the project half: the invariant
   ledger, a per-stack lint gate (bans mass-assignment, swallowed catches, `any`, hardcoded
   colors), a pre-commit gate, and the overlay stubs you then fill with real project names.
4. **A commit gate** (block-no-verify) stops `--no-verify` / `core.hooksPath` bypasses.
5. **Bug fixes** run the `kill-the-class` ritual: grep siblings → fix all → strengthen the guard →
   record it in the ledger, so the class can't silently return.

## Coverage

Hook-injected digests by detected file area: `backend-api`, `data-query`, `frontend-ui`, `tests`,
`schema`. Two more inject on **content triggers** (they have no natural file area): `error-handling`
(a `catch`/`except`/`if err != nil` in the edit) and `performance` (a loop doing per-iteration I/O).
`architecture` is a design decision with no file trigger — the SessionStart checklist names its
core rule and the `design-module` skill loads the full digest when you create/split a module.

Skills: `init-guards`, `secure-endpoint`, `efficient-query`, `solid-tests`, `kill-the-class`,
`design-module`.

Per-stack lint gates: `ts-node` / `nextjs` (eslint: mass-assignment, swallowed catch, `any`,
hardcoded Tailwind colors), `python` (ruff: bandit S / blind-except / bare-except), `go`
(golangci-lint: errcheck / gosec / rowserrcheck / sqlclosecheck / noctx), `rust` (clippy:
unwrap/expect/indexing). `generic` gets the ledger + pre-commit + secret scan only. Every stack
gets a per-stack default pre-commit GATE and the invariant ledger.

## Install

See [INSTALL.md](INSTALL.md).
