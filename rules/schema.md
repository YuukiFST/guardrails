[write-time · data model / schema — design before you migrate]

Each line: rule — why. Project overlay names your ORM & migration command.

• Every table has a stable primary key + created/updated timestamps — you need identity and
  an audit anchor; retrofitting them later is a migration you'll regret.
• Index every foreign key and every column you filter, sort, or join on — an unindexed FK/filter
  is a full scan that only hurts once the table is big.
• Declare the delete behavior on every relation (cascade / restrict / set-null) — an implicit
  default silently orphans or blocks deletes.
• `UNIQUE` on the real natural key, never on a nullable column — nullable-unique behaves
  differently per engine and lets duplicates through.
• Don't store what you can compute — a derived/denormalized column drifts out of sync with its
  source; compute it, or accept the sync cost only with a reason.
• Right type for the value — decimal for money (never float), string for phone/zip/codes with
  leading zeros, a proper enum/lookup only for a truly fixed set.
• No wide god-table — a table past ~30 columns doing several jobs should be split; it's three
  entities wearing one schema.
• Migrate with versioned migrations, never a destructive push against anything that ships —
  additive-first (expand → migrate → contract) so a rollback of code is safe.

Close: run the schema audit / migration dry-run; re-check types after generate.
