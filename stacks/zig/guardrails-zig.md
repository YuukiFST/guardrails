# guardrails · Zig residue notes + grep-gate

Zig has no third-party linter in this kit (zlint would violate "never install"). Its
compiler + `zig fmt` already eliminate most classes by construction; what survives is
caught by a grep-gate in the pre-commit GATE. This file documents the residue and the guard.

## What Zig eliminates by construction (no guard needed)
- **Null deref**: no null — optionals (`?T`) must be unwrapped (`if (x) |v|`, `orelse`, `.?`).
- **Ignored errors**: an error union (`!T`) can't be dropped silently — you must `try`, `catch`,
  or handle it. The compiler fails on an unhandled error union.
- **Unused vars / imports**: compile error, not a lint.

## Residue — the classes that still bite (grep-gate these)
- `catch unreachable` / `catch {}` → the silent-panic / swallowed-error class (#5). `catch
  unreachable` turns a real error into UB/panic in release; `catch {}` drops it. Handle the error
  or propagate with `try`. Legit only when the error is provably impossible — annotate `// guardrails-ok: <why>`.
- `= undefined` that escapes its init → reading undefined memory is UB. Fine as a
  scratch buffer filled before read; a bug if it reaches a getter. Heuristic grep only —
  it can't prove escape, so it warns; you confirm. Annotate `// guardrails-ok:` when intentional.
- **SQL by string concat** (`std.fmt.allocPrint(... "select ... {s}" ..., .{userInput})`) →
  injection, same class as #4/#8. Bind parameters via your DB client; never format user input
  into SQL. Convention + the backend-api digest — no linter catches string-built SQL.

## grep-gate (runs in the pre-commit GATE)
```
! git grep -nE 'catch\s+unreachable|catch\s*\{\s*\}' -- '*.zig' ':!*_test.zig' \
  | grep -v 'guardrails-ok:'
```
`zig fmt --check .` enforces format; `zig build test` runs the tests. The grep line above fails
the commit when a swallowed error/panic reaches non-test code without a `guardrails-ok:` escape.
