# Development environment decisions

Automatic startup follow-up: run the same lightweight hook on container start
and editor attachment. A per-port lock serializes overlapping events; a successful
HTTP response with the isolated preview marker reuses the existing server. The
child detaches and releases the startup lock, so the hook finishes promptly.
No polling service, new dependency or production configuration is needed.

2026-10-20 (Australia/Perth).

- **Base on inspected development, not the default branch.** The reconciliation
  tip `8e4b9ea` contains 401 commits beyond `main` and 226 beyond the deployment
  source `1a03a32`. It preserves the two admin histories. Setup gets its own
  feature branch and draft PR against reconciliation; existing PRs stay draft.
- **Codespaces with one versioned Node 24 image and the existing lockfile.**
  This matches the connected projects' Node major without introducing a new
  package manager, app framework, dependency upgrade or container database.
  Image updates are deliberate reviewed changes. Browser installation follows
  the locked Playwright version.
  The image manifest was resolved directly from Microsoft Container Registry and
  pinned to digest `16eb68aa0d17eedaaf2566b180854fe4e506478e35aadf790fb02aa089024f13`.
  Actual Codespaces verification showed the base image lacks an SSH service.
  Add official `sshd` feature 1.1.0 for GitHub CLI verification and remote access;
  do not forward its port publicly or set a password. GitHub manages access.
- **Synthetic by default; reuse existing fixtures.** A small development server
  serves `app/` with in-memory backend substitution, same-origin CSP and disabled
  API routes. Real backend acceptance already has a disposable Linux CI harness.
  Starting a paid hosted branch or replaying shared test data would add risk
  without helping routine edits. Synthetic results never imply real persistence.
- **Prevent automatic deployment of workspace branches.** The live Vercel
  project's Preview variables include privileged credentials. Branch-specific
  rules in both possible configuration roots cover `codespaces/*` and
  `feature/codespaces-*`; they preserve all other branches and existing rewrites.
  Codespaces port forwarding supplies the routine preview. Explicit hosted lab
  testing remains separate and protected.
- **Zero required secrets and no provider mutation.** Existing production/test
  projects remain as found. No new resources, billing, credentials, migration,
  Auth callback, public share/bypass or domain changes are required for startup.
  Codespaces account creation/permission/usage confirmation belongs to the user.
  After the user completed GitHub's browser authorization, setup created the
  smallest available Codespace with a 10-minute idle timeout. A failed first
  verification exposed missing SSH support; the unused instance was stopped and
  deleted only after its clean Git state was independently checked. The corrected
  workspace remains available. Private preview verification uses GitHub's own
  port tunnel, so no OAuth credential is sent to the application.
- **Keep legacy release records, correct the entrypoint.** The old laptop guide
  points to a September source. It now identifies itself as historical and links
  to the current development guide. Product HTML/CSS/JS remains untouched.

## Minimal card grid — 2026-10-20

Reuse existing Overview metrics, native CSS grid and browser-local preferences.
Small/wide sizes, drag or earlier/later buttons and hide/add-back provide a minimal
layout without a grid library, duplicate metric instances, invented history or
new backend tracking. Hiding changes layout only; values and permissions remain
those of existing reports. Preserve the v1 account-scoped key and tolerate missing,
corrupt or blocked storage. Newer local admin shell work is not in this checkout;
leave it outside this card-only patch rather than reconstructing it from chat.

Restore the requested prior shell from exact chat file-change hunks, rather than
redesigning from the discussion. Consolidate the existing report into Overview and
append the existing snapshot after report content. Keep the new grid module and
v1 preferences intact. Include the prior header/Site status corrections so the
restored layout behaves as previously reviewed. Leave later graph-card work out.

## Desktop shell constraints — 2026-10-21

Use six equal outer columns at >=1280px: one for navigation, five for content.
Keep the navigation fixed and independently scrollable, with its width derived
from the same six-column shell. The content region has 24px inner insets, so
navigation is exactly viewport/6 (240px at 1440px), rather than treating the
navigation/content boundary as an extra gutter. The shell establishes placement;
existing cards retain their current layout until the requested card-sizing pass.
Apply only at the agreed desktop minimum; retain existing narrower-screen rules
without a new mobile design. Continue from the latest card-grid branch to retain
the restored navy shell and isolated workspace, targeting reconciliation in draft.

