[write-time · tests — behavior, not tautology]

Each line: rule — why. Project overlay names your runner & mock convention.

• Test behavior through the public interface (the service/function/endpoint), not private
  internals — a test bound to implementation breaks on every refactor and proves nothing.
• Never mock the thing under test — mocking your own target makes the assertion tautological
  (green regardless of the code). Mock only external I/O, with a named fake.
• Minimum per unit: one happy path + one error path — the error branch is where bugs hide.
• A scoped/authorized unit gets a NEGATIVE test — assert user A cannot read/write B's data (IDOR).
• Assert exact values, not just truthiness — `toBe(3)` not `toBeTruthy()`; the latter passes on wrong output.
• Deterministic — no real clock, random, network, or shared state between tests; a flaky test is noise.
• Bug fix ships with a regression test that FAILS before the fix and passes after — that is
  the proof the fix works and the class stays dead.
• Cover the boundaries — empty, null, zero, negative, max, duplicate — not just the middle case.

Close: the test fails when you break the code (delete a line, flip a condition) — if it still
passes, it tests nothing.
