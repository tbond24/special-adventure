# Message metric names and sender lines

28 October 2026, Australia/Perth. PREPARED, not published. Continue from PR55 receipt eed0f602a770978f4ebf0f2b17d168ebed55cc26, preserving its actual live first-contact implementation af987283 / hosted 20261027234834 and prior account/listing repairs.

## Outcome, issue and choice

The owner's latest instruction is to build the agreed output, leanly and without unrelated changes. First-contact counting was already repaired on the newer remote branch: one recognised visitor–listing pair on its first successfully persisted visitor text, guests included; another listing counts separately. Remote inspection explicitly records the owner's approval of this rule. The older local plan and my initial cross-listing interpretation were superseded; do not overwrite this published repair.

Before this repair, the frontend still calls that measure New enquiries and the all-message measure Messages sent, with one unsplit line. Now prepared: labels New Messages sent and Total messages sent; both show Registered and Non-registered lines and retain their existing total/comparison/period/card settings. First-contact and total values retain the current meanings and Admin exclusions. The first-contact Recorded activity label follows the same definition.

Options considered: add a separate classification recorder, or reuse the already-authoritative verification dates for existing messages. Chosen: extend the existing guarded reader with per-bucket sender counts; no new table, collector, Auth write, permission, send handler, identity rewrite, contact-button or public UI change. Registered at send means a non-anonymous account whose recorded verification date is at or before that message/first-contact time. Guest messages before later verification remain Non-registered; subsequent messages can be Registered. This follows the agreed verification-based registration model and keeps history stable through normal guest upgrade.

Available history is row-based, not a new immutable audit. Administrative timestamp edits/deletion can affect it. Missing Auth evidence is returned as an explicit unknown count, never fabricated as registered/guest; the total stays visible and a concise status-unavailable note appears only when needed. Malformed/unreconciled split data retains the valid total with Breakdown unavailable and no false lines. Current native inspection found nine messages, all with Auth evidence, and no anonymous account confirmed before sending. No customer IDs or message contents are recorded here.

## Scope and verification

Only message/enquiry split fields are added to public.admin_card_series; original value totals, other branches, bounds, Admin/AAL2/active-user controls, ACLs and current messages,enquiries notifications remain intact. Keep saved enquiries/messages keys; do not inject new default cards or change the owner's layout. Rename the existing two metrics, not the public Message button (that later feature remains pending).

PASS local disposable SQL: existing total/first-contact meaning, registered/guest counts, guest upgrade without historical reassignment, replies/followups, approved per-listing grouping, missing history, Admin exclusions, failed transactions, half-open boundaries, other metrics/access/ACLs, fail-closed migration and exact data-preserving rollback. No hosted test messages/signups/emails. Local browser tests could not launch because the Chromium executable is absent; this is NOT a passed browser run. Exact-source CI runs desktop/mobile UI and actual curated composition/state checks before activation.

Local offline CLI initially lacked npm registry metadata. The telemetry-disabled pinned online invocation produced an uncertain tool response; inspection found the actual CLI-created single empty file 20261028000223_admin_message_metrics_split.sql and installed CLI 2.121.0 package. Filled that existing file once; did not invent a timestamp or replay generation. No hosted migration has been applied at this checkpoint.

The genuine Admin session is expired and currently shows sign-in. Complete implementation and automated/staged checks before requesting the normal owner sign-in/MFA needed for final live display/push acceptance. Never bypass Auth or claim synthetic/native aggregate checks prove an unobserved visitor send.

## Activation and rollback

Forward: supabase/migrations/20261028000223_admin_message_metrics_split.sql. Record the provider's actual migration version after activation; differing timestamps represent the same change.

Guarded rollback: supabase/rollback/admin_message_metrics_20261028.sql restores the exact PR55 reader and preserves all messages, identities, first contacts and earlier repairs. Restore the matching immediately previous frontend dpl_8EqEmyMnooZ5qsBPdwfcvSW84AwB for the original labels/single lines. Do not overwrite later reader repairs; the guard fails closed. Rollback tested in disposable PostgreSQL and not run on production. Live/staged source, deployment, assets, CI, catalogue/advisors, acceptance and release receipt are pending and must be recorded accurately before advancing to identity/Call/Message work.
