---
name: kill-the-class
description: The fix ritual — when fixing any bug, kill the whole defect CLASS, not just the reported instance. Grep every sibling of the same pattern, fix them all, strengthen the automatic guard one rung, and record it in the invariant ledger. Use when fixing a bug, patching a vulnerability, or when a review finds a defect that likely repeats elsewhere.
---

# kill-the-class

A bug report names one symptom. The instance is never alone — the same wrong idiom lives
in the sibling callers. Patching only the reported path leaves every sibling broken, and
with no guard the class reappears sessions later as a "new" bug. Fix it once, at the root,
and make it impossible to reintroduce.

## Ritual

1. **Reproduce first** — a failing test (or a concrete repro) that exercises the bug the way
   a user hits it. This is what proves the fix and becomes the regression sensor. Don't fix a
   symptom you can't reproduce; you'll fix the wrong thing.

2. **Name the class** — state the defect as a pattern, not an instance: "by-id write not
   scoped to owner", "catch that returns null", "unbounded findMany". The pattern is what you
   grep for.

3. **Grep the siblings** — search the whole repo for the same idiom. Fix ALL of them in one
   sweep, not one ticket per screen. If the fix is a shared helper/wrapper, fix it there once
   so every call-site is covered by a single edit.

4. **Strengthen the guard one rung** — turn "caught by attention" into "fails at write time".
   Ladder, lowest that fits: 🔒 lint rule > 🧪 test > 👁 required reviewer on the diff. A class
   with no guard has no future — install the cheapest guard that would fail on the next instance.

5. **Record it in the ledger** — add/update the class's line in `.guardrails/GUARDRAILS.md`:
   the class, its guard, and coverage. New class not listed → add a row. Same commit as the fix.

## Done when

The repro test passes; a grep for the pattern returns only intentional, guarded exceptions;
the guard fails on a fresh instance; and the ledger line is updated — all in one commit.

## Root-cause discipline

Before editing, grep every caller of the function you're about to touch. The lazy fix IS the
root-cause fix: one guard in the shared function is a smaller diff than a guard in every
caller — and it's the only one that also fixes the siblings you didn't know about.
