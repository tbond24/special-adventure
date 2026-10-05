# Vacancy admin and visual visitor journey — consolidated correction plan

**For approval, not implementation.** This supersedes the *scope interpretation* of the bounded Marketing checkpoint, not its code or evidence. Existing work remains preserved. No deployment, public instrumentation, database change or UI implementation is authorized by this document alone.

## 1. Final outcome

A coherent, attractive admin operations console using the supplied reference's light surfaces, white panels, restrained borders/shadows, established system font, blue accents and clear navigation. Marketing's primary product is a **truthful visual journey from recorded acquisition through actual listing creation to reliably linked publication**. Tables support this experience; they are not the final substitute for it.

Existing public appearance, navigation, fields, validation, publication behavior and authentication experience stay unchanged. Background collection and database reporting dependencies are proposed separately below. No advertising creation/spend controls, workflow engine, replay, fingerprinting, cross-device matching, new analytics vendor or unrelated refactor.

I used the completed audit/checkpoints and inspected only unresolved integration points: current section grouping, collector identity/entry triggers, draft serialization, unit request IDs and publication history. I did not repeat the full audit or rerun completed tests for this planning task. Planning follows the Vacancy Method and the owner's design guidance, with this explicit reference taking priority.

## 2. Completed work and remaining gaps

| Area | Confirmed development work to retain | What must still be delivered |
|---|---|---|
| Admin | Existing operational sections, controls, membership/MFA gating, moderation history | Consistent shell, hierarchy, responsive panels and clear separation of monitoring/actions |
| Marketing | Honest terminology, UTC, independent completeness, safe rendering, diagnostics/timelines, refresh protection, mobile corrections | Connected journey collection, aggregation, visual flow and defined cohort outcomes |
| Database | Dynamic report timestamp; tested focused property-first optimization and recovery | Minimal connection fields; server-validated request-ID outcome join; aggregate journey report |
| Verification | Latest combined migration: 42 SQL assertions and 8 affected browser tests; rollback evidence | New instrumentation/flow tests, whole-admin regression, hosted Auth/MFA/RPC and production approval |

Concrete gaps observed in source:

- `lister-journey-analytics.js` already captures source/medium/campaign, browser/session/journey IDs and milestones, batching through `record_lister_journey`. This is infrastructure to extend, not replace.
- Journey IDs currently derive from a reusable user/scope draft key. That can retain the wrong identity across separate creations and change around authentication. Form installation emits a Location start even when the form may resume elsewhere. New version must distinguish actual entry/resume state.
- Photos and Pricing completion are emitted together with Listing details completion. They are not separate screens.
- Current source values mix direct and unknown; session acquisition/first-touch are browser storage values, not verified advertising attribution. A source-only campaign change can escape the existing campaign-change condition.
- Success attribution currently depends on a matching browser event and cannot establish every complete path. Existing history must not be retrospectively upgraded into linked journeys without evidence.
- Drafts already persist per-unit `_requestId`; creation sends `p_request_id`; persisted vacancies have `client_request_id`. Reuse these for unit identity/outcome matching.
- Publication happens through existing database activation/status history. A client “submitted” event is not proof of that outcome.
- Existing moderation actions have reasons/confirmation and history; do not equate this with verified audit coverage of every admin mutation.

## 3. Admin navigation and visual design

Keep the seven existing areas, with clearer organization; no invented sections or placeholder features.

| Navigation | Existing content and proposed treatment |
|---|---|
| Overview | Marketplace snapshot, open reports/age, users, properties, units, active listings and message requests. Prioritize actionable counts. Existing listings/messages ratio is **not conversion**; relabel with exact numerator/denominator or omit the misleading summary, retaining underlying counts. Do not imply service health solely from an absence of errors. |
| Activity | Existing metric selector, date range and graph/table views; definitions beside charts. No fabricated user geography. |
| People & listings | Existing search and results, current suspend/restore and pause/reactivate operations. Keep search here, not a decorative global search bar. |
| Reports | Existing report queue, resolve/dismiss actions and moderation history. Read-only history separate from action controls. |
| System | Existing operational-health information, current status/errors and available existing controls only. |
| Appearance | Existing icon library and its revisions/rollback; existing display controls where verified. Do not create a theme builder or new email editor in this scope. |
| Marketing | New visual visitor/listing journey, sources, outcomes, supporting diagnostics and definitions. Read-only. |

