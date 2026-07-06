# guardrails

**Review skills fix defects after they're written — expensive and late. guardrails moves that
knowledge to write time, so code is right from commit 1.** A Claude Code plugin that injects a
short security/performance/architecture digest at the moment you edit a file, ships per-stack lint
gates that fail on the recurring defect classes, and maintains a per-project invariant ledger. It
distills the essence of the review skills (security-review, thermo-nuclear, improve,
codebase-design, security-bounty-hunter, impeccable, diagnosing-bugs) into prevention.

Portable and multi-stack: install it in any repo (Next.js, Node/TS, Python, or a bare directory)
and get the guardrails from the first commit — no per-project rewriting.

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

Hook-injected digests (by detected file area): `backend-api`, `data-query`, `frontend-ui`,
`tests`, `schema`. Skill-referenced digests (surfaced at intent time, not file-detectable):
`architecture`, `performance`, `error-handling`.

Skills: `init-guards`, `secure-endpoint`, `efficient-query`, `solid-tests`, `kill-the-class`.

Stacks in v1: `ts-node`, `nextjs`, `generic` (ledger + pre-commit + secret scan). Python/Go/Rust
detect correctly and get the generic scaffold; full lint adapters are future work.

## Install

See [INSTALL.md](INSTALL.md).
