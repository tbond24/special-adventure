# Shared Admin live updates — 27 October 2026

Status: LIVE AND VERIFIED on getvacancy.site, 27 October 2026, 5:31 PM Australia/Perth. Source 65245db698fdcc62a2fc3c383d09cf1f9c9c9e4a; READY production dpl_AvcszD5rUieYjgEAQXeRxinwn2q2. Second sequential repair is complete. Change-based storage/listing history and row 3/6 fonts remain pending.

## Issue, options and choice

The owner requested real-time data for every card. Most Overview values refreshed on a minute timer, presence around ten seconds, activity feeds ten seconds and the separate five-minute-activity panel thirty seconds. Storage/live-inventory current reads were fresh, but historical observations were saved hourly.

Options discussed: fixed hourly or 5–15-minute recording; more frequent polling; a shared private change connection with protected aggregate re-reads. Chosen for this repair: the shared private connection. It reacts to recorded changes without repeatedly reading every report while nothing changes. Totals are re-read, never incremented from notifications, so duplicates do not inflate counts and a reconnect reconciles missed changes.

## Concrete implementation

- Pin and bundle @supabase/realtime-js 2.118.0 with esbuild 0.28.2. Bundle and dependency license notices are served locally and checked reproducibly in CI. No runtime CDN or new key/secret.
- One private channel, vacancy-admin-overview-v1, per visible Overview. Fifteen source-table statement triggers send only schemaVersion and metric-group names via realtime.send(..., true). No customer IDs, file names, contact details, entered content, message bodies, counters or record rows enter the payload. Managed Realtime adds its own message ID.
- New SELECT policy on realtime.messages reuses private.is_admin(auth.uid()), including active account, Admin membership and AAL2. Topic/extension checks confine it to this broadcast channel. No browser INSERT policy: clients cannot publish signals. No alteration of the managed Realtime schema/table, existing guard definitions or customer-table grants/policies.
- New public.admin_overview_live_access is SECURITY INVOKER and returns the existing guard result. Anonymous execution is denied. The connection checks it on start/every 30 seconds; each batched notification is checked again before reports run. A denial stops the connection and clears Overview data. Existing report guards remain authoritative on every read. Realtime channel authorization itself is cached by the service; token refresh and these current server checks address that limitation without broadcasting data.
- Reuse the existing session and refreshed JWT inside the backend adapter. No session export or additional sign-in state. Standard SDK heartbeats obtain current auth through the adapter; identity changes and hiding/removing Overview stop the connection.
- Briefly batch signals, with at most one affected report batch per two seconds. Same-period capacity cards share a read. Signals arriving during a stalled batch produce one trailing refresh. Reconnect performs a full reconciliation. The independent existing minute reconciliation continues even during continuous notifications, covering missed signals and time-dependent boundaries. Presence retains its current strict expiry.
- Discard cached report bounds at each new cutoff, while fetching only affected metric families, Recorded activity, journey/presence, locations, five-minute activity and the two feeds. Keep feed Pause/focus/in-view rules. Patch trusted report markup in place to preserve chart containers and open card tables; retain the prior map repair. Connection interruption and stale values are visible. Access denial clears the Overview.
- Optional element-tracking collection is not installed on the live site and is not activated by this repair. Existing installed dropdown choices are supported; a future new collector/table needs its own reviewed source trigger when introduced.

## Source mapping

| Source | Invalidates |
| --- | --- |
| auth.users | Accounts, presence, traffic, visitor feed |
| public.profiles | Current access, presence, capacity, locations |
| public.admin_users | Current access, presence, capacity, locations, traffic, journey, visitor feed |
| public.vacancies | New listings, current live count, locations |
| public.rooms / properties | Capacity, locations |
| public.media | Media counts |
| public.conversations | Enquiries |
| public.messages | Message counts |
| public.analytics_events | Traffic, journey, five-minute activity, installed tracking, visitor feed |
| public.listing_activity_log | Visitor feed |
| private.visitor_presence | Active now and map hints |
| private.engagement_events | Contact/Text cards, visitor feed |
| private.site_change_feed | Site-change feed |
| storage.objects | Current uploaded-file bytes |