## Desktop data card sizes — 2026-10-21

Replace auto-fit desktop metric widths with five equal tracks in each existing
card region. Compact spans one and wide spans two; preserve row order rather than
packing gaps densely, so reading and keyboard order remain consistent. Retain
panel containment and full-width report/information surfaces. Use a minimum
144px card height with natural growth, rather than clipping long labels or
arrangement controls to a fixed height. Keep existing saved small/wide preferences
and all narrower viewport rules. No new card-size picker or storage migration.

## Overview graph selection — 2026-10-21

Use the existing three visual regions (sources, outcome evidence and milestone
flow) as selectable cards. Keep their existing counting units, coverage notices,
filters, accessible tables and providers. Sources occupy two content tracks,
outcomes three and the detailed flow five, preserving readable stage labels.
Store only validated view IDs per account/browser, separately from metric layout
preferences; allow an empty selection with an explicit restore action. Keep the
chooser outside refreshed report bodies so failures do not remove layout controls.
Hide presentation via desktop CSS rather than removing reports or adding provider
calls. The same chooser is mounted by synthetic and connected reporting paths;
no new graph catalogue, telemetry or backend data model is introduced.

## Repeatable info tile v1 — 2026-10-21

Use a shared escaped markup renderer for report tiles rather than duplicating
reference markup between connected and synthetic renderers. Inputs are label,
value, evidence/unit note and a bounded semantic kind. Decorative icons come from
a fixed path map; all caller-supplied content is escaped. Keep the existing
five-column desktop contract instead of copying the reference's six content
tiles. Minimum height 160px, 24px padding/gutters, 8px corners and natural content
growth define v1. Notes retain counting units and coverage caveats; trend arrows,
comparisons and sparklines require actual supporting evidence before inclusion.

## Visible graph prototype — 2026-10-21

The user clarified that both tile sparklines and larger graphs were missing from
the expected experience. Supply labelled synthetic example series only through
the existing development fixture to make tile visuals reviewable now. The shared
renderer validates bounded finite nonnegative series and shows Trend unavailable
without one; never derive history from an aggregate count. Preserve unavailable
publication rates. Move the existing detailed flow ahead of its support cards
and arrival summary on desktop while retaining saved view choices and coverage
notices. Additional reference chart types and real historical data remain future
work; this slice is not evidence of production analytics integration.

## Recover agreed graphs from chats — 2026-10-21

Restore the actual October 19 selectable-card implementation and tests recovered
from chat file-change evidence, adapting desktop spacing to the current grid.
This supersedes the fixed aggregate-tile prototype and arbitrary synthetic trends
as the top-row design. Keep each card's metric and UTC period independent, with
preceding-period arithmetic, honest zero-baseline/missing-history treatment and
one point for one-day periods. Preserve the existing 30-day backend contract;
no migration or retention change is needed for the UI's 90-day unavailable state.

The broader mockup records time trends and source breakdowns. Use available daily
accounts/listings/enquiries for the activity graph, labelled by those exact units,
and existing journey-start counts for source bars. Do not relabel accounts as
visitors or journey-start sources as all traffic. Keep unavailable reference-only
visitor/live-user, geographic and seeker charts outside this implementation claim.
Shared cached reads avoid extra metric calls; invalid or insufficient series never
become zeros or extrapolated history. Larger graph table exposes the same values
as its lines. Existing draft PRs, source branches and isolated preview protections
remain preserved.

## Live/location/seeker cards and smaller screens — 2026-10-21

The user now explicitly requests graph visibility on smaller screens, superseding
the earlier desktop-only visibility restriction for reporting cards. Preserve the
six-column desktop shell and five content tracks: live spans two, location three,
seeker full width. Below desktop, wrap/stack graph cards and expose selectors;
use internal scrolling for readable wide plots rather than hiding SVGs.

Use existing protected readers instead of adding a tracking service or changing
collection. Recent browser IDs are a five-minute observation, not live humans;
record only actually returned snapshots for this open page and pause on hidden
Overview/document. Location bars describe returned active-status listings, not all
marketplace inventory and never visitor geolocation. Deduplicate IDs and retain
Unknown city rather than fabricate precision. Renter stages retain their existing
search-linked unit and explicit unavailable conversion/coverage state. No map is
implied by a city bar chart.

