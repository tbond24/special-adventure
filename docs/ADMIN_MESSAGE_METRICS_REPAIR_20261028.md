# Message metric names and sender lines

28 October 2026, Australia/Perth. LIVE: published and native/automated checks PASS. Final genuine Admin acceptance remains UNVERIFIED because the secure sign-in timed out and the browser environment became unavailable. Continue from PR55 receipt eed0f602a770978f4ebf0f2b17d168ebed55cc26, preserving its actual live first-contact implementation af987283 / hosted 20261027234834 and prior account/listing repairs.

## Outcome, issue and choice

The owner's latest instruction is to build the agreed output, leanly and without unrelated changes. First-contact counting was already repaired on the newer remote branch: one recognised visitor–listing pair on its first successfully persisted visitor text, guests included; another listing counts separately. Remote inspection explicitly records the owner's approval of this rule. The older local plan and my initial cross-listing interpretation were superseded; do not overwrite this published repair.

Before this repair, the frontend still calls that measure New enquiries and the all-message measure Messages sent, with one unsplit line. Now: labels New Messages sent and Total messages sent; both show Registered and Non-registered lines and retain their existing total/comparison/period/card settings. First-contact and total values retain the current meanings and Admin exclusions. The first-contact Recorded activity label follows the same definition.

Options considered: add a separate classification recorder, or reuse the already-authoritative verification dates for existing messages. Chosen: extend the existing guarded reader with per-bucket sender counts; no new table, collector, Auth write, permission, send handler, identity rewrite, contact-button or public UI change. Registered at send means a non-anonymous account whose recorded verification date is at or before that message/first-contact time. Guest messages before later verification remain Non-registered; subsequent messages can be Registered. This follows the agreed verification-based registration model and keeps history stable through normal guest upgrade.

Available history is row-based, not a new immutable audit. Administrative timestamp edits/deletion can affect it. Missing Auth evidence is returned as an explicit unknown count, never fabricated as registered/guest; the total stays visible and a concise status-unavailable note appears only when needed. Malformed/unreconciled split data retains the valid total with Breakdown unavailable and no false lines. Current native inspection found nine messages, all with Auth evidence, and no anonymous account confirmed before sending. No customer IDs or message contents are recorded here.

## Scope and verification

Only message/enquiry split fields are added to public.admin_card_series; original value totals, other branches, bounds, Admin/AAL2/active-user controls, ACLs and current messages,enquiries notifications remain intact. Keep saved enquiries/messages keys; do not inject new default cards or change the owner's layout. Rename the existing two metrics, not the public Message button (that later feature remains pending).

PASS local disposable SQL: existing total/first-contact meaning, registered/guest counts, guest upgrade without historical reassignment, replies/followups, approved per-listing grouping, missing history, Admin exclusions, failed transactions, half-open boundaries, other metrics/access/ACLs, fail-closed migration and exact data-preserving rollback. No hosted test messages/signups/emails. Local browser tests could not launch because the Chromium executable is absent; this is NOT a passed browser run. Exact-source CI runs desktop/mobile UI and actual curated composition/state checks before activation.

Local offline CLI initially lacked npm registry metadata. The telemetry-disabled pinned online invocation produced an uncertain tool response; inspection found the actual CLI-created single empty file 20261028000223_admin_message_metrics_split.sql and installed CLI 2.121.0 package. Filled that existing file once; did not invent a timestamp or replay generation. No hosted migration has been applied at this checkpoint.

The genuine Admin session is expired and currently shows sign-in. Complete implementation and automated/staged checks before requesting the normal owner sign-in/MFA needed for final live display/push acceptance. Never bypass Auth or claim synthetic/native aggregate checks prove an unobserved visitor send.

## Activation and rollback

Forward: supabase/migrations/20261028000223_admin_message_metrics_split.sql. Record the provider's actual migration version after activation; differing timestamps represent the same change.

Guarded rollback: supabase/rollback/admin_message_metrics_20261028.sql restores the exact PR55 reader and preserves all messages, identities, first contacts and earlier repairs. Restore the matching immediately previous frontend dpl_8EqEmyMnooZ5qsBPdwfcvSW84AwB for the original labels/single lines. Do not overwrite later reader repairs; the guard fails closed. Rollback tested in disposable PostgreSQL and not run on production. The release details below supersede the prepared checkpoints. Keep identity/Call/Message work paused until the real Admin acceptance is completed.