Triggers are statement-level, not per row. They perform no aggregate scans. Delivery failures emit a generic warning and do not fail the customer operation. Notifications are transactional; rolled-back writes do not survive into the committed broadcast log.

## Verification and limits

- PASS: disposable PostgreSQL contract covers all fifteen sources; row/content-free private payloads; one signal for a 100-row statement; rollback; optional-delivery failure isolation; ordinary write success; Admin/AAL2 versus ordinary, AAL1, suspended, absent and anonymous callers; cross-topic denial; no browser publishing; helper execute denial; scoped rollback preserving data/unrelated policies and original Admin guard.
- PASS: final full isolated workspace 150 passes / 22 intentional skips, Australia/Perth, including eighteen new desktop/mobile cases. Source-specific updates, future selectable installed metrics, shared capacity read, 100-signal burst, trailing refresh, stable chart/disclosure, map state, stale/recovery, access clearing, disconnect/resume, periodic reconciliation during signals, private SDK configuration, malformed/duplicate signals, token refresh and withdrawn access.
- PASS: actual curated production composition and stability. The assembled template consumes selective capacity invalidation, updates values, preserves SVG/open values table and retains the explored journey branch; no page errors.
- Initial new tests exposed a fixed-value expectation, an icon selector mistaken for a chart, and a duplicate data-metric attribute introduced during icon stabilization. Corrected the tests/attribute and verified the full suite. A separate focused-run log ended before results; it is not claimed as a pass. The full suite provides the final sixteen-case result.
- Initial exact-source browser CI: 147 passes / 22 skips / one inherited comparison-fixture failure. The mock used a strict moving Date.now()-24h boundary, so a previous final bucket could receive the current-period value in the same millisecond (+80% rather than the asserted +100%). Freeze the test clock and classify fixture periods by their start day; retain the original +100%, range-order and zero-baseline assertions. No product comparison logic changed. The corrected exact-source CI result is recorded in the receipt.
- Hosted catalog inspection confirms postgres can create the required source triggers, Realtime RLS is enabled, existing Admin guard is executable by authenticated users, and no conflicting new trigger names/policies exist. Baseline advisor notices were captured for comparison; unrelated findings are not changed to make this feature pass.

This does not establish hosted activation, genuine live connection/delivery, live latency or a 100-person end-to-end load test. Those must be explicitly distinguished in the release receipt. No production visitor simulation, messages/listings/accounts or customer fault injection is planned. Use the actual release-ledger event for a genuine live delivery check. The connection status element keeps only last received group/time and a signal count as DOM diagnostics, so live acceptance can distinguish a received push from an ordinary polling result; these contain no customer data.

## Preserved definitions and pending next repair

Updates follow successful server recording, including existing analytics batching, privacy/exclusion choices and presence heartbeat. Offline departures remain estimates. Clock-only expiry and rolling windows reconcile on the existing bounded cadence; this is not zero-latency departure detection.

Storage/live-listing current values react to source changes, but the durable history schema/collector remains hourly in this repair. No past samples are rewritten. The next sequential repair is change-based history, including clock-driven listing expiry; it must not begin until this repair is verified. Row 3/6 font distortion remains pending.

## Install, rollback and release

Forward migration: supabase/migrations/20261027082948_admin_overview_realtime.sql. Exact scoped rollback: supabase/rollback/admin_overview_realtime_20261027.sql. Rollback removes only the fifteen triggers, this topic's receive policy, trigger helper and gate RPC. It preserves customer records, broadcasts already recorded, capacity history/jobs, existing guards and all unrelated policies. Restore frontend dpl_FuRgLR5Kdg9xGuB2yromDJRPn7JY. Keep all earlier checkpoints/draft PRs, no merge or force-push.

Use the curated production candidate builder, verify exact-source CI and staged/live assets, and verify the genuine Admin session. Only then report live. Hosted migration's returned version may differ from its local timestamp; record both as one change and never replay them as separate migrations.

Current docs/changelog checked: https://supabase.com/changelog.md, https://supabase.com/docs/guides/realtime/broadcast, https://supabase.com/docs/guides/realtime/authorization. Relevant July managed-schema restriction is respected; the announced November TLS cipher retirement does not affect current standard browser/Node clients. SDK API was checked against installed pinned source.

