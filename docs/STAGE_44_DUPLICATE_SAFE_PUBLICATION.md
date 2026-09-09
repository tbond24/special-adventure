# Stage 44 — Duplicate-safe vacancy publication

## Aim and acceptance

Make a retried create request return the original vacancy instead of creating another one. The request identity must survive draft restore and partial retry. Another user must not be able to obtain or reuse it. Existing production v2 callers must remain functional during rollout.

## Options and ranking

| Rank | Option | Value | Complexity | Trade-off |
|---|---|---:|---:|---|
| 1 | UUID request ID on the vacancy with a unique database index | High | Medium | Atomic, inexpensive, and returns the original result |
| 2 | Separate request-ledger table | High | Medium–high | More flexible, but needs extra lifecycle and access rules |
| 3 | Heuristic matching by property/name/date | Low | Low | Can merge legitimate similar units and is unsafe |

Chosen: option 1.

## Build

- Added a nullable `client_request_id` and partial unique index.
- Added authenticated `SECURITY INVOKER` v3 RPCs for new-property and existing-property unit creation.
- Each RPC returns the caller-owned vacancy for a repeated request ID.
- Cross-user collisions reach the unique constraint and roll back.
- The app assigns one UUID per unit, persists it in the privacy-limited device draft, and sends it to v3.
- v2 functions remain present, so the live v2 client was unaffected while v3 was tested.

## Test, diagnose, and proof

Local Supabase testing was unavailable because Docker/Podman is not installed. Ranked alternatives were: connected transactional SQL, a paid Supabase branch, or applying without runtime proof. Connected transactional SQL ranked first and avoided additional cost.

The migration was dry-run against project `xtutkwiivqkgkqjpkxvj`, then applied once and confirmed in migration history as `20260909012226`.

A real database transaction, impersonating two existing authenticated users and rolling back all fixtures, proved:

- `same_request_same_id = true`
- `single_vacancy = true`
- `cross_user_collision_denied = true`

Client retry identity tests: **6 passed, 0 failed** on desktop/mobile. Full relevant regression: **98 passed, 18 intentional skips, 0 failed**.

Hosted preview `dpl_C6ua28X1XV2kkEN3DGBNzWScXmrf` at `https://vacancy-qbb8isbap-tbond24s-projects.vercel.app` ran the same matrix: **98 passed, 18 intentional skips, 0 failed**. Production aliases were not changed.

## Advisors

No advisor finding was introduced by this migration. Existing warnings remain for intentional privileged admin/nickname functions, Supabase's built-in leaked-password switch, older unindexed foreign keys, multiple permissive policies, and unused-index telemetry. Secure signup retains its separate fail-closed HIBP check.

References: [Database functions](https://supabase.com/docs/guides/database/functions), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Score and rollback

| Area | Score |
|---|---:|
| Same-request replay | 10/10 |
| Concurrent duplicate resistance | 10/10 |
| Cross-user isolation | 10/10 |
| Client retry continuity | 10/10 |
| Rollout compatibility | 10/10 |

Rollback before v3 production use: point the client back to v2. After confirming no v3 client remains, drop the two v3 functions, the partial unique index, and the nullable column. Do not drop the column while any v3 client is active.