Migrate graph selections to a v2 key so users with previous preferences can see
newly requested cards. Keep prior selections for old graphs and leave v1 intact.
Use per-refresh generation guards so superseded live reads cannot start duplicate
poll timers. Failed, invalid and incomplete data clear graph content rather than
becoming zero; actual validated zero results remain visible.

## Reusable card scaling and timezone semantics — 2026-10-21

Constrain each tile relative to its own content track (bounded container-relative
type, full-width aspect-ratio plot) rather than uniformly shrinking the whole UI.
Keep 26–38px values and 16–24px card padding bounds, responsive track counts,
compact numeric ticks, and a visible keyboard focus state despite borderless
controls. Gridlines are interior references, not an enclosing plot rectangle;
use date/value ticks without redundant axis titles. Signed percentage values
preserve direction after removing arrow glyphs.

Changing a timezone label cannot rebin daily counts. Add a separate local-day
reader with validated IANA zone, civil-midnight bounds and the existing admin gate
instead of modifying or pretending to convert the legacy RPC. Preserve its 30-day
limit and explicit missing history. Caller verifies the returned zone. The
migration is prepared and locally exercised only; hosted application remains a
separate scoped operation. Existing owner timezone aggregates are not substituted
for marketplace admin metrics. No hosted SQL or credential access is needed for
these UI and synthetic calendar checks.

## Event exploration and bottleneck interpretation — 2026-10-21

Reuse the current capped, protected event report for a read-only configurable
explorer. Total events counts independent recorded actions after transport-ID
deduplication. Browser IDs, sessions and creation journeys answer different
questions; keep them explicit and never call browser IDs verified people.
Daily distinct values are not additive across dates. Missing identifiers or a
capped dataset must not produce falsely complete unique counts.

Use the existing real Location, Listing details and Review events for page reach;
keep Photos/Pricing out of the page list because they are not separate screens.
Highlight the biggest stage-count difference as an investigation lead, not proof
of abandonment or a sequenced conversion rate. Do not infer a Home landing from
the collector's generic landing event. Dedicated Contact/Text button events are
not in the current collector allowlist: show Not collected yet without explicit
coverage or observed matching events. Synthetic examples are development-only;
no new click collection or third-party analytics activation is smuggled into a
reporting UI change. A later collection slice needs stable button IDs/events and
the existing preservation/privacy boundaries, rather than text scraping or
recording entered text. Preserve graph choices via v3 migration and show the new
explorer by default after upgrade.

## 2026-10-21 — Unique Overview metrics and continuous empty periods

Overview metric identity is unique across the five reusable tiles, independent
of period. Restore repairs older duplicate preferences; each selector retains
its own metric and excludes metrics used elsewhere. With five metrics and five
tiles, only the current metric is available until the catalog grows. Header
search, history, refresh and email identity are removed; navigation remains.

Visible daily tiles and Recorded activity reread once per minute, pause when
hidden, and clean up on account loss. This is polling of existing reports, not
new event collection. Zero activity is drawn at zero from period start through
current local wall time (or all of Yesterday). Missing history remains unavailable.
Y ranges use rounded steps and adjust on every read. Day guides use three-hour
intervals, seven-day guides daily, longer periods weekly/fortnightly; thinner
minor guides appear with sufficient card space. No boundary rectangle or axis
titles. Dropdowns are transparent at rest and grey on hover/focus.

Daily sources cannot supply an hourly curve: a nonzero Today/Yesterday remains
a daily aggregate point, with hourly unavailability in its accessible title.
Three-hour guides are time references, not hourly evidence. Percent change is
(current minus preceding equal-length period) / preceding period * 100; previous
zero is New, both zero No change. Today is explicitly partial versus full
Yesterday, not a same-elapsed-time comparison. No hosted schema or collector
changes; the previous local-day migration remains unapplied.

## 2026-10-21 — Scope freshness to the refreshed reports

Overview labels its new timestamp Daily data refreshed. Independent live and
journey reports do not share an atomic page snapshot. The timestamp uses browser
local time and advances only after successful daily reads; a failed cycle says
incomplete rather than implying that all reports are current. Card periods stay
independently selectable.

