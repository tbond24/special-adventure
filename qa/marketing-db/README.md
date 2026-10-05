# Isolated Marketing database verification

Executed on 5 October 2026 with approved local PostgreSQL 17.11: 24 suite assertions passed, recovery verified, server stopped. See `../../docs/ADMIN_MARKETING_DATABASE_RESULTS_20261005.md` for evidence, limitations and the separate slow near-limit SQL observation. The preparation notes below describe the original setup plan.

Purpose: execute the exact reporting migration and recovery SQL on PostgreSQL 17 using synthetic fixtures. No application or production connection is needed.

Inspection on 5 October 2026 still found no local PostgreSQL/container runtime; the only connected Vacancy branch is production `main`. Do not use it. No binary was downloaded or installed while preparing this folder.

## Smallest proposed runtime

Use the Windows PostgreSQL 17 binary ZIP linked from https://www.postgresql.org/download/windows/ (EDB packaging). PostgreSQL licence cost and hosted-service cost: **$0**. Requires internet download and local disk space; reserve approximately 1 GB as a planning allowance, not a measured download size. Version, download size and available checksum/signature must be checked before download/execution. If system prerequisites are missing, report them before installing anything else.

With approval, unpack into a dedicated folder outside the app, initialize a new data directory, and run a temporary server listening **only on 127.0.0.1:55432**. Do not install a Windows service, edit system PATH, use cloud credentials, or connect the website. Generate local-only credentials; no production keys are required. Stop the server after verification and retain or archive the synthetic folder for evidence. No paid service, Docker/WSL installation or reboot is intended.

Create a fresh database named `vacancy_marketing_test` owned by the local test superuser `vacancy_qa`, and mark it with:

```sql
COMMENT ON DATABASE vacancy_marketing_test IS 'vacancy-marketing-synthetic-only';
```

The runner verifies database name, marker, PostgreSQL major version, loopback address, dedicated port and initially empty public schema/roles in the same connection before creating fixtures. It ignores inherited PG connection variables and accepts no remote URL. Do not mark an existing database as synthetic merely to bypass the guard.

## Prepared work

- `schema.sql`: only dependency columns consumed by the reporting function, with RLS enabled and no direct API-role table grants; synthetic admin membership.
- `checks.sql`: actual role-denial calls, UTC edge fixtures, NULL prior status, duplicate active records, earlier publication/republication, dynamic timestamp, independent 5,000/5,001 limits.
- `run.cjs`: uses the repository's exact admin predicate, candidate migration and recovery SQL; verifies ownership/ACL/search-path/security preservation and recovery definition; restores the original report function at the end.

Preparation without a database:

```powershell
node qa/marketing-db/run.cjs --prepare
```

After approved runtime setup, supply the absolute installed `psql.exe` path:

```powershell
node qa/marketing-db/run.cjs --psql 'C:\absolute\approved-test-folder\pgsql\bin\psql.exe'
```

For SCRAM login use `VACANCY_QA_PGPASSFILE` pointing to a locally generated test-only password file. The runner passes no password on its command line. Never substitute production credentials. It rejects existing fixtures on repeat runs: use a newly initialized disposable cluster; do not make it reset an arbitrary database.

Evidence is written outside the app to sibling `marketing-checkpoint-artifacts/database/`. `--prepare` and JavaScript syntax success do **not** establish SQL correctness. All SQL checks remain unexecuted until the runtime is available.

## What this proves and does not prove

This is real PostgreSQL role/SQL verification with the exact repository reporting function, not a JavaScript mock. Supabase's SQL claim-reader contracts are represented locally; claim values are set by the test harness. It can verify that this function denies the wrong role/membership/AAL, but cannot verify JWT signatures, the hosted Auth service, PostgREST HTTP grants, deployment drift or the entire application's schema/triggers. Those limitations must remain visible in the results.

The dependency schema deliberately excludes unrelated tables, application writes and real data. Timing on it is not a production database benchmark. Recovery executes the exact stored recovery file and checks the resulting function; this local direct-SQL test creates no Supabase migration-ledger entry. Source rollback tags still do not restore a remote database.

Current status: **LOCAL SQL CHECKS PASSED / HOSTED INTEGRATION UNVERIFIED**. The approved local runtime was stopped after testing. No deployment is authorized.
