# Vacancy admin metric change plan

27 October 2026, Australia/Perth. Status: execution authorised by the owner's “begin”. Baseline verification and item 1, New registered accounts, are complete and live; remaining items are pending. This document originally recorded planning only; implementation receipts distinguish the actual releases. Repeat visitors remains unchanged.

Execution receipt: ADMIN_REGISTERED_ACCOUNTS_REPAIR_20261027.md, source 2fb6c486719b179e6989a6beb37c77bc91d67682, deployment dpl_8EqEmyMnooZ5qsBPdwfcvSW84AwB. The next item is successful-first-publication New listings. Do not treat later definitions or held work as implemented.

## Scope and agreed rules

- New accounts becomes **New registered accounts**, counted once on first successful verification and attributed to verification completion. A guest registering retains their existing visitor history.
- New listings counts first successful publication, not a Submit press or early draft-row creation. Failed attempts and retries must not inflate it.
- New enquiries remains a first-successful-visitor-message measure, including guests, separate from **Total messages sent**. Total messages includes successful initial messages, follow-ups and replies, with Registered and Non-registered lines.
- Contact clicks becomes **Call clicks**. Text clicks becomes **Message clicks**. Count one action of each kind per recognised visitor and listing. Revealing a number and then calling the same listing is one Call action; another listing can contribute another action.
- Rename the listing's “Is this available?” action to **Message**. Open chat with the listing context and “Is this available?” ready but unsent. Sending remains an explicit visitor action; successful sends, not presses, feed message metrics.
- Show Call and/or Message according to the lister's chosen communication routes. Reuse actual existing preference/contact/send interfaces where they support the requested behaviour; do not redesign the Inbox or add unrequested routes.
- Replace Visits and unique visitors with **New visitors vs Total visitors**. New is the subset first encountered during the selected period; Total contains all recognised identities seen during that period, each counted once. New is included in Total.
- Under the owner's model, each guest device represents one user. Each recognised visitor has a unique internal ID, not shown in the UI. Verification adds account details to that identity; an existing-account sign-in uses its established identity, including across devices. Account switching does not generate fresh identities. A fixed 90-day identity reset does not fit this proposed continuity rule.
- File storage and Live listings already have database-driven live updates. Verify the requested add/remove/status/expiry behaviour; do not rebuild working recording/transport. Their current definitions and any exclusion mismatch must be checked explicitly before changing them.

## Complexity order and dependencies

These are relative estimates grounded in the current interfaces, not promised durations. Reassess only when inspection finds a concrete dependency. The order keeps independent changes early and puts identity continuity before the click deduplication that depends on it.

| Order | Work item | Relative complexity | Bounded implementation and acceptance |
| --- | --- | --- | --- |
| 0 | Baseline and existing live storage/listing checks | Very low; verification | Reconfirm live deployment/source and relevant installed functions, save rollback references, check additions/removals/status/expiry against existing tests and appropriate read-only live evidence. Change code only for a demonstrated gap inside the agreed rule. |
| 1 | New registered accounts | Low to medium | Inspect authoritative verification fields and the guest-upgrade route. Change label and counting rule together. Prefer existing verification timestamps; introduce recording only if necessary. Verify ordinary registration, guest conversion, repeat verification/login and failed verification. |
| 2 | New listings | Medium | Trace the actual final publish acknowledgement/commit for new listings and units. Reuse authoritative success records where reliable; add minimal recording only if existing records cannot distinguish successful first publication. Verify draft/failure, success, repeated request/lost response and later deactivation. Do not rely on created_at or assume published_at alone proves final success. |
| 3 | New enquiries | Medium; definition boundary pending | Reuse the existing atomic first-message operation where it meets the rule. Count only a successful initial visitor-to-lister text, including guest senders. Settle what “first” means across multiple listings for one lister before this repair. Verify failed sends, retries, first send, replies and follow-ups. |
| 4 | Total messages sent with two lines | Medium; historical classification pending | Keep all successful messages, including replies. Decide whether classification is status at send time before changing historical reads; use existing data where sufficient and minimal new capture where necessary. Verify guest/registered sends, failures, replies and later account verification. Do not invent missing historical classifications. |
| 5 | Persistent visitor identity and New versus Total visitors | High; prerequisite for item 6 | Reuse existing browser/account identifiers and confirmed identity relationships. Add only the missing first-seen/continuity information. Preserve guest history through verification and recognised accounts across devices; implement New as a subset of period-deduplicated Total. Inspect existing account-switch handling before assigning identity. Preserve Repeat visitors' card, query definition and settings; regression-test shared paths. No fingerprinting or new general analytics platform is in scope. |
| 6 | Listing Call/Message entry, preferences and deduplicated click cards | High; depends on item 5 | One coherent feature with separately checked substeps: inspect existing communication preferences and contact access; implement only the requested button visibility and allowed number reveal; connect Message to existing guest/registered chat sending with listing context/prefill; capture listing/action/recognised-identity relationships; enforce deduplication on accepted records; rename metric labels with their corrected sources. Verify reveal-then-call, repeat presses, different listings, each permitted route, registration continuity and successful/failed sends. Keep unrelated messaging UI intact. |