## 2026-10-21 — Named element tracking in the reusable metric cards

Use an explicit code catalog, delegated `data-track` press tags and visible
listing-step hooks rather than scraping text or adding a visual selector tool.
Contact maps to the existing enquiry action; Text maps to Send message activation,
not delivery. Completion is a separate successful publication event. Page revisits
count separately within one form-lifetime attempt; reloads start another attempt.

The new collector is separate from existing analytics to avoid mixing historical
coverage or double-counting existing milestones. It is disabled by default and
requires its own versioned optional choice. New anonymous event queues deliberately
survive guest sign-in (no account ID is sent); existing queues retain actor binding.
No URLs, entered text, listing IDs or contact details enter the new contract.

Reuse the five top cards, unique point assignment, period controls, rounded scales
and local-time grid. Add total events/distinct browsers. Tracking graphs use complete
hourly/daily buckets with confirmed zero values through a cached request cutoff;
future time is blank. Comparisons use matching elapsed local periods. No daily
aggregate is fabricated into an hourly trace. Older service-count cards retain
their existing daily source and limitation.

First version retains event detail for 30 days with indexed range reads, a shared
period cache and a 5001-row incompleteness sentinel. No long-term rollups yet;
90-day tracking and unretained comparisons remain unavailable. Logical expiry and
bounded physical cleanup are provided; scheduling, notice review and enablement
remain a separate hosted acceptance step. A collector restart resets coverage
so disabled gaps cannot be presented as zero. See docs/ELEMENT_TRACKING.md.

## 2026-10-21 — First tile: live and unique browser series

Make Live visitors the first default tile, retaining the five-track desktop row.
A one-time account-scoped session migration replaces its old metric; subsequent
explicit choices remain configurable. The four other defaults and metric catalog
remain available. New accounts can still be selected elsewhere.

Green measures distinct browser IDs with recorded events in the five minutes
ending at each interval cutoff. Blue measures distinct browser IDs within each
hour (Today/Yesterday) or local day (longer periods). Headline is always the
current five-minute count, even when viewing a past period; the separate unique
total deduplicates the entire selected period rather than summing interval counts.
These are recorded browser IDs, not verified people or idle presence. Admin events
and missing browser IDs are excluded, matching the existing live source.

Read-only `admin_visitor_metrics` queries existing analytics events. No new visitor
collection, heartbeat or retention changes. Client supplies contiguous UTC bounds
computed from local calendar intervals, including DST. Report bounds, size and
admin/MFA access are enforced; a time/visitor index supports bounded reads.
The migration remains unapplied. Existing data coverage is not certified as all
traffic. Graphs stop at the cutoff, share one selected-period value scale, and
show zero for no recorded activity. Missing/invalid reports remain unavailable.
Polling every 30 seconds pauses on hidden Overview and stops on account loss.

## 2026-10-21 — Variable Overview card layouts

Add card configures only catalog metrics not currently displayed. Metric identity,
not period or counting method, defines uniqueness. One shared card template still
occupies one of five desktop content tracks; additional cards wrap in order.
A native modal selects metric/count/period and supports Escape/Cancel. Per-card
ellipsis menus expose Move earlier, Move later and Remove card, with keyboard
focus restored after each action and disabled moves at the ends.

Keep the existing account-scoped session preference key and normalize bounded,
variable-length arrays. Empty arrays intentionally stay empty; malformed/duplicate
entries recover to unique catalog entries, and layouts cannot exceed the catalog.
Order, metric, count method and period survive reload in the current browser
session. Reordering moves existing nodes and configuration references without
refetching reports. Removing invalidates outstanding reads and visitor polling.
Added tracking cards share the existing period cache. No hosted persistence.

Period option labels use Last 7 days, Last 30 days and Last 90 days, including the
Add dialog, Recorded activity and Button/page activity. Values/range calculations
are unchanged. Scope both journey report form lookups to `.journey-filters` so
additional composed forms cannot replace their filters. Top-row Add control has
its own selector; the older operations-card arrangement panel remains independent.

## 2026-10-21 — One refresh cycle and matched percentage comparisons

