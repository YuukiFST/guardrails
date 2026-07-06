[write-time · error handling — never silent, never lossy]

Each line: rule — why. Project overlay names your logger & error types.

• A catch never swallows — no `catch {}`, `catch(() => null)`, or silent fallback. It logs
  with context and rethrows or returns a typed error. This is the class that "disappears and
  reappears" — a swallowed error is a bug you'll debug blind later.
• Log structured, with fields — `{ op, id, err }`, not a bare string; you filter and correlate
  fields, not prose.
• Fail fast at the boundary, recover deliberately inside — validate input up front and reject;
  don't let a bad value flow three layers deep to crash somewhere unrelated.
• Related writes are atomic — wrap in a transaction; on failure the whole thing rolls back. A
  half-applied multi-write leaves corrupt state that's worse than the original error.
• Post-commit side effects (audit, notify, cleanup) are best-effort AFTER the main write, in a
  try/catch that LOGS and does NOT propagate — a failed notification must not undo a saved order,
  but a silent failed cleanup leaves orphans nobody sees.
• Handle partial failure explicitly in batch/parallel work — `allSettled` and report the losers;
  don't let one rejection drop the rest or hide which item failed.
• Error messages to the user are actionable and leak nothing — no stack trace, secret, or SQL
  to the client; the detail goes to the log.
• Every incident becomes a permanent sensor — a prod error or data drift gets a regression test
  and a ledger line, same cycle, so the class can't silently return.

Close: the error path has a test; grep the diff for bare catches before you close.
