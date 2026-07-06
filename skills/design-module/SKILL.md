---
name: design-module
description: Use when creating a new module, extracting or splitting a file, or designing an interface/API seam — the deep-module discipline (small interface over substantial implementation, deletion test, no cyclic imports). Triggers on "new module", "split this file", "extract a service", "design this interface", "where should this seam go".
---

# design-module

Architecture is a design decision, not a per-line edit — so no file-area hook fires for it.
Invoke this skill deliberately when you are about to add a module, split a file, or shape an
interface.

## What to load

Read the architecture digest that ships with the plugin: `rules/architecture.md`, located at
`<plugin-root>/rules/architecture.md` — the plugin root is the directory two levels up from this
skill file (this file is `<root>/skills/design-module/SKILL.md`). Apply it as the checklist below.

## Checklist (from rules/architecture.md)

- **Deep, not shallow** — small interface, substantial implementation. A wrapper that only
  forwards is cost without value; fold it in.
- **One responsibility** per module, one thing per function. Three focused files beat one file
  doing three things.
- **Deletion test** — could this abstraction be removed and callers be simpler? If yes, remove it.
  No interface with one implementation, no factory for one product, no config for a constant.
- **Split by a cohesive seam**, not a blind line count. A shared transaction stays together.
- **No cyclic imports** — a module must not import its parent. A cycle compiles but breaks at
  runtime and the type-checker won't catch it.
- **Inject dependencies** — pass the I/O collaborator in so a test swaps a named fake.
- **Grep before a helper**, **name for grep** — reuse the canonical util; distinctive names over
  Manager/Service/data/handler.

## Done when

After a split, grep the new module to confirm it does **not** import the parent (no cycle), and
each resulting unit has a single clear responsibility.