Reusable top-row cards have one shared refresh timer, not a visitor-specific
30-second poller. Each cycle captures one client cutoff, fetches card data, and
stages visible values/graphs until the group finishes. Prior values remain while
refreshing; errors commit as unavailable with an incomplete timestamp. The header
now says Card data refreshed and displays the cycle cutoff after commit. Hidden
Overview/account cleanup and stale request guards remain. Changing configuration
can load the selected view using the current cycle's cutoff/cache. Other existing
report panels keep their own refresh contracts; this is not a database-wide
transactional snapshot.

Restore direction arrows after numeric percentages: +12% ↑ / −12% ↓, retaining
up/down colours. Zero previous totals use New or No change rather than an infinite
percentage. Labels are vs yesterday, vs the day before, or vs last 7/30/90 days.

A new exact-range aggregate complements the daily graph reader for service counts.
Today compares to the same local time yesterday; multi-day ranges compare matching
elapsed local calendar windows in the preceding period. Yesterday uses two complete
calendar days. The current day's graph total reconciles to the bounded count.
Do not prorate daily totals to invent an elapsed denominator. If the exact report
is missing/invalid, show Comparison unavailable, retain available count history,
and mark the refresh incomplete. Current history gaps still remain unavailable.

`admin_metric_comparison` is allowlisted, admin/MFA guarded, range bounded and
read-only, keeping created_at columns bare. It is prepared but unapplied; it does
not activate collection or modify Auth records. Single-day service graph curves
still require hourly source history; this change supplies exact period totals,
not invented hourly traces. Tracking cards already have event-time buckets.

## 2026-10-21 — Comparable traffic intervals and repeat-browser cohorts

Replace five-minute presence with visits versus unique browser IDs over identical
hour/day intervals. A visit is a recorded v2 browser/session pair; totals dedupe
across intervals. Repeat browsers have two sessions within the selected period;
series start counting them after their second session, not retroactively.
Use canonical journey_version=2 and exclude admin activity. Registered classification
uses currently linked permanent Auth accounts, with explicit unknown deleted
accounts; guest Auth and unlinked browsers are non-registered. This cannot identify
logged-out account owners or reconstruct historical account status.

Both cards share one bounded aggregate read per period and the common refresh
cutoff. Add repeat card once to existing layouts, retaining removal, ordering,
metric uniqueness and five desktop tracks. Missing source/report fails closed.
No live collection activation or production deployment is implied by local work;
see ADMIN_TRAFFIC_CONNECTION_20261021.md for the concrete release boundary.

## 2026-10-21 — Journey-map row and browser-local telemetry bypass

Add a reusable aggregate journey map directly after the top metric-card grid,
spanning the full five-column content width as its own row. Centre = distinct
recorded browser IDs; overview spokes show page/step membership (not mutually
exclusive cohorts). Selecting a node shows its next recorded transitions across
the selected report, rather than implying a single ancestry through all clicks.
Period/device filters, reset and a table keep the graph usable without gestures.
Page groups connect to Location only when the next observed node is the initial
listing step in the same session. Later listing steps need explicit links; do not
invent missing edges, infer abandonment or claim current presence. Publication
node is labelled Publish attempt, not successful publication. No live pulses yet.
Region filtering awaits a reviewed visitor-region source; listing city is not a
visitor location. This version does not infer geography or add IP collection.

Reuse v2 route-group events after successful renderer completion, suppressing
obsolete requests and duplicate route-group refreshes. No raw URLs/text are added.
SQL page edges require the same browser/session and less than 30 minutes between
observed views; listing edges require a valid previous event in the same journey,
session and browser. Missing links stay missing. Distinct-browser edges can
legitimately overlap; they are not additive totals. Partial historical route
coverage cannot reconstruct previously unrecorded navigation.

The new report is a bounded, five-second-timeout, admin/MFA aggregate candidate;
no hosted migration or deployment is performed. Existing timestamp index supports
the initial range scan; production query plans and performance remain unverified.
The UI lazy-loads on visibility, has at most ten grouped nodes, draws native SVG
paths with keyboard-accessible native buttons, and has no independent polling,
canvas loop, external graph dependency, or per-node network reads.

