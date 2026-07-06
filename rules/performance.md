[write-time · performance — the cheap wins, measured]

Each line: rule — why. Reach for these when the path is hot or the input can grow.

• Watch algorithmic complexity on data that grows — a nested loop over the same collection is
  O(n²); a lookup Set/Map turns the inner scan into O(1).
  Bad: `a.filter(x => b.some(y => y.id===x.id))`. Good: `const s=new Set(b.map(y=>y.id)); a.filter(x=>s.has(x.id))`.
• Don't allocate or compile in a loop — hoist regex, buffers, and constant work out of the hot path.
• Bound memory — don't load an unbounded result set or read a whole file into memory; stream or paginate.
• Do independent I/O concurrently — parallelize awaits that don't depend on each other.
• Cache only with a key and an eviction bound — an unbounded memo is a leak; reach for a
  built-in LRU before a custom cache class.
• Debounce/throttle high-frequency triggers (input, scroll, resize) — not a handler per event.
• Don't optimize on a guess — if it's not on a hot path or a growing input, ship the simple
  version; measure before adding a cache/index/pool.

Close: name the input size this is expected to handle; if it can grow unbounded, bound it now.
