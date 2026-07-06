// guardrails · Rust deny-lints snippet
//
// Paste these attributes at the top of your crate root (main.rs / lib.rs). They turn
// the silent-panic class (#5 in the ledger) into a compile-time clippy error, and flag
// the index-panic class. Rust already covers null/UAF/data-race by construction — this
// is the residue that still bites.
//
//   unwrap_used / expect_used → a panic on None/Err is a silent failure in prod
//   indexing_slicing          → arr[i] panics on out-of-bounds; use .get(i)
//
// SQLi note: `sqlx::query(&format!("... {} ...", x))` builds SQL by string — the same
// class as #4/#8. Prefer the `sqlx::query!` macro (compile-time checked, parameterized)
// or bound args. clippy can't catch string-built SQL; keep it out by convention + review.
//
// In CI, `#![deny(warnings)]` (or `cargo clippy -- -D warnings`) makes the rest fatal too.

#![warn(clippy::unwrap_used)]
#![warn(clippy::expect_used)]
#![warn(clippy::indexing_slicing)]