Browser-only analytics setting is read in the document head before backend or
tracker setup. Changing it persists locally and reloads. Disabled trackers return
before identity creation, policy requests, listeners, timers and product wrappers;
minimal no-op exports preserve product callers. Telemetry queue and all six backend
write helpers also refuse writes. Analytics static assets are still downloaded and
parsed, so this is a runtime collection bypass, not a zero-byte bundle comparison.
Other visitors and server-side operational records are unaffected; enabling this
switch never grants optional consent or enables a server-disabled collector.

## 2026-10-21 — Scoped production reporting, separate private viewer

The owner explicitly requested connecting stats/journeys to live data after the
no-production-changes clarification. Install only the four admin/MFA read reports
and the traffic index, verified first against the preserved test database. Use a
self-contained activation bundle rather than replaying historical candidates.
Extend local-calendar history to 180 days to match the cards' existing request.
Test reports/index are removed after verification, with original record counts
and guard definition preserved; retain official migration receipts.

Serve a separate explicit-opt-in viewer on port 8780 instead of weakening the
synthetic server or deploying raw source to the live site. Use existing password/
TOTP authentication, sessionStorage isolation, viewer-local sign-out and only
supported aggregate metrics. Reports reject unauthorized callers server-side;
client failure handling clears existing charts. No product mutation UI, telemetry
collector, backend proxy, privileged environment pull, automatic live-viewer startup
or Vercel deployment. Expanded navigation instrumentation remains undeployed;
existing records support partial historical journeys only. See the activation
acceptance record for exact installed objects and verification boundaries.

## 2026-10-21 — Explicitly authorized live admin publication

Publish a curated Overview overlay on the preserved live `1a03a32` app, rather
than the entire development checkout. Keep existing public API handlers, public
styles and unrelated product modules byte-identical. Exclude the draft design
editor and optional tracking reports whose server collection remains disabled.
The existing Auth/MFA flow is retained. Minimal browser preference/write guards
support the previously requested analytics speed-test switch without changing
normal collection semantics.

Fix the actual connected-report mounting path to include the map; the synthetic
preview used a different composition and could not establish production parity.
Verify that actual composition with isolated responses, then hosted bytes and
unauthenticated behavior. Vercel rejected direct preview promotion with HTTP 422;
use a normal production build from the same verified files, not a force bypass.
Assign the live custom domain only after READY, preserve the previous deployment
and record source/asset hashes for reproduction and frontend-only rollback.

## 2026-10-21 — Separate active presence from historical journeys

Reference-style bucket charts share a renderer and compare equal elapsed periods;
previous full-period overlays are distinct from percentage denominators. Restore
navigation tracking in the curated release rather than only in development source.
Admin browsers remain excluded through sign-out, with authenticated membership
checks before collection. Node pulses require separate visible/recently-interacting
page presence, a server 45-second lease and short client expiry. Historical paths
never imply current activity. Keep presence private, aggregate-only for verified
admins, bounded and independent of visit counts; honor reduced motion. No graph
library, continuous animation loop, full URLs, form content or new accounts needed.

## 2026-10-21 — Curve interval counts without accumulating actions

Owner explicitly selected actions per interval. Replace the earlier stepped
presentation with cubic curves through interval observations. Use horizontal
endpoint tangents and bounded control points so interpolation cannot overshoot
reported values or cross below zero. Preserve raw interval counts, empty intervals,
previous-period comparisons and blank future time. Unique-browser selections
retain deduplication; smoothing is visual and does not alter counts or collection.

## 2026-10-21 — Restore original chart appearance with corrected time guides

Owner prefers the pre-reference-image design. Restore its compact plot proportions,
metric colours and grey horizontal/vertical guides while retaining the subsequently
requested bounded curves and per-interval action counts. Compute guides from local
hours/calendar days instead of unrelated equal subdivisions; omit boundary strokes,
keep minor lines thin and hide them on narrow cards. The axis endpoint label must
represent the same timestamp as the plot boundary. Restore wide activity-chart
proportions separately so text stays readable at both chart sizes.

## 2026-10-21 — Restore the actual pre-screenshot plots, not the intermediate restyle

Owner explicitly rejected remaining vertical lines and requested the pre-screenshot
design. This supersedes the intervening curved/dashed comparison presentation:
use original point-to-point plots, current metric series and original legends.
Remove all vertical guides from reusable and supporting Overview graphs; retain
horizontal guides. Keep correct interval counts and percentage comparisons, but
stop fetching the unused full previous-period overlay. Collapse both the empty
Overview heading and the public Back control's reserved space; use 12px top padding
on desktop while retaining narrow-screen navigation.