Desktop: persistent ~220px admin sidebar; page heading/description and working Refresh control; aligned panel grid; content width fills remaining space without excessively wide text. White panels on light neutral background, ~12px panel radius, 1px borders, restrained shadow. System-font hierarchy: page 26–28px, panel 18–20px, body/control 14–16px, metadata 12–13px; KPI values 28–32px. Blue for navigation/actions, green for confirmed outcome, amber for observation/coverage issues, red for errors/destructive actions. Labels/icons accompany colour.

Mobile: admin-only menu drawer with focus containment, clear active section, single-column panels, two-column KPI grid where it fits, labelled controls that stack. No public navigation redesign. Admin shell may replace public chrome **only while on the admin route**, with a working Return to site control; leaving admin restores the existing public layout exactly. Avoid stacking a second fixed admin navigation over public bottom navigation.

Retain current functions/handlers rather than cloning operations. Scope styling under the admin root; where a mixed auth/admin file is touched, limit edits to its admin section. Preserve current prompts/confirmation/business authorization. Audit existing sensitive action call sites when moving them: retain transaction-backed action history; if a moved action lacks reliable actor/target/action/time/result logging, add the smallest corresponding server audit call after review. Never log secrets, private message bodies or raw before/after payloads. No generic auditing platform.

No search, notification bell, account menu, help link or drill-down is included solely because it appears in the reference. Include only the controls above with verified behavior.

## 4. Exact Marketing layout and interactions

Structural wireframe, **not sample data**:

```text
Admin sidebar | Marketing — Visitor journeys
              | Period [7d / 30d / custom]  UTC  [Refresh]
              | Source [All]  Campaign [All]  Device [All]
              | Generated …  Latest recorded activity …  Coverage …
              |
              | [Recorded arrivals] [Journeys started] [Reached Review]
              | [Journeys with publication] [7-day publication rate]
              |
              | Arrival activity: Find / listing / other entry → listing intent
              | Recorded sessions; separate from the journey-count flow below
              |
              | SOURCES       CREATION JOURNEY                      STATUS AT WINDOW
              | Recorded      Start → Location → Listing details    Confirmed publication
              | source +              ↘ observed direct entry       No confirmed publication
              | campaign                    → Review → Submission   Tracking gaps visible
              |
              | INTERRUPTIONS: recorded errors • last observed stage
              | inactivity threshold • return visits • partial multi-unit publication
              |
              | [Observed transitions/table] [Journey detail]
              | [Performance & errors] [Existing legacy session timelines]
              | Definitions / coverage / independent publication reconciliation
```

### Two related views, with honest counting units

**Arrival activity strip:** a visual breakdown of recorded arrival sessions and their first recorded relevant page/action: Find, listing detail, List dashboard, Create new listing or direct form entry. Count a session once in each explicitly defined reach metric. Show the session-to-start rate separately; one session may start multiple journeys. Never connect raw session counts to journey widths as though they were the same unit.

**Main visual:** a fixed-column, Sankey-style *observed milestone flow* counting creation journeys. Acquisition rows feed their explicitly linked journeys; an Unknown/unattributed row is real, not hidden. The actual screen columns are **Location → Listing details → Review**, with Start and Submission as labelled actions, not extra screens. A direct start/resume at a later screen enters that screen visibly; missing earlier screens are not fabricated.

Draw an edge only when explicit predecessor/transition evidence supports it. Fold repeated visits to the same milestone out of the forward summary; expose backtracking/retries in the detail timeline and labelled counters. Call the summary “Observed milestone flow,” not an exact replay. A gap is a neutral “Earlier transition not recorded” entry or “Next transition not recorded” terminal, not a guessed connecting band. Nodes' incoming/outgoing widths reconcile with those gap/terminal lanes. A journey cannot produce two units of width because it retried.

Use a small, fixed-stage SVG renderer and existing primitives, not a general Sankey library. Stage rectangles and bands carry text counts. No invented flow when data is empty. Hover, keyboard focus or tap highlights a stage/edge and displays its precise counting definition; selecting it opens an admin-only, paginated list of matching journey summaries (not arbitrary raw payloads). Accessible transition and journey tables use the same server totals. This is a new, explicitly proposed drill-down, not an assumed existing feature.

