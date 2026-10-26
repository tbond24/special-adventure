# File storage and live listings cards — 27 October 2026, Perth

Status: development candidate; NOT applied or published.

## Request and definitions

The owner requested two metric cards showing storage usage over time and number of listings. Asked which listings to count; the owner selected **Live listings**. Reuse the existing Overview card template, selectors, responsive grid and saved layout.

- **File storage used:** the total byte size of all current objects across Supabase Storage buckets, including listing images, avatars, private conversation attachments and draft media. Includes every file's actual stored size; no paths or file contents are returned. Excludes PostgreSQL database size, backups, bandwidth and account quota. Show an unavailable value if any object size is missing/invalid, not an understated exact total. Units are decimal B/KB/MB/GB.
- **Live listings:** count vacancy records with `status='active'` and no expiry or expiry after observation, joined to their existing room, property and owner profile. Matches the existing anonymous catalogue's active/unexpired rule; no per-visitor block/location filter, no new-account or publication-event sum. Does not change listing visibility rules or exclude listings solely because their owner is an Admin.

## Method and choice

The existing System storage reader provides only a current sum for two older buckets, not historical usage. No capacity snapshot table or installed pg_cron extension was found. Current object creation timestamps cannot reconstruct deleted files or historical listing statuses.

Prepare one private aggregate snapshot per hour for both metrics, plus a fresh current read. A database cron job records when Admin is closed; no browser-based history and no additional request per file or per user. Each hourly row contains only timestamps, byte total, unknown-size count and live-listing count. It cannot identify customers. Keep recorded history; no customer record changes or snapshot-history purge.

An existing hourly row is never overwritten. Retry cannot alter a previous observation. History begins with the first real sample after activation; earlier periods stay blank. Gaps longer than 90 minutes and unavailable storage sizes break plotted lines. The headline is the latest observation within the selected period, not the sum of stock levels. Change is an absolute difference since the first observation in that range, with its timestamp shown. Yesterday never displays today's current value.

The existing New listings card remains separate. Add the two requested cards once to each Admin's saved layout; preserve card ordering/removal, intentionally empty layouts and all other choices. Both cards default to Today like existing cards, with 7/30/90-day options. Same-period cards share one protected read and the existing 60-second refresh; automatic collection is hourly. Removal remains saved. No layout redesign or general monitoring service.

## Implementation and rollback

- `supabase/migrations/20261026185940_admin_capacity_snapshots.sql`: private RLS-protected aggregate table; owner-only invoker aggregate/capture functions; guarded private definer reader and public invoker wrapper. Existing active-account/Admin/AAL2 predicate retained. Anonymous, ordinary-user, direct-table and collector access denied. Bounded 91-day reads, five-second query timeout.
- `supabase/migrations/20261026190214_admin_capacity_hourly_job.sql`: enable the available pg_cron extension, reject a pre-existing same-name job, record the initial sample, install `vacancy-admin-capacity-hourly` at `0 * * * *`. The same job removes only its own cron execution logs older than 30 days; other jobs and customer data are untouched. No keys or external scheduler.
- Frontend: reuse the existing card module/backend adapter; add a chart option to hide duplicate legends for separated observation segments. Existing chart defaults remain unchanged. Include the adapter in the curated release builder; do not deploy raw development source.

Rollback after activation: disable only this job with `select cron.alter_job((select jobid from cron.job where jobname='vacancy-admin-capacity-hourly'), active:=false);`, revoke authenticated execution on `public.admin_capacity_history(timestamptz,timestamptz)` and its private reader, and restore frontend deployment `dpl_8RGCnJpqfBRUKBBjhkngDWS2WwfM`. Preserve the aggregate table/history and pg_cron extension for review; do not drop shared extensions or erase history. The previous Account Details grant remains intact.

## Verification and publication boundary

Disposable PGlite PostgreSQL passes: all-bucket byte sum; active and unexpired count; real zero; unknown size; initial empty history; first snapshot; immutable same-hour retry; changes/deletions reflected in current values without rewriting history; bounded/invalid ranges; Admin/AAL2, ordinary-user, suspended, absent-user and anonymous denials on both read entry points; collector/table denial; RLS; read-access REVOKE rollback.

The hourly scheduler is a separate migration. PGlite does not execute pg_cron. A separate disposable PostgreSQL 16 CI job enables the real extension, applies the exact scheduler migration with a synthetic probe collector, verifies the initial observation and hourly registration, speeds up only that disposable job to observe actual background execution, restores its hourly schedule, rejects replacement and verifies disable-with-history-preserved rollback. This complements the actual aggregate-function regression; it does not establish hosted activation. CI result is recorded after completion. Current official Supabase Cron quickstart and extension documentation were checked. No production database mutation, extension enablement, job or frontend deployment has occurred.

PASS: 118 local desktop/mobile browser cases with 22 intentional skips, including eight new storage/listing card checks; existing chart checks and two HTTP isolation checks. Both actual curated production-composition and stability checks pass with eight cards, the new values, unchanged independent theme behavior, retained graph nodes/focus, one feed read and no page errors. First focused run had an ambiguous test locator for icon-versus-chart SVG; narrowed it to the chart. The full suite then exposed the old five-chart expectation; updated it to seven for the two added cards. Final full run passes without reducing behavioral assertions.

Final focused desktop/mobile run: 10/10 PASS, including preserving an intentionally empty saved layout on first introduction. Exact-source `da0573fe98b285158c349367480271140f8b1a1d` CI passes: database and real scheduler jobs in runs **40384663261** (PR) and **40384657675** (push), complete workspace run **40384657626** (**120 passes / 22 intentional skips**). The scheduler test observed a real background worker, restored the hourly schedule and verified disable-with-history-preserved rollback. The initial scheduler CI hit the runner's systemd cluster startup assertion; direct startup of its disposable cluster corrected the test infrastructure. No product SQL/logic workaround was needed.

Preview uses clearly labelled synthetic data, not measured production history: [preview](evidence/storage-live-listings-preview-20261027.webp). Live storage and listing history remain unavailable until activation. [Prepared receipt](evidence/admin-storage-listings-prepared-20261027.json). [Draft PR46](https://github.com/tbond24/special-adventure/pull/46) remains unmerged.

The existing project rule in `docs/DECISIONS.md` (22 October) requires specific approval for production SQL. Prepare and save this candidate before requesting approval to apply these two migrations and publish the curated frontend. A previous approval for the Account Details helper grant does not cover this new scheduler/schema change.
