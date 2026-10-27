# New registered accounts repair

27 October 2026, Australia/Perth. Status: LIVE, published and verified at 10:30 PM. First implementation repair after baseline verification in ADMIN_METRIC_CHANGE_PLAN_20261027.md. Repeat visitors and all later planned items remain unchanged. This receipt supersedes the prepared checkpoint.

## Issue and chosen solution

The owner requests the label New registered accounts and a count after successful verification, including guests becoming registered. The current Overview reader counts non-anonymous auth.users rows using created_at, which includes unverified creation and dates older guest conversions incorrectly.

Options considered: use the existing authoritative verification timestamp, or add a separate registration-recording mechanism if the current data cannot support the rule. Chosen: use existing auth.users.confirmed_at, generated in this project's schema as LEAST(email_confirmed_at,phone_confirmed_at). Retain non-anonymous and existing Admin exclusions. Count each matching account row once in the requested half-open verification-time bucket. No new table, Auth trigger, collector, credentials, permissions or signup/verification changes.

Current Supabase Users documentation describes confirmed_at and its null/unverified meaning. Actual hosted schema expression verified. Official supabase/auth source for verification, recovery and confirmed-email changes was read: normal recognised account recovery/email changes preserve an existing confirmation timestamp. This is a report on available account confirmation dates, not a new permanent registration audit ledger or invented recovery of deleted accounts.

## Before and after

Before: an unverified non-anonymous account created today can appear; an older guest converted/verified today can be attributed to their old creation date. Label and Recorded activity legend say New accounts.

Now: accounts are included only when they are non-anonymous and their database confirmation date is within the requested period. Guest conversion uses the same existing Auth ID with its confirmation date, without replacing visitor identity. The Overview label and its Recorded activity legend say New registered accounts. The existing private notification on auth.users changes already invalidates the accounts group; no polling/notification change is needed. Saved metric key accounts and card layout/preferences are retained.

Only the accounts branch of public.admin_card_series changes. Other branches, report signatures, Admin/AAL2 guards, ACLs, report bounds, current storage/listing recording and public verification flows remain unchanged. System/legacy dashboard definitions outside the requested Overview card are not relabelled or rewritten.

## Baseline completion

PASS: live alias points to dpl_9kWUEpw1BKmhBgYs8gbVNg7uBR5y and four relevant live static hashes match its recorded manifest. Five existing capacity triggers and both original/new capacity jobs remain present; recent clock runs succeeded and pending hints are zero. Native aggregate history shows actual time-only expiry reducing live listings 6 to 5 at 13:50:23 UTC. Current storage is 136837813 bytes with zero unknown sizes. Disposable capacity add/remove/metadata/expiry/security/rollback regression passed. Existing logic is retained, not rebuilt. Evidence: evidence/admin-metric-baseline-20261027.json.

## Verification and limits

PASS: disposable PostgreSQL checks current-before versus verified-after behaviour; email and phone timestamps; unverified/anonymous/Admin exclusion; existing-ID guest conversion; login/retry/second-channel idempotence; failed verification transaction; period boundaries; unchanged other metric results, guard definitions and ACLs; fail-closed migration precondition; exact rollback preserving account rows. These test report inputs and SQL transaction semantics, not external Auth email delivery.

PASS: exact released source 2fb6c486719b179e6989a6beb37c77bc91d67682 completed workspace CI 40518844960, attempt 2 / job 122246133911: 152 desktop/mobile browser passes and 22 intentional skips. Attempt 1 was cancelled during browser dependency installation before tests; one retry succeeded. SQL CI 40518845301 / job 122239920498 passed. Focused local label/Recorded activity test passed (one desktop pass, one intentional mobile skip); actual curated composition/stability passed. Full local runs produced incomplete logs and are recorded as PARTIAL, not additional full passes.

PASS: staged, production and canonical live hashes match all five changed files. Hosted function exactly matches the prepared reader; all eleven captured ACLs and ten other function definitions, including Admin/AAL2/active-user guards, are unchanged. Security advisors retain the same 32 existing findings with none added or removed. No Auth/customer data or verification settings were changed.

PASS: genuine signed-in Admin shows Live updates and New registered accounts in card choices and Recorded activity. Temporarily changed card 4 from New listings to New registered accounts: Today = 0, matching the native verification aggregate. Restored all original card metrics/periods/counting choices and confirmed New listings loaded again. Proof screenshot shows the temporary acceptance selection, not a new default layout. The real release produced two native code/Overview ledger entries without altering engagement coverage. The connected browser received private site_feed notifications (signal count 1 to 3). Release-feed text itself was not asserted.

No fabricated production registrations or outgoing verification emails were used. Disposable checks cover the timestamp/report/transaction rules; they do not prove external email delivery. Existing historical counts can change because the reporting date changes from creation to recorded verification; no unavailable earlier/deleted-account history is invented. Hard deletion/administrative changes to underlying Auth records still affect this row-based report.

## Live release

READY production dpl_8EqEmyMnooZ5qsBPdwfcvSW84AwB, canonical https://getvacancy.site/#admin, actual application source 2fb6c486719b179e6989a6beb37c77bc91d67682. Five curated static files changed; the backend count is the hosted SQL reader. Hosted migration 20261027142901 / admin_registered_accounts_verified corresponds to local 20261027140536, the same single change. Applied once; no replay or rollback. Draft PR53 remains unmerged, with no default merge or force-push. Receipt-only commits after this source do not require redeploying application assets.

Evidence: [manifest](ADMIN_REGISTERED_ACCOUNTS_RELEASE_MANIFEST_20261027.json), [live checks](evidence/admin-registered-accounts-live-20261027.json), [browser preferences and acceptance](evidence/admin-registered-accounts-ui-20261027.json), [screenshot](evidence/admin-registered-accounts-live-20261027.jpg).

## Migration and safe rollback

Forward: supabase/migrations/20261027140536_admin_registered_accounts_verified.sql, generated by Supabase CLI 2.121.0. It checks the exact captured old function definition before replacing only that reader. Baseline function, ACL and existing guards: tests/fixtures/admin-registered-accounts-baseline.json.

Rollback: supabase/rollback/admin_registered_accounts_20261027.sql restores the exact captured function. CREATE OR REPLACE preserves its existing ACL; verification includes equality before/after. Restore frontend dpl_9kWUEpw1BKmhBgYs8gbVNg7uBR5y as the matching previous UI. No account rows, identities, activity, customer records or historical observations are removed. No rollback has run.

The first CLI file-generation invocation was blocked by automatic approval review because it attempted unrequested PostHog telemetry. Official Supabase documentation confirms SUPABASE_TELEMETRY_DISABLED=1 and DO_NOT_TRACK=1; the supported telemetry-disabled/offline invocation succeeded. Reconciled two CLI-generated empty files and kept the original single filename; no hosted migration was duplicated. Do not retry through an alternate privileged route or enable telemetry.

Hosted/local timestamps above identify the same change, not additional migrations. Curated assets were verified before assigning the live alias. The scoped rollback was tested before activation; it restores the captured reader and preserves all existing/new account data. No rollback has run.
