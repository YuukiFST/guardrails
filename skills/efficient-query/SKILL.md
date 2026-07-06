---
name: efficient-query
description: Intent-time checklist for writing or changing a database query or data-access call — lists, dashboards, funnels, detail reads. Use BEFORE writing a findMany/select/aggregate or any query that feeds a list or report. Covers N+1, over-fetch, unbounded reads, count-in-db, serial awaits, missing index, filter-in-query.
---

# efficient-query

Apply the data-access digest — canonical checklist in `rules/data-query.md` in this plugin,
project specifics in `.guardrails/data-query.md` after init-guards. Read both, then write.

Before you close:

- Filter in the query, not in memory. Every list query is bounded (take/limit).
- Count in the database, never `.length` of a big fetch.
- No N+1 — batch related reads. Independent reads run in parallel.
- Select only the columns used; never over-fetch or ship sensitive fields.
- Soft-delete/tenant filter on the base query AND every nested relation.
- Reads never write. Filtered/sorted/joined columns are indexed.
