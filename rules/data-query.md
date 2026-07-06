[write-time · data access / queries — correctness + efficiency]

Each line: rule — why — minimal example. Project overlay names your ORM & conventions.

• Filter in the query, not in memory — `WHERE`/query args, not `.filter()` after fetch;
  fetching all then filtering is slow and leaks rows you shouldn't read.
  Bad: `findAll().filter(x => x.ownerId===me)`. Good: `find({ ownerId: me })`.
• Every list query is bounded — a `take`/`LIMIT`; an unbounded findMany OOMs as data grows.
• Count in the database, not `.length` of a big fetch — `count()`/`_count`, never load N rows to size them.
• No N+1 — batch related reads (`in`/join/include), never a query per item in a loop.
  Bad: `for (o of orders) getUser(o.userId)`. Good: one `where userId in [...]`.
• Select only the columns the caller uses — over-fetch wastes IO and can ship sensitive
  fields; never `SELECT *` / `include: { rel: true }` when you need two fields.
• Independent reads run in parallel — `Promise.all`, not sequential awaits over an array.
• Soft-delete / tenant filter applied on the base query AND every nested relation —
  a missing filter on an include leaks deleted/other rows.
• Reads never write — a list/read path does not `create`/`update` per item in a loop;
  sync/auto-correct goes to a batch or a job.
• Index every column you filter, sort, or join on — an unindexed filter is a full scan.

Close: run the tests that cover this query; check the query plan for lists/dashboards.