**Outcomes:** a journey with at least one server-confirmed first recorded listing publication counts once as successful; show the number of distinct listings separately. If one of three units publishes, label “1 confirmed; other units not confirmed,” not “all published.” Without a persisted, verified manifest of expected units, do not claim all-units completion. Publication without an observed submission event is displayed with a tracking gap, not a fabricated Review→Submit edge.

Errors are overlapping badges/panels: successful journeys can have errors. For the main terminal totals partition the cohort into confirmed-within-window and no-confirmation-within-window; partition the latter into still-observing versus observation-window-ended. Tracking completeness, errors and inactivity are overlays, never extra disjoint outcome totals added to the cohort.

**Mobile flow:** vertical stage spine with scaled, labelled connections and expandable source/status panels. Preserve the same counts/definitions; do not make a shrunken desktop chart require sideways page scrolling. Journey details open below the selected stage. Table may scroll inside a labelled region, with controls readable above any fixed elements. Keyboard focus is visible; reduced-motion preference honored; graph information does not rely on motion/colour.

**States:** initial neutral skeleton; Refresh disables repeat requests; latest request wins; failed refresh clears dependent values and gives Retry, preserving the selected controls. No-data explains that no eligible recorded journeys match. Historical/legacy data gets an explicit separate label. Tracking gaps/late data are shown in coverage. Backend incompleteness suppresses affected percentages and flow widths, and disables unsupported filter options; independent publication facts may remain available. Show server generation time separately from latest accepted event time. Manual refresh only initially—no Live/Active now or visitor-location controls.

## 5. Minimum collection and data changes proposed

### A. Stable journey identity

Create a random `journey_id` for a **new creation attempt**, persist it as draft metadata independent of the user/scope key, and retain it during form rerenders, same-device auth handoff, retries, partial publication and later draft resume. Start a new one for a new creation/duplicate-to-new workflow, not every page load. Do not use a session as the journey. Expire analytics metadata after the approved retention period without deleting the business draft.

Continue using each unit's existing `_requestId`/`client_request_id`; duplication gets a fresh unit request ID as the existing idempotency behavior requires. One journey can link multiple units/listings. Existing published-listing edits are excluded from the creation cohort; resuming an unpublished draft continues its known creation journey. An old draft without connected metadata starts as **legacy draft resumed** and is separate from new-creation conversion. An edit that adds a genuinely new unit can start a creation journey for that new unit only; ordinary edits/reactivation cannot create first-publication credit.

Session: recorded browser activity separated after 30 minutes of inactivity, distinct from the journey. Refresh activity-aware expiry during use, not only at initial script load. Browser ID is pseudonymous, not a person. No matching after cleared storage, across devices or across unrelated accounts. Direct entry without prior landing/intent evidence is explicitly labelled.

### B. Reuse the collector, with explicit hooks

Replace only the collector's misleading generic form-start/step inference with small hooks at the actual composer entry, validated transitions and submission call sites. Do not alter validation or transitions themselves. Maintain one collector; no added global MutationObserver or duplicated wrapper stack. Keep useful upload/readiness error measures.

Add bounded event fields to `analytics_events`: schema version, client occurrence time, predecessor event ID, normalized route category, journey mode, transition endpoints, submission-attempt ID and unit client request ID. Reuse existing visitor/session/journey/source/device/duration/error columns. Use the predecessor reference and explicit transition, not aggregate totals or timestamp adjacency, as evidence of a path. Missing/ambiguous predecessors become gaps. Parallel tabs can branch; do not impose an invented order—one first forward milestone per journey, branch diagnostics in details.

### C. Source attribution

