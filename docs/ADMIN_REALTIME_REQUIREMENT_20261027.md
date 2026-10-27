# Admin live-data requirement — 27 October 2026

Status update, 27 October 2026: stable refresh and private live updates for all installed current metric families are PUBLISHED and verified (see ADMIN_REALTIME_UPDATES_REPAIR_20261027.md). Change-based capacity history is now PUBLISHED and genuinely verified (ADMIN_CAPACITY_CHANGE_HISTORY_20261027.md), retaining earlier hourly observations. Primary updates are event-driven; time-only expiry, concurrent coalescing and recovery retain documented bounded clocks. Font repair remains pending. The source-audit and proposed-state text below is the original historical requirement, superseded by those repair receipts where marked.

## Owner instruction

“I want data to be in real time for every card.”

This replaces the earlier hourly-only history requirement for the File storage used and Live listings cards. It applies to all available Overview metric cards, future cards using the template, Recorded activity, the visitor journey map and the existing activity/location panels. It does not authorize unrelated layout, copy or public-feature redesign.

## Observed source behaviour

Audited remote storage-card branch d7e184cbc24ac6c4a297d5858186a569ce9276c1 and documentation-only audit branch dbbb493a7ed6cdec9e02333b47cbf3d5cfe57dc6. Local product source is 8c2c6383b7ab02323cb00420d0e9d9c22a3991be, the recorded released application source. Remote open PRs 44–47 retain prior repairs and audit. No branch or PR was merged or overwritten.

| Surface/source | Present behaviour | Required result |
| --- | --- | --- |
| New accounts, new listings, enquiries, messages, media; Visits & unique visitors; Repeat visitors; Contact/Text and listing-step cards | Shared refresh after each completed batch plus 60 seconds; selected period and comparisons re-read | Refresh affected cards promptly after server-side recording; current period and comparison use the same cutoff |
| File storage used and Live listings | Fresh current aggregate on each shared read; one saved aggregate per hour | Prompt current aggregate updates plus durable change observations, including changes made while Admin is closed |
| Active now | Separate approximately 10-second reads; result expires; source browser heartbeat approximately 30 seconds | Push recorded arrivals, departures and page changes promptly, plus clock-driven expiry; accurately retain the bounded presence definition |
| Recorded activity | Rebuilt on the shared minute cycle | Updates with its source metrics without clearing the graph/table during a read |
| Journey history | Shared minute refresh clears map, selection and expanded details | Update recorded journeys promptly; preserve current branch, open details, focus and reading position |
| Journey active nodes | Approximately 10-second reads; expiring hints | Share relevant presence updates and expire abandoned presence even when no new event arrives |
| Site changes and Visitor activity feeds | Approximately 10-second polling while visible/in view; deliberate Pause and focus deferral | Prompt updates when running; preserve intentional Pause and avoid interrupting reading/focus |
| Existing Live activity panel | Approximately 30-second polling, plus shared refresh | Prompt updates to its existing five-minute activity definition |
| Listings by location | Initial/manual/shared minute read | Refresh on relevant listing/location/status changes and timed listing expiry |

Sources: app/src/admin-overview-cards.js, admin-overview-insights.js, admin-activity-feeds.js, admin-journey-map.js, visitor-presence.js, analytics-controls.js, element-tracking.js, engagement-tracking.js; existing capacity migrations and release record. This is a source audit, not a new hosted walkthrough or latency benchmark.

## Options discussed and proposed choice

Earlier discussion contrasted hourly collection with 5–15-minute collection. Those fixed intervals do not meet the owner's new request. Faster polling alone would repeatedly run reports when nothing changed and amplify the known journey refresh problem.

Proposed: one private, Admin/MFA-authorized update connection shared by the Overview. Database-originated signals identify which aggregate groups changed, without transmitting customer rows or message contents. Re-read the affected existing protected aggregate endpoints; treat signals as invalidation hints, never as authoritative counter increments. Batch bursts briefly, reuse same-period reads and reconcile after reconnect. Include a bounded fallback and explicit stale/unavailable state; do not call fallback polling a live connection.

Use current Supabase Broadcast documentation during implementation:
- https://supabase.com/docs/guides/realtime/broadcast
- https://supabase.com/docs/guides/realtime/authorization

No SDK, channel, trigger or policy has been selected/installed yet. Existing backend is a fetch-based adapter, so integration and bundled-client choice need explicit implementation review; do not assume an existing Supabase channel client.

## Meaning of real time

