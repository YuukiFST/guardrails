// guardrails · nextjs lint gate (flat config fragment)
//
// Extends the ts-node gate with a UI-token guard: bans hardcoded Tailwind palette
// colors (bg-white/black, *-gray/slate/zinc/neutral/stone) that break dark mode.
// Use semantic theme tokens (bg-background, text-foreground, border-border, …).
// Spread AFTER guardrailsTsNode: `...guardrailsTsNode, ...guardrailsNextjs`.
// Keep shadcn/ui vendored primitives out via `ignores`. See GUARDRAILS.md (UI).

const COLOR_RE =
  '\\b(bg|text|border|ring|divide|placeholder|from|via|to|fill|stroke|outline|accent|caret|decoration)-(white|black|gray|slate|zinc|neutral|stone)(-\\d{2,3})?\\b';

export default [
  {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    ignores: ['src/components/ui/**', 'components/ui/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=/${COLOR_RE}/]`,
          message:
            'Hardcoded Tailwind palette color banned (breaks dark mode). Use theme tokens: bg-background, text-foreground, border-border, text-muted-foreground. Legit theme-independent case (overlay over a photo)? disable one line with a reason.',
        },
        {
          selector: `TemplateElement[value.cooked=/${COLOR_RE}/]`,
          message: 'Hardcoded Tailwind palette color banned (breaks dark mode). Use theme tokens.',
        },
      ],
    },
  },
];