## 2026-10-21 — Balanced overview cards and durable period preferences

- Owner selected balanced full rows with a minimum readable card width. The inner card grid uses 60 tracks, at most six cards per row, and a 190px minimum target; six cards become 3+3 on ordinary desktops and six across when space permits. The outer navigation/content grid stays intact. Add/remove/reorder and resize recalculate spans without additional data requests.
- New stat cards, activity and journey reports default to Today. Account-scoped local storage preserves chosen periods and card order/removals; existing session preferences migrate without resetting selections. Preferences are browser-local, not cross-device account settings.
- Single-day chart labels use midnight, 6 am, noon, 6 pm and midnight, retaining horizontal guides only. Longer periods retain date labels. Journey map reset appears only during branch exploration; duplicate toolbar text is removed. Active-presence eligibility and admin exclusion are unchanged.
- Lower report recommendations only: retain creation funnel/confirmed publications and supply by location; move acquisition breakdowns, journey details and diagnostics to dedicated views; remove duplicate trend/snapshot panels from Overview after owner review. No lower reports or historical records were deleted.

## 2026-10-21 — Desktop activity feed scope

Use the existing five-track Overview grid (2/3 spans) and native expandable rows
for two dark desktop-only feeds. Keep only eight available summaries per panel;
full text and recorded time appear on expansion. Use existing protected reads,
manual/shared refresh, bounded waits and session/visibility cleanup. Do not infer
new accounts, visitor location or repository releases from analytics aggregates.
Site history currently covers only the supported published Save button editor;
label that boundary until a separately scoped source covers other edits/releases.
Keep synthetic example history exclusively in the dev fixture. Preserve previous
uncommitted balanced-card changes outside this slice's commit.

## 2026-10-21 — Mockup card hierarchy and active-presence snapshot

Reuse the completed activity-feed slice (`680c474`) rather than replacing concurrent work. Keep the two dark feeds immediately below the journey map, on existing two/five and three/five content spans. Existing sources cover published Save button appearance edits and recorded listing actions/publications only; repository releases, registrations and geography remain unconnected and are not inferred.

Metric cards now place period controls in the heading and comparisons beside totals, with meaningful visitor breakdowns below. Counting options move into the management menu. Plot height is bounded, labels are enlarged, legends sit beneath charts, and single-series plots reserve the same legend space for aligned baselines. Balanced rows target 260px minimum card width to support the denser header; existing saved metrics and ordering remain intact.

Add Active now once to a nonempty saved layout, while respecting later removal and empty layouts. It reads the existing admin-protected expiring presence report during shared card refresh, never a five-minute traffic estimate. Show distinct browsers and the busiest supported pages; page counts can overlap across tabs. No invented identity split, historical graph, percentage comparison or independent polling. Invalid/expired data shows unavailable rather than zero. Existing admin exclusion and journey-node pulse rules are unchanged. Fresh default layout uses six cards; saved media cards remain available and preserved.

## 2026-10-22 — Complete card/feed contracts before activation

Replace the unavailable optional element-tracking/appearance-history dependencies in the curated release with one explicit scoped backend candidate and two named Contact/Text aggregates. Keep new collection disabled until a verified deployment receipt establishes coverage. Preserve unknown pre-activation periods, admin exclusion, current public account/listing flows and existing saved card choices.

Use confirmed registration records and coarse city/country context only when temporally linked; no location permission, IP, coordinates, messages or contact details in engagement events. Group visitor repetition by event/page/location/minute. Record published UI configuration mutations and verified deployment receipts, not unsaved workspace changes. Feeds have category filters and pause controls and poll only while on screen. No new production maintenance schedule is inferred; the private 90-day cleanup entry point remains separately operated.

Repository instructions require specific approval before production database changes. Finish and review the SQL, frontend, preservation/rollback and screenshots before requesting that approval. The exact candidate and local/hosted evidence boundary are in `docs/ADMIN_COMPLETE_CARDS_FEEDS_REVIEW_20261022.md`.

## 2026-10-22 — Explicitly approved activation and truthful live acceptance

