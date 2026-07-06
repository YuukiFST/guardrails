// guardrails · ts-node lint gate (flat config fragment)
//
// Spread this into your eslint.config: `...guardrailsTsNode`. It turns three
// recurring defect classes from "caught by attention" into "fails at write time":
//   • mass assignment  — `...input` / `data: input` can smuggle a scope FK (IDOR)
//   • swallowed error   — `.catch(() => {})` / `catch {}` hides real failures
//   • blinded type-check — `any` / `@ts-ignore` hide the hole that becomes a runtime bug
//
// Scope it to your source glob; keep vendored/generated code out of `files`.
// See .guardrails/GUARDRAILS.md classes #2, #5.

export default [
  {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          // Mass assignment: `data: { ...input }` may carry a scope/owner FK from the
          // client — mis-attribution = IDOR. Whitelist fields explicitly.
          selector: "Property[key.name='data'] SpreadElement > Identifier[name='input']",
          message:
            "`...input` inside `data` is banned (mass assignment can carry a scope FK — IDOR). Whitelist fields: data: { title: input.title, ownerId: ctx.userId }. GUARDRAILS.md #2.",
        },
        {
          selector: "Property[key.name='data'][value.type='Identifier'][value.name='input']",
          message:
            '`data: input` is banned (mass assignment — IDOR). Whitelist fields explicitly. GUARDRAILS.md #2.',
        },
        {
          // Silent catch returning null/undefined swallows the error with no trace.
          selector:
            "CallExpression[callee.property.name='catch'] > ArrowFunctionExpression[body.type='Identifier'][body.name=/^(undefined|null)$/]",
          message:
            'Silent catch banned: `.catch(() => undefined/null)` swallows the error. Log it (structured, with context) before continuing. GUARDRAILS.md #5.',
        },
        {
          selector:
            "CallExpression[callee.property.name='catch'] > ArrowFunctionExpression[body.type='BlockStatement'][body.body.length=0]",
          message:
            'Silent catch banned: `.catch(() => {})` swallows the error. Log before continuing. GUARDRAILS.md #5.',
        },
      ],
      'no-empty': ['error', { allowEmptyCatch: false }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
    },
  },
];
