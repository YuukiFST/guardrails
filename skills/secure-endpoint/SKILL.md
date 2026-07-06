---
name: secure-endpoint
description: Intent-time checklist for creating or changing an endpoint, route handler, tRPC procedure, or any server-side mutation. Use BEFORE writing the handler, when adding an API route, procedure, controller action, or auth/permission logic. Covers authz/scope (IDOR), identity-from-context, input validation, typed errors, atomicity, secrets/PII.
---

# secure-endpoint

Apply the backend digest — the canonical checklist lives in `rules/backend-api.md` in this
plugin and, if the project ran init-guards, its real helper names are in
`.guardrails/backend-api.md`. Read both, then build.

Non-negotiables before you close:

- Authz by-id loads the record already scoped to the owner (role check ≠ ownership check).
- Identity comes from context/session, never from the request body; whitelist write fields.
- Every external input is validated at the boundary.
- Errors are typed and never swallowed; the 500 path logs before responding.
- Related writes are atomic; post-commit side effects are best-effort and logged.
- No secret hardcoded; no PII logged or sent to a client that doesn't render it.
- A new mutation gets a negative/IDOR test. Money/auth/integrity change → adversarial pass.
