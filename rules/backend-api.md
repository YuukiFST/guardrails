[write-time · backend/endpoint — authz, input, errors, atomicity]

Each line: rule — why — minimal example. This is the stack-agnostic frame; the
project overlay (.guardrails/backend-api.md) names your real helpers.

• Authz by-id loads the record ALREADY scoped to the owner, not just by id — a role
  check is not an ownership check; id-only lookup = IDOR (any user edits another's row).
  Bad: `findById(id)` then act. Good: `findOne({ id, ownerId: ctx.userId })`.
• Identity comes from the session/context, never from client input — userId/ownerId/role
  in the body lets the caller impersonate. Whitelist write fields; never spread raw input.
  Bad: `create({ ...body })`. Good: `create({ title: body.title, ownerId: ctx.userId })`.
• Validate every external input at the trust boundary — parse with a schema, reject
  unknown/oversized; unvalidated input is the root of injection & corruption.
• Parameterized queries only — never build SQL by string concat; that is SQLi.
  Bad: `"WHERE name='"+n+"'"`. Good: parameter binding / ORM.
• No swallowed errors — a bare catch that returns null hides real failures.
  Bad: `catch {}` / `catch { return null }`. Good: log structured + rethrow or typed error.
• Typed error with a code out of the boundary; the 500 path logs before it responds
  (`{ route, id, err }`) so a real storage/DB failure is never traceless.
• Related writes in ONE transaction (atomic) — a partial write leaves corrupt state.
  Side effects (audit/notify/file cleanup) run AFTER commit, best-effort in a try/catch
  that LOGS and does NOT propagate — never `catch(() => {})`.
• Secrets & PII: never hardcode a secret, never log tokens/passwords/PII, never send a
  sensitive field to a client that doesn't render it.
• Auth + rate limit on every endpoint that mutates or exposes data — an unauthenticated
  mutation or unbounded endpoint is a live hole.

Close: type-check + run the tests that cover this; a NEW mutation gets an IDOR/negative-
scope test. Money/auth/integrity change → adversarial pass (try to REFUTE it).
