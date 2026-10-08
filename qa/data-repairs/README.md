# Isolated SQL regression tests

Run `npm ci --prefix qa/data-repairs` then `npm test --prefix qa/data-repairs` from the repository root. No live Supabase credentials or network database is used. The package pins PGlite0.5.8 (PostgreSQL18.3); production metadata at review was17.6.

`platform.sql` defines synthetic Supabase auth/storage APIs and default grants. `engine.mjs` replays all application migrations, including the candidate, without changing their application DDL or policies. The pgcrypto extension install is skipped because gen_random_uuid is core; the historic migration's synthetic admin is seeded. Tests use SET ROLE authenticated/anon plus synthetic JWT claims so row-level security and effective column permissions execute normally.

This is real PostgreSQL SQL/RLS verification, not provider API, multi-connection concurrency, authentication-server, or Storage-service verification. See the release ledger for exact limits.