Target: affected visible current-period cards update within seconds after the backend records a successful change under a healthy connection. A numeric latency target must be measured across browser action, event ingestion, commit, notification, protected aggregate read and rendered output before claiming it is achieved.

- Successful product actions count after commitment, not before.
- Existing analytics batches wait approximately 600 ms before sending and retain retry/privacy/exclusion behaviour. A faster dashboard cannot display an unreceived or intentionally excluded event.
- Historical periods retain their selected dates; a message today must not increase Yesterday.
- Presence remains a recent-activity estimate. Abrupt power/network loss cannot produce an immediate reliable departure. Use existing expiry semantics, time-driven refresh/expiry and honest labels; do not claim an exact number of people online.
- Time-dependent changes (presence timeout, listing expiry, midnight and rolling time windows) need clock-driven reconciliation, even if no database row changes.
- Preserve uploaded-file storage scope; do not silently include database size or imply a storage quota.

## Historical recording

Storage/listing history must record aggregate changes as they occur at the server, while Admin is open or closed. Keep prior hourly observations and their true timestamps; do not fabricate earlier fine-grained data. A periodic reconciliation observation may remain as a safety net, but must not be the only source of new historical observations.

Review all data paths: file insert/update/delete and asynchronous metadata completion; room/property/profile changes affecting active/unexpired listing eligibility; status/reconfirmation and time-based expiration. Change recording must not place a full aggregate scan on every presence heartbeat or break customer writes if optional dashboard notification fails. Handle concurrent transactions and burst coalescing explicitly; if coalescing loses intermediate states, document the actual resolution rather than claiming every transition is preserved.

The current history schema has an immutable hour primary key, a capture-within-hour constraint and a reader/renderer intervalMinutes=60 contract. Changing only the cron expression would silently discard sub-hour observations. Prepare a tested forward migration/reader contract and rollback; preserve the original history.

## Stable presentation prerequisite

The earlier live audit in PR #47 confirmed the journey map collapses during reads, closes its transition table and resets the explored branch. Correct refresh state preservation before enabling frequent updates. Patch existing DOM contents when possible. Keep previous successful data during an update; visibly mark it stale on failure. Preserve active focus, expanded table, selections and scroll. Clear sensitive data and close connections on sign-out, identity change or lost Admin/MFA access.

The row 3/6 chart-font repair remains a separate previously proposed repair. Do not silently bundle unrelated typography changes into live-data work.

## Implementation order and acceptance

1. Inventory every metric's exact source tables/RPCs and timed transitions; map them to shared invalidation groups. Confirm deployed function definitions and existing Realtime policies without reading customer content.
2. Repair stable refresh/state preservation required by more frequent updates.
3. Add authenticated private notification transport with bounded reconnect, lifecycle cleanup and a reconciliation fallback. Re-read through existing Admin/AAL2-guarded endpoints.
4. Prepare change-based capacity history and retain all previous hourly observations.
5. Test in isolated/disposable environments: successful source changes in every metric family; bursts, duplicate/out-of-order/missed signals, reconnect, slow/error reads; no notifications for rolled-back writes; timed expiry and midnight; selected historical periods; paused feed and table/branch/focus preservation.
6. Verify anonymous, ordinary, suspended, non-Admin and AAL1 sessions cannot subscribe or obtain aggregate data; permission loss cannot continue protected reads. Preserve deny-all direct access to private aggregate history.
7. Test 100 simulated listers/visitors with realistic event rates in an isolated environment; measure query volume, event-to-screen latency and UI stability. Do not run load tests against production.
8. Prepare a staged candidate with exact source/asset manifest and rollback. Only report live after the scoped hosted changes, publication and genuine Admin acceptance have actually occurred.

## Rollback and publication

No new rollback operation is needed for this requirement-only record. Preserve currently published frontend dpl_9THHwRembrMAtVo3M37FQZZSLJH4 and the hourly collector/history. Implementation must include scoped transport/trigger/job rollback without deleting observations or altering unrelated policies/customer data.

Repository AGENTS.md requires a scoped authorization for hosted operations beyond ordinary development. Prepare a concrete tested candidate and forward/rollback plan before a final hosted-activation approval if that authorization has not already been supplied for the selected changes.

## Completion reporting

For each repair, record issue, options actually discussed, chosen solution and why, before/after behaviour, measured validation, rollback and explicit local/staged/live status in docs/STATUS.md and consequential decisions in docs/DECISIONS.md. This file records the new requirement; it is not a claim that real-time behaviour has been built.