Hosted checkpoint: forward migration installed as 20261027090540 / admin_overview_realtime (local file 20261027082948 identifies the same change, not a second migration). All fifteen triggers, topic policy, invoker gate, denied helper/anonymous grants and unchanged Admin/active-user guard definitions verified. Current frontend remains dpl_FuRgLR5Kdg9xGuB2yromDJRPn7JY. See evidence/admin-realtime-hosted-20261027.json.

Verification checkpoint: d3212b8 browser CI 40477529772 attempt 1 reached its ten-minute job limit after an unusually slow Chromium installation; it was cancelled during tests, not failed on an assertion. Attempt 2 / job 122104183990 passed all 148 browser cases / 22 intentional skips and the reproducible bundle check. Final cache/queued-refresh hardening below receives its own exact-source run.

Final interaction hardening: a partial update advances the common cutoff, so any old cached period report must be discarded even when its family was not fetched. This keeps period changes from validating old bounds against a new cutoff. Only affected reports are fetched. A manual request queued behind an active live read keeps its Refreshing/disabled state and completes as a full read. Eighteen focused desktop/mobile cases now pass, including these two edge cases.

Hosted send check initially failed with zero retained probe rows. Catalog inspection found no partitions under the managed range-partitioned realtime.messages table. A normal SDK subscription started the Realtime service, which created its current/future partitions. The same rollback-only native send then produced one visible transaction row and zero rows after rollback. No lasting test event or customer record was created. The anonymous private-channel attempt was rejected; a public subscription could connect. No managed-schema DDL was issued to initialize the service. Actual private delivery/non-leakage on a real release remains a publication acceptance step.

## Final publication receipt — 5:31 PM Australia/Perth

- Final source 65245db698fdcc62a2fc3c383d09cf1f9c9c9e4a: workspace CI 40480026665 / job 122107715546 PASS, 150 passed / 22 intentional skips; reproducible vendor/license bundle PASS. Database contract CI 40480032287 PASS. Local final suite independently 150/22; actual curated composition PASS.
- Curated 124-file candidate staged as dpl_DJqv8PZMjWc2FUgc7X4Yaonkvycq. All eleven files changed from the previous release match their SHA-256 on stage, production and getvacancy.site. READY production dpl_AvcszD5rUieYjgEAQXeRxinwn2q2 owns the canonical alias. Public CSS/features and metric definitions were preserved.
- Genuine existing Admin/AAL2 session reloaded successfully; eight current cards returned data and the private channel visibly showed Live updates. No additional login was needed.
- The real release ledger wrote one code and one Overview UI entry, asserting engagement coverage was already enabled and byte-for-byte unchanged. The channel received actual site_feed signals at 09:30:29.124Z after commit confirmation at 09:30:28.991Z, and the feed displayed the release. This single observed latency is not a general SLA. Signal count changed 1→3, distinguishing push delivery from periodic polling.
- Find remained selected, transition counts stayed open, map height 754.296875 px, feed document top 1947.609375 px and scrollY 1284 all stayed unchanged across delivery.
- Concurrent anonymous standard-SDK private subscription was rejected. An anonymous public subscription to the same topic remained connected across the real commit and received zero events. Its full two-minute observation finished normally; no customer activity, message, account or listing was fabricated.
- Existing guards and advisor findings remain unchanged. Hosted migration 20261027090540 is the same change as local 20261027082948; never replay it as an extra migration. The earlier hosted/frontend-pending paragraphs above are chronological checkpoints superseded by this receipt.
- Before: most values waited for polling. Now: recorded source changes notify visible Admin and re-read only affected protected reports; offline/reconnect and independent reconciliation remain truthful. Durable capacity history is still hourly, time-only boundaries remain bounded, and font work is pending. Neither next repair was started.

Evidence: [live JSON](evidence/admin-realtime-live-20261027.json), [manifest](ADMIN_REALTIME_RELEASE_MANIFEST_20261027.json), [screenshot](evidence/admin-realtime-live-20261027.jpg). Draft PR50 remains unmerged. Restore frontend dpl_FuRgLR5Kdg9xGuB2yromDJRPn7JY and apply only the scoped rollback file if required; preserve historical observations and customer records. No rollback was performed.
