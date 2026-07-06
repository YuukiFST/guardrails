[write-time · frontend UI — tokens, a11y, motion, reuse]

Each line: rule — why. Project overlay names your design tokens & shared components.

• Use theme tokens, not hardcoded colors — a raw hex / palette color breaks dark mode
  and theming. Semantic tokens (background/foreground/border/muted) respond to the theme.
• Text contrast ≥ 4.5:1 (≥ 3:1 for large text) — below that fails WCAG AA and real reading.
• Every interactive element is keyboard-reachable with a visible focus ring, and has an
  accessible name (label/aria-label) — icon-only buttons without a name are invisible to AT.
• Semantic HTML first — `<button>` for actions, `<a href>` for navigation, real headings;
  a clickable `<div>` loses focus, role, and keyboard for free.
• Mobile-first: base styles = small screen, expand up with breakpoints; verify layout at a
  narrow viewport before calling it done — a review tool won't catch overlap/overflow.
• Motion respects `prefers-reduced-motion` and is short (~150-300ms, ease-out) — unbounded
  or ignored-preference motion is nausea + jank.
• Reserve space for async content (skeleton/min-height) — no layout shift when data loads.
• Reuse the shared component before building one — a one-off duplicate of a table/modal/
  select drifts from the system; grep first.
• Every list/async view has empty, loading, and error states — a blank screen reads as broken.
• Forms: label every field, show inline validation, disable+spinner the submit while pending.

Close: run it at a real mobile viewport and look; check focus order and contrast.
