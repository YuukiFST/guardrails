[write-time · concurrency — races, idempotency, ordering]

Each line: rule — why. Fires when the edit touches threads/tasks/locks/parallel work.

• Shared mutable state crossing tasks/threads needs a lock or an atomic — an unguarded
  read-modify-write (`x = x + 1`, check-then-set) races and corrupts under load.
• Check-then-act is a TOCTOU bug — the state can change between the check and the act.
  Bad: `if (!exists) create()`. Good: atomic upsert / unique constraint / `create ... on conflict`.
• Make mutations idempotent — a retried/double-clicked request must not double-charge or
  double-insert. Use an idempotency key or a unique key the DB enforces, not app-side dedup.
• Guard double-submit at the boundary — disable the button AND enforce uniqueness server-side;
  client guards alone lose the race.
• Acquire locks in ONE global order everywhere — inconsistent lock order deadlocks. Prefer one
  lock, or a documented ordering; hold locks for the shortest span, never across an await/IO.
• Don't await/block while holding a lock — you serialize every caller and can deadlock; copy
  what you need, release, then do the slow work.
• Parallel work handles partial failure — `Promise.allSettled` / `errgroup` / `join_all` and
  report the losers; one rejection must not silently drop the rest.
• Bound concurrency — an unbounded fan-out (`Promise.all` over N thousand) exhausts connections/
  memory; cap with a pool/semaphore.
• Cancellation & cleanup on every path — a spawned task/goroutine has an owner that joins or
  cancels it; release resources in finally/defer even when a sibling fails.

Close: name what state is shared and what serializes it; a money/critical mutation gets an
idempotency guard and an adversarial "what if this runs twice concurrently" pass.
