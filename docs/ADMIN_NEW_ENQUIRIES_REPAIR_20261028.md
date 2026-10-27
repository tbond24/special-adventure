# New enquiries repair

28 October 2026, Australia/Perth. LIVE database repair; activated and catalogue-verified at 7:48 AM. Implementation source af9872837d0d53d90a2e5fd757330c0dec8f9b37.

## Agreed rule and issue

The owner confirmed one enquiry per recognised visitor–listing pair after the first successfully persisted visitor message. Another listing counts separately even with the same lister. Guests and registered visitors follow the same rule; registration preserves the existing visitor ID/history. Opening chat/prefill, failed sends, replies, follow-ups and retries must not add New enquiries.

Before: Overview counted conversation.created_at. Normal start_enquiry_impl already creates the conversation and first text in one transaction, so failed sends roll back together, but counting conversations does not independently require a persisted visitor message or deduplicate multiple conversations for the same visitor/listing. The existing message notification invalidates only messages, leaving a gap for first texts in older empty conversations.

## Options, chosen solution and scope

Options considered: continue counting conversations; introduce a dedicated first-contact recorder; derive first contact from the existing successfully persisted messages. Chosen: derive it from messages and group by listing and sender before filtering the period. This is the smallest supported correction and handles duplicate committed conversations without changing the Inbox/chat-writing path. Preserve the existing exclusion of conversations containing Admin members. Verify sender and current lister membership and ignore lister replies. No new table/index/identity system, permission, Auth setting or user-facing messaging redesign.

The message statement notification retains messages and adds enquiries. Existing optional-delivery handling, burst batching, reconciliation and private Admin/AAL2 channel remain unchanged. Empty messages are excluded. Guest upgrades on the same ID do not add another enquiry. The reader groups across all supported history before applying half-open time bounds, so later messages do not move an enquiry into a later period.

Only New enquiries is repaired here. Total messages still counts persisted messages; accepted-send request idempotency and its registered/non-registered split are separate pending work. This repair guarantees enquiry-count deduplication; it does not claim duplicate conversations/messages have been prevented or rewritten. No existing customer records are merged/deleted. Accounts/listings counting branches and Repeat visitors remain unchanged.

## Evidence and limits

Exact-source disposable SQL CI covers guest/registered first messages, older/empty conversations, replies/followups, two listings from one lister, duplicate accepted conversations/messages, failed transaction rollback, guest continuity, boundaries, Admin exclusions, notification groups, denied roles, guard/ACL equality, other metric results, fail-closed preconditions and exact data-preserving rollback. Duplicate committed rows are tested as report inputs, not real parallel product requests or a production load test. Initial CI caught an ambiguous first_at SQL reference; fixed with a qualified alias before any activation.

Read-only native aggregate: old/new Last 30 days both 4 at inspection. Equality alone does not prove corrected edge cases; disposable cases provide the positive/failure evidence. Native query execution was 9.009 ms on current data; no index was added. No production message/signup/email test is authorised or performed.

Historical counts depend on surviving messages, membership and current listing-owner relationships. Require the current owner to be a member before interpreting a sender as a visitor; unsupported/transferred/missing relationships are not assigned invented roles or dates. Deletion/administrative edits can affect this row-based report; it is not a permanent audit ledger. No source content, customer IDs, credentials or message text is stored in this receipt.

No live browser-control tool is currently available. Do not claim a new genuine signed-in Admin walkthrough or observed production message-driven push. Live acceptance must distinguish native catalogue/aggregate verification and synthetic browser checks from those unobserved behaviours.

## Release and rollback

Forward: supabase/migrations/20261027234335_admin_new_enquiries_first_message.sql, filename created by Supabase CLI 2.121.0 in GitHub Actions with SUPABASE_TELEMETRY_DISABLED=1 / DO_NOT_TRACK=1. Same established tools; no Codespaces dependency, new host, production credentials in CI, linked/reset database or automatic production deployment.

Rollback: supabase/rollback/admin_new_enquiries_20261028.sql. It checks the exact new reader and notification trigger before restoring the exact preceding definitions. Preserve all messages, conversations, membership, account/listing history, permissions and previous two repairs. No frontend rollback/deployment is required for this SQL-only change. Rollback must not overwrite a later repair; guards fail closed on changed definitions. No rollback has run.

STATUS/DECISIONS and live evidence will record actual hosted migration version and final verification. No merge or force-push. The previous disconnected-workspace blocker is resolved by the already-used GitHub Actions execution path; the inspection checkpoint is superseded by this repair record.

## Final release verification

Hosted migration 20261027234834 / admin_new_enquiries_first_message applied once; local CLI filename supabase/migrations/20261027234335_admin_new_enquiries_first_message.sql identifies that same change and must not be replayed. Frontend remains dpl_8EqEmyMnooZ5qsBPdwfcvSW84AwB; no Vercel deployment or alias/configuration change.

PASS: SQL CI 40604205931 / job 122539532793 on exact source af9872837d0d53d90a2e5fd757330c0dec8f9b37. PASS: isolated browser CI 40604205929 / job 122539532763, 152 passes / 22 intentional skips, same source. No local test run is claimed. The earlier prepared source had a SQL-name ambiguity, corrected before deployment; no test was weakened.

PASS: native installed reader equals the prepared definition; ACL unchanged; message trigger equals messages,enquiries; all six captured guard/send/notification/rate-limit function definitions unchanged; no new security-advisor findings. Native Last 30 days aggregate 4 before/after. No production customer/Auth/message writes or testing, apart from actual code-release metadata supabase:20261027234834, source af9872837d0d53d90a2e5fd757330c0dec8f9b37, deployment_id null. Existing engagement coverage unchanged.

UNVERIFIED: fresh genuine signed-in Admin display, production visitor send and observed private notification receipt, because browser control is unavailable. Synthetic browser checks and native database proof do not establish those unobserved behaviours. The tested rollback is prepared and has not run. Draft PR55 remains unmerged.

Evidence: evidence/admin-new-enquiries-live-20261028.json. Retain the earlier inspection as a historical checkpoint, not a current workspace blocker. Next metric, Total messages with Registered/Non-registered lines, remains pending its status-at-send versus current-status decision. No later repair has started.
