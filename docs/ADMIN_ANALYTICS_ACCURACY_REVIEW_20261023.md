# Analytics accuracy repair — 23 October 2026

User authorized publishing dark mode, then fixing analytics accuracy and verifying Contact/Text tracking while preserving admin exclusion. Dark mode was published separately as `dpl_59tEFWEaiK5Q6yUjXHSZbeEaQUCm`; this branch continues its preserved release receipt `687812d`.

## Concrete changes

- Fix the actual click-collection defect: shared identity returns acquisition/new-session metadata, but the engagement recorder deliberately rejects any field outside its allowlist. Project only the existing visitor/session IDs into the click event; do not relax the recorder, regenerate IDs, await analytics from product actions or collect message contents.
- Add identified-admin exclusion to connected starts/events/arrivals/publication links and the older raw activity/publication reader. Preserve existing active-admin/AAL2 checks and all historical rows.
- Add a bounded available-listings-by-city aggregate. Exclude expired/admin-owned listings, reconcile its total and group overflow into Other locations. Stop deriving totals from a potentially truncated listing list.
- Add a range-based operations snapshot using business conversation/message/publication records and eligible inventory. Retain the older no-argument RPC for cached clients. Replace the unsupported request/publication ratio with a confirmed publication count; label stored profiles as profiles.
- Report the beginning of available version-2 traffic history and withhold comparisons/zero lines before it. This lower bound is available stored evidence, not a guarantee of uninterrupted tracking. Missing history is not reconstructed or fabricated.
- Use the same local calendar bounds and shared refresh cutoff for cards, map, connected and folded older reports. Folded diagnostics refresh only while open. Update snapshot cards in place during shared refresh, preserving arrangement and avoiding a duplicate initial fetch.

Only the generated `20261022193755_admin_analytics_accuracy.sql` migration is in scope. It replaces four reporting functions and adds two admin-only readers; it does not create data tables, widen collector input, alter Auth/roles/settings, reset collection coverage, delete history or replay earlier migrations. Original definitions are preserved in `ADMIN_ANALYTICS_ACCURACY_ROLLBACK_20261023.sql`. New readers revoke PUBLIC/anonymous execution and require the existing verified-admin guard.

## Before hosted changes

PASS: final `npm test` 102 browser cases / 22 intentional skips plus chart and HTTP isolation checks. Eight new desktop/phone accuracy cases cover missing history, inconsistent location responses, snapshot refresh without remount and matching native connected/legacy periods. Existing identity/admin-exclusion, click selector, data-error, theme and layout cases pass. The fixture now tests the installed report contracts; the native period case uses the actual shell because the purely visual fixture intentionally replaces the older report.

PASS: disposable PostgreSQL tests cover admin/AAL1/anonymous rejection, exclusion from journey and legacy cohorts, availability/expiry, >49 city aggregation, real publication deduplication, conversation membership, empty/partial traffic history, strict click-field rejection, successful Contact/Text counts, event-ID deduplication, cards and visitor feed. No hosted URL or credential is used by these tests.

PASS: both final curated-candidate composition/stability checks; native shell, cards, map, feeds and currency continuation remain intact. Dark-mode source and grid rules are preserved. Preview restored after tests. Original live function definitions were compared again immediately before applying the migration and had not changed.

## Controlled live verification and preservation

Use a fresh anonymous browser context with new test-only browser/session IDs, separate from the admin context. Journal the IDs before the run and verify they do not already exist. Permit only the three analytics recording RPCs; block account/message/business writes. Click the actual listing Contact control and actual enquiry submit button, intercepting form submission before Auth or enquiry handlers execute. Flush the real collector, inspect accepted counts and verify the report/card/feed data. Close the visitor context before removing only its journaled analytics/presence rows, then assert none remain. Do not clear a real admin browser's opt-out or create a customer conversation/account.

Verify native `#admin` entry excludes the browser before scripts run and that exclusion survives navigating away. Independently check the server rejects engagement from an existing admin identity. Hosted results, actual deployment IDs and cleanup counts will be recorded in the live receipt; this review does not claim those operations have already completed. Physical phones and genuine owner/MFA browser acceptance remain outside the controlled test.