Applied the single reviewed production migration and activated collection only after verified curated assets were live. Validate event recording, aggregation and feeds inside a rolled-back transaction instead of fabricating persistent visitor actions or creating customer records. Keep genuine traffic observation distinct from controlled backend verification and owner browser acceptance. Admin analytics remain excluded while published admin UI edits remain auditable site changes.

## 2026-10-22 — One browser/session identity, incremental presence updates

Use the existing connected browser/session storage records across page journeys and Contact/Text, with account identity kept separate. Login, logout, OAuth returns and campaign changes alone do not create a new session; retain session acquisition until the inactivity boundary. Presence heartbeats use only browser identity. Keep the existing browser-ID lifetime and admin exclusion; do not fingerprint devices or rewrite historical analytics.

Coordinate initial Overview readiness instead of exposing an unfinished shell. Update existing map nodes for presence changes and rebuild only when topology changes. Start feed reads when visible and deduplicate automatic in-flight reads. Reuse only the currency-display fix from the independently reviewed refresh branch, preserving its other work and draft PR. No hosted migration is necessary for these client fixes.

## 2026-10-22 — Preserve composers and guard each message stage

Read-only polling must reconcile message bubbles without remounting the composer. Keep a per-account/thread pending-send lock independent of DOM lifetime; preserve in-memory drafts and selected files while excluding them from analytics/persistent storage. Validate route/form/account after asynchronous Auth and upload work, and pass cancellation through network boundaries. Do not remove a photo when its commit outcome is ambiguous or automatically retry an uncertain send. Existing server authorization and RPC shapes remain; no schema change is needed for these client races.


## 2026-10-23 — One persisted theme for public and admin controls

Reuse `vacancy-theme-v1` rather than creating a separate admin preference. Both sun/moon controls reflect that single value and synchronise across tabs without rewriting incoming storage changes. Apply the saved choice before display; denied storage must not break rendering or toggling. Use admin-scoped semantic colour variables with unchanged light fallbacks, keeping graph values, series colours, page grid and permanently dark feeds separate from appearance. Place the control in the existing top-right space so Overview's hidden title bar stays hidden. No analytics or hosted configuration changes are needed for dark mode.


## 2026-10-23 — Keep event contracts strict and report unknown history honestly

Project shared identity into each collector's explicit payload contract; acquisition and new-session metadata do not belong in Contact/Text events. Preserve device/session IDs and the recorder's allowlist. Exclude identified admin activity at report sources, without rewriting old anonymous history. Use business records for successful conversations/publications and an expiry-aware bounded aggregate for available inventory. Missing traffic history suppresses comparisons and plotted zeroes; its first retained record is an evidence bound, not an uninterrupted-coverage claim. All non-custom Overview periods share the local calendar and refresh cutoff. Replace the unsupported request/publication ratio with a confirmed-publication count. Controlled live testing uses a separate journaled visitor, blocks business writes and deletes only its own analytics after closing the browser.


## 2026-10-26 — Separate public and admin theme preferences

The owner requested independent sun/moon controls. Keep the existing public preference unchanged and add a separate browser-local Admin preference. Do not copy the public choice into Admin. Resolve the active surface from the existing route for initial paint and navigation. Synchronize each preference across its own tabs only, tolerate denied storage and preserve separate in-memory values. This is theme separation, not a new admin domain, authentication system or layout redesign.


## 2026-10-27 — Expire and refresh Active now independently

Keep the installed 45-second active-browser definition and administrator exclusion. Refresh only the existing Active now card just before its server snapshot expires (normally about 10 seconds), bypassing the historical-card display batch. Expire its count even if the next read stalls, show unavailable rather than a fabricated zero, retry failures, and clear its timers on hiding, removal or an ended Admin session. Historical refresh cadence and the distinct five-minute activity panel stay intact. Existing source and the 26 October deployment remain rollback references.


## 2026-10-27 — Correct one missing Account Details execute permission

Keep public.admin_account_hierarchy as invoker and the existing guarded private helper as definer. Grant authenticated execution only on the helper, whose unchanged predicate requires active Admin membership and AAL2. Prefer this to elevating the public wrapper. Preserve anonymous denial and table privileges; fail closed if the captured function baseline differs. Test the privilege boundary and revoke rollback in disposable PostgreSQL before the scoped production approval step.