## Initial browser CI checkpoint

Source 1386f66 passed both new message-card cases, but full CI had 151 passes / 22 skips / 3 failures before curated checks could run. Two failures were the existing shared-cutoff fixture race (desktop/mobile); one was the existing contact-mode test expecting five browsers while UTC's just-after-midnight Today fixture has a single bucket and correctly returns three. Fix only test preconditions: select a 30-day fixture period for that count-mode assertion; settle both report filter requests before dispatch, use distinct fixed timestamps and require both read counts to increase. Existing expected values and cutoff assertions remain, with a stronger refresh-read assertion. No product contact/journey code changes. Retest exact source before release; do not claim the failed run passed.


Second verification checkpoint: ab74c0f passed all 154 desktop/mobile browser cases with 22 intentional skips, including both corrected legacy test preconditions. The curated script then exposed the same midnight-sensitive assumption in its own fixture (expected capped 480 visits, actual single-bucket 140). Set a fixed midday, sub-hour fixture timestamp in the two curated checks, retaining expected counts and all state assertions. This changes test clocks only; actual application, SQL and all 124 release files remain identical. Curated acceptance is not claimed passed until the rerun completes.


## Published release and final verification boundary

Actual released application/SQL source aa7e525679eb436aa194bab64781da2875bb7d79; READY production dpl_DZoTSvnQmVPyCcfwHGCfRiZcSF6q, canonical https://getvacancy.site/#admin. Hosted migration 20261028002450 / admin_message_metrics_split applied once; local 20261028000223 is the same change, not a second migration. No merge or force-push; PR56 stays draft.

PASS: exact-source SQL CI 40608144846 / job 122552715099; full workspace CI 40608138897 / 122552694517, 154 passes and 22 intentional skips. Both actual curated composition/message-line assertions and retained-state checks passed with no page errors. Initial runs and their fixture corrections remain recorded above; no failing run is represented as passed, and local browser launch remains unavailable rather than a local pass.

PASS: all five changed file hashes match stage, production and canonical live. Staging source 1386f66 produced exactly the same 124 artifact files as final source aa7e525; intervening changes only corrected test preconditions/records. Installed function exactly matches the tested definition. Six ACLs preserved; the five other captured guard/send/notification functions are unchanged. Security advisors remain the same 32 findings with no new/removed findings. Existing first-contact values, saved keys/card layout and prior repairs retained.

Native Last 30 days aggregate observed at 08:11 Perth: New Messages sent 4 (Registered 2, Non-registered 2); Total messages sent 5 (Registered 3, Non-registered 2), no unknown statuses. These are native aggregate checks, not a fresh signed-in Admin display. Live assets/installed reader were reconfirmed after the browser timeout and still match this release.

Two real code/Overview release receipts recorded in the existing ledger using the actual deployment and source, with engagement coverage unchanged. Ledger recording occurred after the authentication timeout at 09:27 Perth; it does not imply that publication waited until then. No customer/Auth/message/email test data was created.

UNVERIFIED: final signed-in owner display, actual visitor send and observed message-driven private push. The secure credential request timed out; its authentication outcome is unknown, and the browser environment then became unavailable. No credential values were read/exported, no bypass attempted, and no alternate credential entry used. Do not claim this repair fully verified end to end or move to the next problem. Resume only when a usable shared Admin browser session is available; check normal MFA, temporarily inspect both metrics/Last 30 days, compare counts, preserve/restore the original card choices, and save genuine proof. Do not ask for credentials in chat or suggest that a separate personal browser signs in the unavailable shared session.

Recorded rollback remains tested and has not run: restore dpl_8EqEmyMnooZ5qsBPdwfcvSW84AwB and supabase/rollback/admin_message_metrics_20261028.sql. Its guard protects later reader edits and it preserves all account/listing/first-contact/message history. Manifest: ADMIN_MESSAGE_METRICS_RELEASE_MANIFEST_20261028.json. Evidence: evidence/admin-message-metrics-live-20261028.json.
