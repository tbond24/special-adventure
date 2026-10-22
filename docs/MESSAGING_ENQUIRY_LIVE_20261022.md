# Messaging/enquiry stability — live receipt

User authorized fixing messaging/enquiry races, preserving drafts/photos, preventing duplicate/obsolete actions, retaining admin exclusion and testing before publication.

Published curated source `bd14fb1649aadc1504d2bd2b2ccd760d9a485bfd` to READY deployment `dpl_95Ghha9oCYXFYn3WuU9LE6eErvJN` (`vacancy-o7obyac8g-tbond24s-projects.vercel.app`) and https://getvacancy.site. Nine files changed from the prior 121-file artifact. Exact hashes: `MESSAGING_ENQUIRY_RELEASE_MANIFEST_20261022.json`. Previous `dpl_7528RE57NTRrzkZ5JXuw9HkaA7cr` retained as rollback; draft PR #40 remains unmerged.

## Checks

- PASS before publication: 46 targeted desktop/phone checks on the exact curated candidate, full npm test 86 browser passes / 22 intended skips plus chart and HTTP isolation; both admin production-composition checks. Coverage and cancellation limits are in `MESSAGING_ENQUIRY_STABILITY_20261022.md`.
- PASS staged hosted deployment: 22 non-HTML client asset hashes matched the manifest; native admin sign-in loaded with zero page errors and zero write requests. Admin-triggered browser exclusion remained true after navigating to Privacy.
- PASS staged hosted browser: 38 messaging/enquiry UI checks at desktop 1440 and phone 390, fetching actual deployed static files while the existing in-memory fixture intercepted Auth, data, messages and uploads. Every hosted write path was intercepted. The four direct adapter cases (eight width executions) ran locally before publication rather than claiming real service delivery.
- PASS after public alias assignment: repeated the 22 asset hashes/native admin exclusion check and the same 38 controlled browser cases on https://getvacancy.site. All passed. No real account, message, enquiry, photo, contact or analytics event was created by those checks.
- PASS: transaction-local existing-admin/AAL2 production check accepted zero engagement events and left event counts unchanged. Rolled back; no synthetic analytics persisted. Existing server guard was not modified.
- PASS: generated the bounded code-release receipt after live asset verification and recorded the actual publication in the site-change ledger. Tracking policy/coverage, Auth/provider/environment settings and schema remained unchanged. No migration or production message/data mutation was performed.

The hosted checks are controlled browser/adapter verification of the actual published scripts, not genuine owner Auth/MFA, real Google navigation, multi-user delivery or server idempotency acceptance. Already submitted requests can be accepted before cancellation arrives; the client stops later obsolete stages and redirects and never automatically retries an uncertain send. Draft files are in-memory within the current tab, not guaranteed across a reload. No claim of transport-wide exactly-once delivery or recall of accepted messages.

Rollback: reassign the alias to `dpl_7528RE57NTRrzkZ5JXuw9HkaA7cr`; retain the code ledger and analytics history. No schema/Auth rollback is necessary. Other preserved branches and draft PRs, including broader Find/dashboard/layout work, remain separate.
