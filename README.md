# guardrails

**Review skills fix defects after they're written — expensive and late. guardrails moves that
knowledge to write time, so code is right from commit 1.** A Claude Code plugin that injects a
short security/performance/architecture digest at the moment you edit a file, ships lint gates
that fail on the recurring defect classes, and maintains a per-project invariant ledger. It
distills ~40-50 write-time invariants from the review skills into prevention.

Portable and multi-stack: install it in any repo (Next.js, Node/TS, Python, Go, Rust, or a bare
directory) and get the guardrails from the first commit — no per-project rewriting.

## Scope — the goal is that review finds nothing

The declared goal: make the review skills (`/improve`, `/autoreview`, `/thermo-nuclear`,
`/codebase-design`, `/security-review`) **come up empty** on known defect classes — because the
code was written right from commit 1. If a review skill says "check that X is present", the agent
never has to fix it, because the write-time digest and the gate never let X be absent. Scope is
**clean code, performance, security** — not UI/UX (no design/motion/UX auditing is distilled).

Every known class is prevented at one of two altitudes. The write-time hook sees one file; the
pre-commit `repo-checks.js` sees the whole repo — together they cover both per-file and cross-file:

| Class | Prevented by |
|---|---|
| IDOR/scope, identity-from-input, mass assignment, missing authz | `backend-api` digest + `secure-endpoint` skill + lint (ts/py/go) |
| Web-input attacks: SSRF, path traversal, open redirect, XXE, unsafe deserialize, upload, JWT alg-none, timing enum | `backend-api` digest (security residue of `/security-review`) |
| Swallowed / lossy errors | `error-handling` digest + lint + **repo-checks (blocks repo-wide)** |
| Non-atomic writes, post-commit side effects | `backend-api` + `error-handling` digests |
| Races, TOCTOU, idempotency, lock order, double-submit | `concurrency` digest (content-triggered) |
| Over-fetch, N+1, unbounded query | `data-query` + `performance` digests + **repo-checks (unbounded findMany)** |
| Cyclic import | **repo-checks (blocks)** — tsc doesn't catch it |
| Duplicate helper (invariant drift) | **repo-checks (warns)** + `architecture` digest |
| Giant file / shallow module | `architecture` digest + `design-module` skill + **repo-checks (size warn)** |
| Hardcoded colors, missing loading state, wrong Select | `frontend-ui` digest + lint (reuse/tokens only — no UX audit) |

**Honest residue** — what no mechanical gate expresses, so a review skill still earns its keep:
whole-system judgment that needs reading the whole codebase with intent — is this module actually
shallow, is this the right roadmap/priority, is this abstraction worth its weight. In code written
under the plugin, what's left for review to find should tend to zero on the classes above; the
residue is the small, genuinely-judgment part.

## How it works

1. **SessionStart** injects the "definition of done" discipline, so it's live from message 1.
2. **On every edit**, a PostToolUse hook classifies the file's area (backend / data-query /
   frontend-ui / tests / schema) and injects that area's digest once per session. The digest is a
   merge of the plugin's stack-agnostic frame + the project's own `.guardrails/<area>.md` overlay —
   the overlay (naming your real helpers) is what carries the strong signal.
3. **`/guardrails:init-guards`** detects the stack and generates the project half: the invariant
   ledger, a per-stack lint gate (bans mass-assignment, swallowed catches, `any`, hardcoded
   colors), a pre-commit gate, and the overlay stubs you then fill with real project names.
4. **The pre-commit runs `repo-checks.js`** after the gate — the cross-file classes the write-time
   hook can't see: cyclic import and swallowed catch **block** the commit (with `file:line`), while
   large file / unbounded `findMany` / duplicate helper **warn**. Zero deps; per-line
   `guardrails-ok:` and per-check `GUARDRAILS_SKIP=` escapes.
5. **A commit gate** (block-no-verify) stops `--no-verify` / `core.hooksPath` bypasses.
6. **Bug fixes** run the `kill-the-class` ritual: grep siblings → fix all → strengthen the guard →
   record it in the ledger, so the class can't silently return.

## Coverage

Hook-injected digests by detected file area: `backend-api`, `data-query`, `frontend-ui`, `tests`,
`schema`. Three more inject on **content triggers** (they have no natural file area):
`error-handling` (a `catch`/`except`/`if err != nil`/`errdefer` in the edit), `performance` (a loop
doing per-iteration I/O), and `concurrency` (threads/tasks/locks/`Promise.all`). `architecture` is a
design decision with no file trigger — the SessionStart checklist names its core rule and the
`design-module` skill loads the full digest when you create/split a module.

Repo-wide pre-commit checks (`repo-checks.js`, cross-file): cyclic import & swallowed catch
(**block**), large file / unbounded `findMany` / duplicate helper (**warn**).

Skills: `init-guards`, `secure-endpoint`, `efficient-query`, `solid-tests`, `kill-the-class`,
`design-module`.

Per-stack lint gates: `ts-node` / `nextjs` (eslint: mass-assignment, swallowed catch, `any`,
hardcoded Tailwind colors), `python` (ruff: bandit S / blind-except / bare-except), `go`
(golangci-lint: errcheck / gosec / rowserrcheck / sqlclosecheck / noctx), `rust` (clippy:
unwrap/expect/indexing), `zig` (`zig fmt --check` + `zig build test` + a grep-gate for
`catch unreachable`/`catch {}`, since no third-party linter is installed). `generic` gets the
ledger + pre-commit + secret scan only. Every stack gets a per-stack default pre-commit GATE, the
repo-wide checks, and the invariant ledger.

## Install

See [INSTALL.md](INSTALL.md).
