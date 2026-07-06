---
name: solid-tests
description: Intent-time checklist for writing tests for a service, function, or endpoint. Use BEFORE or while writing tests, adding coverage, or backfilling a test suite. Covers behavior-over-implementation, no self-mocking, happy+error paths, negative/IDOR tests, exact assertions, determinism, regression tests for bug fixes.
---

# solid-tests

Apply the tests digest — canonical checklist in `rules/tests.md` in this plugin, project
runner/mock conventions in `.guardrails/tests.md` after init-guards. Read both, then write.

Before you close:

- Test behavior through the public interface, not internals. Never mock the thing under test.
- One happy path + one error path minimum. Scoped unit → a negative/IDOR test.
- Assert exact values, not truthiness. Deterministic — no real clock/random/network/shared state.
- Bug fix → a regression test that fails before the fix and passes after.
- Cover the boundaries (empty/null/zero/negative/max/duplicate).
- Sanity: break the code on purpose — if the test still passes, it tests nothing.
