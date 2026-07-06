[write-time · architecture — deep modules, clean seams]

Each line: rule — why. This fires on new modules/refactors, not one-line edits.

• Deep module: small interface, substantial implementation — the caller sees a few methods
  and the complexity lives behind them. A shallow wrapper that just forwards adds cost, not value.
• One responsibility per module, one thing per function — three focused files beat one file
  doing three things; you edit one without loading the rest.
• Flatten control flow — early returns / guard clauses over nested if/for/try; cap ~2 levels.
  Deep nesting is state the reader (human or model) must hold all at once.
• Inject dependencies, don't hardcode them — pass the I/O collaborator in, so a test swaps a
  named fake without monkey-patching. A module that news-up its own DB client isn't testable.
• No cyclic imports — a module must not import its parent; split by a cohesive seam, not a
  blind line count. A cycle compiles but breaks at runtime and the type-checker won't catch it.
• Deletion test: could this abstraction be removed and callers be simpler? If yes, remove it —
  no interface with one implementation, no factory for one product, no config for a constant.
• Define errors out of existence where you can — an API that can't be misused beats one that
  documents how not to misuse it (e.g. return empty list, not null).
• Grep before writing a helper — duplicating an existing util is how invariants drift. Reuse or
  create one shared source, never a second copy of the same rule.
• Name for grep — distinctive names over Manager/Service/data/handler; a name with 50 hits is wrong.

Close: after a split, grep the new module to confirm it does not import the parent.