The Message label is not shipped alone while a card called Message clicks still measures Send presses. Similarly, New registered accounts is not relabelled as verified while its read still counts unverified accounts. Each release must have a truthful end-to-end meaning.

## Details not to invent

Resolve a missing rule only when the relevant item is ready; continue independent work where possible. One focused clarification should state the concrete consequence.

- First enquiry: first per listing conversation, or first per visitor–lister relationship across listings.
- Message split: classification at send time versus current account status. Status at send time was recommended, not expressly confirmed. Registered lister replies are part of the agreed total-message volume.
- A reset period for per-listing clicks has not been specified. Do not introduce one silently.
- Admin exclusions currently differ between listing metrics. Do not silently include/exclude different populations while changing their triggers.
- Retention is future work: 30 days was mentioned, not selected. Removing old activity and forgetting visitor identities have different effects. No purge or cleanup job is authorised by this plan.
- Preserve first-contact terminology until any final label clarification; the success rule and separate Total messages measure are the agreed core.

## Lean delivery cycle for each repair

1. State the exact issue, scope, expected before/after and acceptance cases. Check the current source and relevant hosted definitions; distinguish evidence from assumptions.
2. Capture the immediate previous source/deployment and relevant function, trigger, grant/policy and job definitions, without customer content or credentials. Use a separate task branch and draft PR against the current development branch. Preserve earlier work; no default merge or force-push.
3. Implement the smallest supported change. Reuse existing reporting, private notifications, account verification and messaging paths. Keep product writes independent of optional analytics delivery. No new tracking platform, broad refactor or unrelated UI work.
4. Prepare the scoped rollback before hosted activation. Test targeted counting, retries/failures, access boundaries and affected UI state. Run the required isolated workspace checks once; rerun or broaden only after a change, failure or unresolved concern. Simulate bursts/concurrency locally when the change warrants it; do not load-test production.
5. Prepare the curated candidate, exact source/asset manifest and focused staged checks. Apply only the necessary, tested hosted changes within the relevant authorisation. Record actual returned migration versions and inspect uncertain results before any retry.
6. Publish and verify the genuine Admin/public flow as appropriate, expected report updates, safe access and live assets. Screenshots and mock tests support their actual scope; neither proves an untested backend operation. State PASS, PARTIAL, FAIL or UNVERIFIED accurately.
7. Save the repair receipt and send the owner its substance before starting the next item. If the item is not fixed and verified, keep it current instead of claiming completion or quietly moving on.

## Records and rollback

Last recorded live baseline: application source f6452ec89f0414c92325e48d837567b064af5ab7, release-record commit 96878b036fea6fec3da4cfddaf1eb73bd1d5765c, deployment dpl_9kWUEpw1BKmhBgYs8gbVNg7uBR5y. Evidence/manifest: ADMIN_CAPACITY_CHANGE_HISTORY_20261027.md and ADMIN_CAPACITY_CHANGE_RELEASE_MANIFEST_20261027.json. Recheck the actual live deployment before each repair; do not blindly reuse a stale baseline.

Each repair receipt belongs in docs/STATUS.md and its focused repair record, with consequential choices in docs/DECISIONS.md. Include: issue; actual options considered; chosen solution and why; before/after; affected files/functions; tests and limitations; source/deployment and hosted migration versions where applicable; explicit live/staged/not-published state; exact rollback and evidence references.

Frontend rollback restores the immediately previous verified deployment, not the first baseline after later successful repairs. Database rollback restores only the captured changed definitions/grants and disables the new recording/trigger/job when required. Preserve existing and newly recorded customer activity/history. Leave additive data structures inert where dropping them would destroy records. Test that the old reader/frontend still works. Do not restore an old whole-database snapshot over activity accumulated after release.

The exact per-repair rollback SQL depends on the actual implementation and must be written and tested before its hosted activation. This plan does not claim those future scripts already exist. Existing release rollback checkpoints remain available; no rollback is executed by this planning task.

## Owner updates

At the start of each repair, explain what it will change and what evidence will verify it. During active work, provide a meaningful update at least once a minute: finding, current status, next check or concrete blocker. Report scope-changing findings before making the broader edit. Do not send repetitive tool logs, invented progress percentages or unsupported completion estimates.

At completion, report issue, solution/options, choice/why, before/after, checks and limitations, exact live status, saved record and rollback. Only then move to the next repair. If provider approval or a missing definition blocks an action, explain the exact action and reason rather than silently using another route or pretending it completed.

## Explicitly held work

Repeat visitors remains unchanged. Media uploaded is deferred. Active now's definition and the one-second refresh proposal are not changed here. Font repair, public grid, map icons/zoom, broader message UI, saving-button tweaks, and data-retention cleanup remain separate queued work. The only chat changes in this plan are the requested listing entry/context/prefill and communication-route behaviour.

## Planning validation

Read current repository instructions/status, inspected relevant report/publish/message interfaces, and checked remote branch tips/open PRs. Base is the existing capacity-history release-record commit; all earlier branches/PRs remain intact. This task writes documentation only. No application tests are needed for the planning text; inspect the diff and confirm no application/migration/configuration/deployment files changed.
