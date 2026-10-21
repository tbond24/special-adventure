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