Entry allowlist: existing `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `campaign_id`, `adset_id`, `ad_id`; keep bounded text. Do not store arbitrary query strings, full referrer URLs, search text or OAuth tokens. Record referrer hostname and normalized page category only. Arrival acquisition is snapshotted on a new session/external tagged arrival; internal navigation preserves it. A new explicit campaign/source/medium combination opens a new acquisition session, without restarting an existing creation journey.

**Rule:** single-touch **journey-start acquisition**. Freeze the starting session's acquisition on the journey. A later return through another campaign does not rewrite that journey's attribution. A new journey uses its current entry context. Device filter likewise uses journey-start device. Keep absent/blocked acquisition as Unknown; distinguish “No external referrer recorded” from a proven direct visit. Campaign labels are user-supplied tags, not a verified ad-platform connection. No multi-touch model, spend, ROAS or ad-platform conversions.

### D. Server-confirmed outcome without changing publication behavior

Record a unit submission event immediately before its existing creation request, carrying journey/attempt/unit request ID. Server assigns authenticated user ID; never trust a client-supplied owner. New report SQL joins that request ID to `vacancies.client_request_id`, requires the recorded authenticated actor to own the property, and reads first qualifying publication from status history. Reuse the tested property-first calculation where that flag is needed. No new publication wrapper or change to `reconfirm_vacancy` is required for this proposal.

Deduplicate retries by request/listing ID. Link a listing to one eligible creation journey only; conflicting journey ownership/request associations are classified ambiguous and excluded from attributed conversions. A missing linking event leaves a valid publication **unattributed**. This avoids making business publication depend on analytics availability. Client acquisition/intent remains observed, untrusted telemetry even when the publication fact is database-confirmed.

No new journey platform or table is initially needed: existing analytics events plus request IDs and history suffice. If later implementation proves a persistent mapping table is necessary, explain that material change before adding it. No historical inference/backfill: connected reporting starts at version-2 enablement; legacy counts/timelines remain separately available.

### E. Server aggregation

Add an admin/AAL2-only aggregate RPC accepting date range and allowlisted source/campaign/device filters. It returns small cohort totals, nodes/edges, sources, outcome/error summaries, filter facets, definitions version, observation bounds and completeness/freshness metadata. Filter and aggregate the full eligible cohort on the server—not a browser-truncated sample. Cap date range at 90 days. Do not send all raw events to draw the page.

A separate admin/AAL2 query supplies 50 journey summaries or bounded timeline entries on explicit selection, with cursor pagination. Reuse existing permissions/safe rendering and diagnostics. Validate cohort/filters/cursor in every endpoint; UI hiding is not authorization. Continue independent status-history publication completeness and the old recorded-publication reconciliation; never force its total to equal attributed journey outcomes.

Start with indexed SQL aggregation on existing storage, not materialized rollups/jobs/caches. Proposed indexes: versioned journey/time and authenticated unit-request lookup, chosen with EXPLAIN on the new query. Any bounded server work cutoff produces incomplete/unavailable results, not plausible partial widths. Top 8 source/campaign groups plus an exact Other bucket reconcile totals; Unknown stays distinct. Facets come from the complete date cohort. Diagnostics limits are declared separately from aggregate completeness.

## 6. Event, metric and privacy contracts

### Shared event envelope and delivery contract

Every v2 client event: unique `event_id`, schema version, session ID, browser ID when permitted, recorded occurrence time, normalized route category and coarse device; journey-related events additionally carry journey ID/mode and predecessor event ID when actually known. Server sets received time and auth UID. Acquisition attaches to arrival/journey-start snapshots; per-unit request ID attaches only when needed. No addresses, unit names, photos, message/form contents, precise location or raw error messages.

Batch at most 20, flush after ~500ms or pagehide using a supported nonblocking path; maximum 32KB batch and 100 pending events/64KB queue. Same event ID on transport retry, at most three backoff retries, then stop until next allowed resume; pending queue TTL 24h. Queue/storage failure is swallowed and never awaited by product actions. No unbounded storage, permanent retry loop or service worker. Bind authenticated queued events to their originating auth context; do not resend them as another signed-in user. Auth change can leave events unlinked rather than fabricate ownership.

Server validates allowed fields/enums/UUIDs/sizes and bounded times, deduplicates event IDs, retains RLS and does not expose anonymous reads. Client timestamps outside accepted 24-hour delay / small future-skew bounds are marked timing-unreliable; exclude them from timed conversion, retain coverage counts. Server receipt time remains authoritative for ingestion. Exact transition links, not client clock alone, order the journey. Use existing endpoint rate controls where present; verify rejection of oversized/abusive batches without claiming browser events are bot-proof.

| Event (proposed v2 names) | Exact trigger and origin | Extra fields / dedup / missing behavior |
|---|---|---|
| `visitor_arrived` | Client: first relevant page in a new acquisition session | Entry page category + acquisition snapshot; once per session. Missing arrival does not invent one later. |
| `visitor_page_reached` | Client: actual route enters Find, listing detail, List dashboard or listing form; exclude admin/auth-secret routes | Normalized page category; suppress rerender duplicates. No listing URL/title/query content. |
| `listing_intent` | Client: Create new listing/new-creation entry action accepted; List navigation alone is a dashboard visit | Entry control category; once per activation; direct form entry gets its own entry kind rather than a forged click. |
| `creation_started` | Client: new creation form ready at its actual initial screen | Journey mode, starting step, acquisition snapshot, entry event ID if known; once per new journey. |
| `creation_resumed` | Client: persisted journey opens in a new session or explicit draft reopen | Same journey, actual step; once per reopen/session. No fabricated fresh Location start. |
| `creation_step_changed` | Client: actual validated forward transition or actual backward navigation finishes | from/to step, direction, predecessor, bounded duration; each actual transition once. Photos/Pricing remain details, not stages. |
| `creation_auth_state` | Client: listing-related sign-in/up starts, awaits confirmation or resumes with an established session | Journey + allowlisted state; no email/provider payload. Auth is an interruption, not a compulsory linear screen. Only observed outcomes, not assumed signup completion. |
| `creation_submit_attempt` | Client: existing submit handler accepts a new publishing attempt after duplicate-submit guard | New attempt ID; one per actual attempt, same ID on transport retry. Failures remain attempts, not publications. |
| `creation_unit_submit` | Client: immediately before each unit's existing create RPC | Journey, attempt, unit request ID; same request on retry; server UID for eventual owner match. Missing event means outcome unlinked. |
| `creation_error` | Client: existing validation/save/upload/publish operation reports a failure | Stage, attempt/request if available, bounded error code only. Retry errors may occur before success. |
| Existing readiness/upload duration events, v2 | Client: measured step ready or upload completion | Duration/category only; supporting diagnostics, not new journey screens. |
| Confirmed publication (derived record, not client event) | Server report: earliest qualifying active transition for a matched listing in full available history | Distinct listing ID + server timestamp; join only verified owner/request evidence. No telemetry write on the critical publication transaction. |

All events use the shared queue/dedup/missing-data policy and proposed 90-day raw retention. Operational status history is a separate business record; do not purge it with analytics.

### Metrics and observation rules

Proposed defaults, to approve together: UTC; date selection `[start, end)`; maximum 90-day report; **7-day completion observation window** from recorded creation start, plus up to 24h ingestion grace before a cohort is called mature. Recent cohorts show “Still observing.” Returning sessions retain the same journey. First recorded publication means at least one matched listing, not every intended unit. Outcomes after seven days are separately labelled late outcomes, not added to the seven-day numerator. No automatic abandonment claim.

| First-release metric | Unit/cohort and numerator/denominator | Window, filters and limitations |
|---|---|---|
| Recorded arrivals (card 1) | Distinct arrival session IDs whose accepted entry time is in range; no denominator | Entry source/campaign/device filters. Not people, not all traffic; blocked collection absent. |
| Creation journeys started (card 2) | Distinct v2 new-creation journey IDs first started in range; no denominator | Frozen start source/campaign/device. Legacy-resumed and edits excluded, displayed separately. |
| Reached Review (card 3) | Cohort journeys with actual Review entry within seven days; show count and count / started journeys | Same journey cohort/filters. Recent values provisional; missing earlier stages marked rather than filled. |
| Journeys with publication (card 4) | Cohort journeys with ≥1 linked first recorded listing publication within seven days; secondary distinct listing count | Same cohort/filters; one successful journey can produce many listings. Unknown links excluded with explicit coverage. |
| Seven-day publication rate (card 5) | Mature eligible journeys with ≥1 linked publication within seven days / all mature eligible started journeys | Same cohort/filters. Denominator 0 → “Not available,” never 0%. Missing collection makes this recorded-journey rate, not all-visitor conversion. |
| Arrival → creation rate (arrival strip) | Arrival sessions with ≥1 explicit new journey start in that session / recorded arrival sessions | Session must be closed/30min inactive plus ingestion grace; recent sessions provisional. Multiple starts count once in numerator. Not summed into main flow. |
| Last observed stage | One last evidenced stage per cohort journey at observation cutoff | Not “abandoned here.” Missing edges stay unknown. Errors may overlap any stage. |
| Recorded errors | Distinct affected journeys and deduplicated error events; affected / started journeys if showing rate | Same cohort/filters and seven-day observation; successful journeys remain eligible. |
| Returned journeys | Cohort journeys with an observed resume in a different session within seven days / cohort journeys | Same-device evidence only; session renewal is not proof of a distinct person or deliberate return. |
| No recorded activity for 24h | Unconfirmed cohort journeys whose last recorded event is ≥24h old as of cutoff | A timed inactivity classification, not an exit. Can later resume; during seven days remains observing. |
| Completion duration | Median time from eligible start to first linked server publication, successful journeys only; show sample count | Seven-day successes, valid timing only. Not time spent actively filling the form. Existing measured active/upload durations separate. |
| First recorded publications (reconciliation) | Distinct listing IDs with earliest qualifying history transition in the date interval | **Date only**, independent of journey filters; unlinked publications retained. Property flags never change listing count. |

No relative-period comparison arrows in the first release. If later approved, define matched mature cohorts and explicitly distinguish relative percent from percentage-point change.

**Conservation:** source journey groups + Unknown = eligible journey cohort; each journey contributes at most once per forward stage and once per terminal classification. Every band's value is computed from journey-level transition evidence before aggregation. Repeated/backward transitions appear as diagnostic counts, not duplicated forward width. Gap lanes balance missing links. Confirmed + no-confirmation outcomes = cohort, while error/inactivity/coverage overlays are not additive. Session totals and listing totals are separate units. Reconcile in SQL and automated tests, not by adjusting chart numbers.

### Privacy and retention decisions

Propose raw v2 events and derived identity links retained for 90 days, client browser/journey identifiers with 90-day expiry, session timeout 30min, pending queue TTL 24h. No indefinite first-touch identity or raw payload export. A bounded scheduled purge should remove only approved analytics rows/links, never listing history, drafts, messages or moderation audit. Use existing scheduling infrastructure if available; otherwise the purge mechanism is a named activation dependency, not an assumed completed safeguard. No long-term aggregate archive initially; oldest cohorts with expired required records are explicitly incomplete.

Before enabling new collection, the operator must approve retention and the appropriate privacy notice/consent basis for served markets. This plan does not assert legal compliance. Respect existing consent/opt-out where available. If a new notice/banner or consent mechanism is necessary, that visible public change requires separate approval; do not quietly add it or collect first and decide later. Development uses synthetic data meanwhile. No production analytics deletion is authorized by approving this plan alone.

## 7. Affected files, migrations and boundaries

| Scope | Likely files / proposed additions |
|---|---|
| Admin presentation | Admin-only sections of `app/src/stage36-experience.js`, `stage100-auth-admin.js`, `stage57-operations.js`, `admin-lister-marketing.js`; reuse `stage82-operational-health.js`, `site-icon-library.js`, `listing-display-options.js` handlers; `.admin-*` rules in `app/styles.css`; `app/index.html` only if module loading requires it |
| Background instrumentation | `app/src/lister-journey-analytics.js`; small explicit hooks/metadata in `listing-composer.js`, `stage101-listing-journey.js`, `listings.js` and current edit/draft adapter; route/auth-success hooks only where verified necessary; no field/layout/validation edits |
| Backend adapter | `app/src/backend.js`: event fields and admin aggregate/detail RPC calls; no change to existing publish outcome or auth rules |
| Database | New additive migration for v2 event contract, validation/indexes and collector RPC; new admin aggregate/detail RPC migration with membership+AAL2; separate retention migration/job configuration after policy approval; mutation-audit repair only for evidenced gaps in moved existing actions |
| Preserved migrations | Keep generated_at and property-first optimization in order; reuse their behavior/tests; do not rewrite applied migrations |
| Verification/docs | Extend existing Marketing tests/local fixture server/SQL harness; new connected-journey and admin-shell tests, event/metric definitions, source and database recovery files |

Exact new migration filenames will be created by CLI at implementation. No new runtime dependency is proposed. No full admin renderer rewrite: keep operations and selectively replace presentation/grouping. Do not append another broad global wrapper to fix existing wrapper ordering.

Proposed acceptance budgets (targets, not measured achievements): collection handlers ≤2ms p95 in a representative throttled test, no tracking-caused long task >50ms, ≤32KB/event batch and bounded queue above; publication does not wait for analytics. Aggregate report ≤200KB uncompressed / ≤75KB compressed at target scale, ≤1s SQL at 100k events/10k journeys over selected history, render ≤100ms, local filter/selection ≤50ms, end-to-end ≤3s on stated 1.6Mbps/150ms throttling. Test the larger history/small-date-window case and 500k-event stress separately. A 20-load sample is only regression evidence. If budget fails, first inspect/query/index narrowly; do not silently accept it or introduce a redesign. Diagnostics load only when expanded.

## 8. Bounded delivery and verification phases

1. **Approval and preservation.** Preserve current uncommitted source and evidence in a recoverable scoped checkpoint. Confirm event/metric contract, 7-day/90-day proposals and activation privacy dependency. No repeated planning checkpoint for routine details.
2. **Admin presentation + synthetic visual journey.** Build all seven verified areas and the main flow using explicitly labelled synthetic fixtures; retain real existing operations behind their existing gates. Test keyboard/mobile, action confirmations, safe strings and complete separation from public styling/behavior. Review milestone: full admin desktop/mobile visual preview, not another table-only Marketing checkpoint.
3. **Connected data in isolated development.** Implement stable metadata/hooks, authenticated request-ID/history linking and aggregate RPC. Test direct entry; each true step; backwards movement; validation failure; multiple units; duplicate-to-new; partial success; retries/timeouts; guest/auth return; old draft; new journey after prior completion; simultaneous tabs; edits/reconfirmation exclusion; source changes; storage blocked; offline/retry duplicates; no linking event; malicious payloads; ambiguous request association; server success with missing client success event. Verify no analytics failure blocks product actions and all event/table/graph totals reconcile.
4. **Combined verification and hosted dependency.** Replay known synthetic timelines through the actual collector/SQL/renderer; test independent completeness, UTC/maturity boundaries, retention cutoff, safe diagnostics, server authorization, performance and exact rollback. Reuse completed unchanged tests; rerun only affected areas plus necessary public nonregression. Complete real hosted login/MFA/RPC once a separate target is available. This dependency does not delay phases 1–3 planning/building, but blocks release verification.
5. **Review and release decision.** Present full admin visuals, observed-data flow, executed passes/failures/unverified items, public regression evidence, retention/notice readiness and source/database recovery. Stop for production release approval. Tracking activation is explicit and separately disableable; no automatic production enablement from a code deployment.

Hosted requirement remains a confirmed disposable Supabase test project with synthetic admin/non-admin accounts and TOTP, test-only keys/configuration, and local app pointing only to it. Current metadata showed only Vacancy main, and the connected free organization already has two active projects. Do not create a paid branch, pause an unrelated project or use production to close this gap. No environment is provisioned by this plan.

Rollback must allow disabling v2 collection without changing browsing or publication, reverting admin presentation without dropping collected evidence, and restoring old RPC definitions/grants separately. Keep additive columns inert where safer than dropping data. Any retention deletion needs its own approved recovery/export policy; a Git tag cannot undo it.

## 9. Decisions genuinely requiring approval

**Approve this corrected scope**, including (a) the entire existing admin console redesign, (b) the visual milestone flow/diagnostics, (c) the precisely bounded invisible tracking changes, and (d) the server aggregation/request-ID linkage. Suggested defaults are a seven-day completion window and 90-day analytics retention; changing either is a product/privacy choice, not a minor coding decision.

For activation, settle the privacy notice/consent basis and provide a safe hosted test target/access. These block activation/release, not building synthetic development fixtures. No other routine design question needs to block progress. After approval, proceed through the agreed phases, stopping only at the two substantive review milestones, a material scope change or production release approval.
