# Isolated PostgreSQL results — 5 October 2026

**Database correctness checks: PASS. Hosted integration: not verified. Performance: remaining limitation. No production change or deployment.**

## Runtime and isolation

User approved downloading and running a temporary local PostgreSQL instance. Used the PostgreSQL.org Windows page's EDB binary distribution, downloaded over HTTPS:

- Reference: https://www.postgresql.org/download/windows/
- Publisher listing: https://www.enterprisedb.com/download-postgresql-binaries
- Archive: https://get.enterprisedb.com/postgresql/postgresql-17.11-5-windows-x64-binaries.zip
- PostgreSQL reported version: **17.11**, Windows x64.
- Archive size: **381,531,864 bytes**.
- SHA-256: `80379B2C04D51C30225532E0AE04509899141E9957ED096FE749D7FD9DF8F82F`.
- The executable is **not Authenticode-signed**. Provenance is the official PostgreSQL-linked publisher over HTTPS; this hash records the downloaded artifact, not an independently verified publisher checksum.

No installer, Windows service, system PATH change, firewall change, Docker/WSL installation, paid service or production credentials were used. No production data was copied. The entire cluster, admin identity, events, properties, rooms and publications were synthetic. Fresh random local credentials were created, with SCRAM authentication. The folder's access was restricted to the current Windows account; credentials were not printed or copied to the evidence directory.

Verified target: database `vacancy_marketing_test`, marker `vacancy-marketing-synthetic-only`, PostgreSQL major version 17, listener **127.0.0.1:55432 only**. The runner rejects nonmatching targets and requires initially empty fixture tables/roles. Explicit connection arguments and cleared inherited PostgreSQL environment variables prevent a production connection override.

## Executed results

The exact repository `private.is_admin` definition, reporting-function migration and recovery SQL were executed, not rewritten as a JavaScript simulation. The dependency schema contains only columns needed by the function; fixture tables have RLS and no direct grants to the API roles. Tests change the actual PostgreSQL role to `anon` or `authenticated` and set controlled JWT-claim settings read by local Supabase-style SQL claim helpers.

**24 assertions passed** in the prepared suite:

| Requirement | Executed result |
|---|---|
| Admin membership + AAL2 | Authorized report returned data |
| Anonymous | Rejected with SQLSTATE 42501; execute grant absent |
| Admin with AAL1 | Rejected with SQLSTATE 42501 |
| Authenticated non-admin with AAL2 | Rejected with SQLSTATE 42501 |
| Signature/security/grants preservation | Owner, ACL, security-definer setting and empty search path matched baseline |
| UTC boundaries | Start included, instant before end included, exact end and instant before start excluded; session timezone set to Australia/Perth |
| Legacy events | Events lacking instrumentation event ID excluded |
| Earliest publication | Selected across full available history before date filtering |
| NULL old status | Qualifying NULL-to-active transition counted |
| Duplicate active status | Active-to-active rows ignored; no duplicate publication count |
| Republication | Later pause-to-active did not replace earlier first-recorded publication or pull an earlier listing into the date range |
| Non-listing log entry | Excluded |
| Dynamic server time | Current server timestamp returned and advanced on a second call within the same transaction |
| Analytics limits | 5,000 rows returned as complete; 5,001 sentinel returned while the publication dataset stayed independently complete |
| Publication limits | 5,000 rows returned as complete; 5,001 sentinel returned while analytics remained independently complete/empty |
| Recovery | Original function definition restored exactly; owner, grants, search path and security settings preserved |
| Recovered access | Authorized call worked; anonymous, AAL1 and non-admin calls remained denied |

The new migration was applied **only to this temporary database**, then reverted using the separate recovery file. Tests used direct SQL rather than a Supabase migration ledger; no migration-history repair was necessary. Production migration state was untouched.

## Failures encountered and resolved

1. Local setup initially rejected a numeric Windows SID without the required `*` prefix. Corrected the local folder ACL command before creating credentials.
2. PowerShell split the initial password-file argument incorrectly. Corrected native argument construction; initialization then succeeded.
3. The test target guard compared textual `127.0.0.1` with PostgreSQL's `127.0.0.1/32`. It stopped before schema/migration writes. A read-only target check confirmed the intended database, marker, version and port. Changed only the test guard to use `host(inet_server_addr())`, retaining the same exact loopback restriction.

The third failure is preserved in `target-guard-first-failure.txt`. No Vacancy application function or migration fix was required for the correctness suite.

## Performance observation — do not overlook

The freshly loaded near-limit fixture ran slowly. A follow-up local comparison refreshed PostgreSQL statistics with `ANALYZE`, then measured the original and candidate functions against **0 analytics events and 5,001 publications under one property**:

| Function | SQL call duration | JSON bytes |
|---|---:|---:|
| Original baseline | 22,632.686 ms | 2,055,443 |
| Candidate with generated_at | 23,085.052 ms | 2,055,495 |

Both returned the expected counts. The comparison restored the exact original definition/security afterwards; that assertion also passed.

This is one run per version on a minimal local fixture, not a production benchmark or statistically dependable regression estimate. It deliberately uses an extreme one-property history and does not reproduce production's full schema, indexes, hardware or distribution. It nevertheless demonstrates substantial database work at that case. The previous ~3-second throttled browser fixture result excluded SQL and must **not** be described as full production end-to-end performance.

The expensive behavior also occurs in the original function. Its per-listing first-property-publication lookup is a plausible contributor, but no query-plan investigation or optimization was performed here. Do not infer that the 52-byte timestamp addition caused the delay. Database correctness passed; production-like performance remains unresolved. If further improvement is approved, inspect this existing query first rather than redesign the reporting architecture. No reporting SQL optimization was made.

## What the environment can and cannot verify

**Verified locally:** real PostgreSQL execute permissions, membership/AAL claim enforcement inside the exact repository function, data-query semantics, timestamps, independent limits and function recovery.

**Not verified:** JWT signature validation or token issuing, email/Google authentication, MFA enrollment/challenge, PostgREST routing/HTTP authorization, the deployed function's actual state, the full application's RLS/trigger interactions, hosted Supabase grants/configuration, network compression or production latency. The harness sets claims as trusted test input; it does not pretend to authenticate a real user. PostgreSQL 17.11 shares production's inspected major version but not its previously reported 17.6 minor build. No claim of complete hosted security equivalence is made.

## Evidence and shutdown

Evidence directory:

`C:\Users\PC\Documents\Codex\2026-09-07\referenced-chatgpt-conversation-this-is-an\work\marketing-checkpoint-artifacts\database`

Files: `verify-marketing.sql`, `database-stdout.txt`, `database-stderr.txt` (24 PASS notices), `target-guard-first-failure.txt`, `analyzed-comparison.sql`, `analyzed-comparison.txt`, `distribution.json`, `listener.json`, `server.log`, `shutdown.json`.

Shutdown confirmed at **2026-10-05 00:13:16 UTC / 08:13:16 Perth**:

- `pg_ctl status`: no server running (expected exit code 3).
- Listening connections on 55432: **0**.
- `postmaster.pid`: absent.

The server was stopped after each execution attempt, including failure paths. The final stored report function is the recovered baseline, not the candidate.

## Temporary files and removal

Runtime/archive/synthetic cluster folder (approximately **1.45 GB** total):

`C:\Users\PC\Documents\Codex\vacancy-marketing-postgres-test-20261005`

It contains the ZIP, extracted PostgreSQL distribution (including unused bundled tools), synthetic data directory, local-only password file, initialization/server logs and provenance. Bundled pgAdmin/StackBuilder were not launched or installed. The initial 1 GB planning allowance was lower than the observed total.

Because the server is stopped and no service was registered, this entire exact folder can be deleted in File Explorer. No uninstaller is needed. If it has been restarted later, stop that specific cluster first using its `pg_ctl.exe -D <that folder>\data -m fast -w stop`, then confirm no listener before deletion. Do not delete a different PostgreSQL folder.

The separate evidence directory can be retained for audit or deleted independently. Keep repository `qa/marketing-db/` and this report if you want reproducible tests; they contain code and synthetic fixture definitions, not installed software or production secrets. Removing the runtime folder does not modify the website, production database, or source rollback tag.

**Paused for review. No deployment authorized or performed.**
