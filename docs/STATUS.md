# Vacancy development status

Audited 2026-10-20 (Australia/Perth). Repository: `tbond24/special-adventure`.

## Confirmed starting state

| Ref or service | Evidence |
| --- | --- |
| Latest development | `codex/vacancy-branch-reconciliation-20261016` at `8e4b9ea379bcbd88f9789c255b9480fb507a2c25`; 401 commits ahead of `main` |
| Original feature | `feature/admin-desktop-editor-20261014` at `0a5d4d8`; preserved |
| Continuation | `codex/vacancy-admin-continuation-20261015` at `3411cc2`; preserved |
| Open work | Draft [PR #3](https://github.com/tbond24/special-adventure/pull/3) targets the original feature; draft [PR #2](https://github.com/tbond24/special-adventure/pull/2) remains open |
| Default branch | `main` at `e4676ef`; older, not the current development source |
| Live Vercel project | `vacancy`, Node 24, production deployment `dpl_558VydjBz3tjnsNok5wgGQsoKZRz`, source `1a03a32592892a05ee0bdebbc33b75e409d7392e` on `test/remove-extra-copy-20261011` |
| Latest live-project preview | `dpl_6FMUHmBws5eT5HriaRtmEmS9cFXm`, synthetic preview source `859f6eb`; distinct from production |
| Protected test lab | `vacancy-admin-recovery-lab-20261015`, latest `dpl_8CpQAc6qUJmeheJXZMRRNmxCdpHo`, READY; hosting protection enabled |
| Supabase | Production `xtutkwiivqkgkqjpkxvj` and separate test `raauicmfyjpcuhfzknak` are healthy; production branch listing contains only its default `main` |

The repository had no dev container, root README/AGENTS or safe default start/test
command. The old laptop handoff selected an obsolete release. Product source is
`app/`; existing fixture and disposable integration tests can be reused.
Two existing local checkouts were also inspected read-only: the original feature
at `0a5d4d8` and the deployed baseline at `1a03a32` were clean and left untouched.

The Vercel connector provides reduced project metadata. Actual configured Git
production branch, root directory and build overrides were **not returned**.
The existing local Vercel login returned 403, so these remain unknown. Source
`app/vercel.json` contains listing-page rewrites. Workspace branch auto-deploy
guards are therefore included at both repository root and `app/`. The observed
deployment's source ref does not establish the configured production branch.

## Workspace change

Branch: `feature/codespaces-workspace-20261020`, based on the exact development
tip above. Adds a versioned Node 24 dev container, secret-free isolated server,
safe `npm test`, environment ignore rules and current setup instructions.
[Draft setup PR #4](https://github.com/tbond24/special-adventure/pull/4) targets
the reconciliation branch and remains unmerged with auto-merge off.
No existing branch/PR, product UI, database or hosted configuration is changed.
The only `app/` change is the branch-specific Vercel Git deployment guard.

See [DEVELOPMENT.md](DEVELOPMENT.md) for device switching, tests, secret handling
and explicit GitHub UI steps. See [DECISIONS.md](DECISIONS.md) for tradeoffs.

## Verification

Automatic startup follow-up (2026-10-20): **PASS** on source `4bc8161`.
The existing Codespace was rebuilt and then fully stopped/resumed; both lifecycle
checks found exactly one healthy preview without a manual start. Repeated and
simultaneous hook calls reuse one server. An unrelated listener on a disposable
test port was rejected and preserved. Port 8776 remains Private at the same URL.
The first plain-nohup attempt did not survive lifecycle cleanup; session detachment
with `setsid` corrected it. [CI 39349780214](https://github.com/tbond24/special-adventure/actions/runs/39349780214)
passes the existing 22 checks. Final acceptance records change documentation only.

- **PASS:** `npm ci --ignore-scripts` installs the existing lockfile; no dependency
  or lockfile changes. Microsoft Container Registry returned HTTP 200 for the
  Node 24 Bookworm manifest pinned in the dev-container configuration.
- **PASS:** `npm test`, Windows/Node 24.19.0: two HTTP/isolation tests and twenty
  Chromium cases across desktop/mobile, exit 0. Startup, logo/auth/error shell,
  synthetic admin report failure/recovery, real composed preview assets and
  existing language-control draft/conflict/restore behavior pass locally.
- **PASS:** CSP itself denies the browser's external fetch probe without network
  mocks. HTTP tests deny API/private/encoded-traversal paths and writes, remove
  production backend configuration, and fail closed on unrecognized hosted keys.
- **PASS:** staged whitespace, JSON and bounded secret-pattern checks; dotenv
  ignore rules verified. Product HTML/CSS/JS, SQL, lockfile and existing workflows
  match the starting source. Original local checkouts remain clean.
- **PASS:** [Linux GitHub run 39346774368](https://github.com/tbond24/special-adventure/actions/runs/39346774368)
  successfully installs locked dependencies/Chromium and runs the same isolation
  and desktop/mobile browser suite for setup source `0490dee`. A follow-up status
  record changes documentation only; runtime and test sources are identical.
- **PASS:** after the user's GitHub browser authorization, created
  [Vacancy development](https://vacancy-development-7v5vpv5w7vwpcx9rq.github.dev)
  on source `1145277789446d20d018a17567c1c7990160a9bd`, using the pinned image
  and official SSH feature 1.1.0. Actual runtime is Node 24.21.0; installation
  completed and `npm test` exited 0 inside the Codespace: two isolation tests and
  twenty desktop/mobile Chromium cases (47 seconds for the browser suite).
- **PASS:** [private port 8776](https://vacancy-development-7v5vpv5w7vwpcx9rq-8776.app.github.dev)
  is labelled by GitHub as Private. An unauthenticated request returned HTTP 302;
  the authenticated GitHub port tunnel returned HTTP 200 with isolation/CSP
  headers. Desktop 1440px and mobile 390px browser checks loaded the public auth
  shell/logo and synthetic admin, exercised report failure/recovery, and had zero
  page errors. No OAuth credential was sent in application request headers.
- **PASS:** [Linux GitHub run 39347834779](https://github.com/tbond24/special-adventure/actions/runs/39347834779)
  also passes for the SSH-enabled source. Later completion records change only
  documentation; container, runtime and test sources remain identical.
- **Ready:** one Codespace remains, using 2 cores/8 GB memory/32 GB storage in
  SouthEastAsia with a 10-minute idle timeout. Automatic startup now runs on
  container start/resume and editor attachment. The unused initial instance
  was removed only after confirming Shutdown, no changes and no unpushed commits.
- **Preserved:** no production/test database changes, provider variable changes,
  deployment, alias, domain, email, Auth or role changes. Existing draft PRs remain
  open. Latest production deployment still reports source `1a03a32`.

The first sandboxed Windows browser attempt passed its assertions but could not
finish child-process cleanup. A fresh run with normal process permissions ended
successfully as recorded above; no test failure was hidden or assertion weakened.

## Minimal admin card grid — 2026-10-20

Branch `codespaces/admin-card-grid-20261020` starts from the prepared workspace
`75270b2`; remote reconciliation remains `8e4b9ea`. Reuses the eight existing
Overview snapshot cards and their values. Adds hide/add-back, empty-grid recovery,
restored width labels, visible-card movement boundaries and responsive grid sizing.
Existing drag and earlier/later controls remain. Preferences save automatically
per account on this browser; denied storage reports that changes are temporary.
No new metric definitions, reporting periods, graphs, database calls or dependencies.
Preview: `/__admin-preview?section=overview`, synthetic data only.

**PASS:** Node 24.21.0, `npm ci --ignore-scripts`, then `npm test`: two isolation
checks and 24 desktop/mobile browser cases. New cases cover reorder/width/hide/add,
reload persistence, corrupt preferences, empty grid and denied storage. First run
had two assertion failures from comparing rendered line breaks with DOM text;
card identity assertions corrected, full clean rerun passed. Additional Chromium
check passed drag order, zero page errors and grid bounds at 1440/1024/800/768/390px.
Private preview restarted with the existing lifecycle hook after tests.

**PARTIAL visual context:** newer Overview/Marketing merge, navy sidebar, branded
logo and selectable graph cards described in the earlier local chat are absent
from this shared branch. This slice preserves the checked-out shell. Its existing
header wrapping and Site status styling defects remain visible and unmodified.
No claim of matching those newer local changes or full-page visual acceptance.
Backup investigation remains paused; no publication or hosted operation performed.

### Restore prior admin shell — 2026-10-20

Supersedes the visual-context limitation above for the navy sidebar, logo, merged
Overview and its accompanying header/Site status fixes. Recovered exact file-change
hunks from `Reconcile Vacancy handoff` (local chat): Overview merge turn
`01a15397-b9fb-7782-afe7-b1c63bf7f089`, navy/logo turn
`01a1539d-bd6b-7001-99e8-1844e53606a5`, layout correction turn
`01a153a2-75ae-79a2-a3f4-14b6411ccebc`. Applied those changes, adapting only cache
versions and the existing preview entry parameter. No selectable graph-card work
from the later turn is imported. Grid module and browser-local preferences remain
unchanged. Existing Marketing reports now occupy one Overview above the snapshot;
there is no separate Marketing menu/page or copied report content.

**PASS:** two isolation checks, 16 language browser cases, and eight affected
preview browser cases across desktop/mobile. Initial restoration attempts exposed
missing styles/logo; recovered hunks completed and affected suite rerun cleanly.
Final manual Chromium navigation Activity → Design & Style → Overview at 1440,
800 and 390px passed navy consistency, readable header, styled status card, retained
grid and zero page errors. Desktop screenshot inspected. Preview restarted with
existing hook. No hosted operations or publication; backup investigation paused.

## Desktop shell grid — 2026-10-21

Branch `codespaces/admin-desktop-grid-20261021` continues verified remote
`b53f58f`; reconciliation remains `8e4b9ea` and existing draft PRs are preserved.
At widths >=1280px the shell uses six equal CSS grid columns. Navigation occupies
one sixth of the shell width; direct content occupies columns 2–6 with 24px inner
insets. Sidebar remains full-height and independently scrollable. Shared spacing
uses 24px navigation top padding and 32px bottom padding. Overrides the previous
Design & Style content offset. Existing card sizes/preferences remain intact;
card spans and mobile redesign are deferred. Below 1280px existing styling remains.

**PASS:** Node 24.21.0, locked install, two HTTP isolation checks and all 24
existing browser checks. Focused desktop acceptance additionally passed 1280,
1440 and 1920px across Overview → Activity → Design → Overview: six columns,
exact one-sixth navigation, 24px content insets, no horizontal page overflow.
1440px Overview screenshot inspected. Private preview restarted. Synthetic UI
verification only; no hosted changes or publication.

## Desktop data card sizes — 2026-10-21

Branch `codespaces/admin-card-sizes-20261021` continues remote desktop shell
`3a8ddb2`; reconciliation tip remains `8e4b9ea`. Desktop stat, journey metric
and insight grids now use five equal tracks and 24px gaps within their containing
regions. Compact cards span one track; saved wide snapshot cards span two.
Cards have 24px padding and a 144px minimum height, stretch equally within a row
and grow with content. Report/information panels remain full width; nested panel
padding remains part of their existing containment. Existing card order, hide,
restore and v1 storage behavior are unchanged. Rules apply only at >=1280px.

**PASS:** two isolation checks and 26 browser cases; two desktop-only cases
intentionally skipped in the mobile project. Card acceptance covers five tracks,
24px gaps, compact/wide widths, minimum heights and page bounds at
1280/1440/1920px. Existing failure/recovery and saved layout cases pass.
1440px snapshot screenshot inspected. Preview restarted; no hosted operations.

## Selectable Overview graph cards — 2026-10-21

Branch `codespaces/admin-overview-graphs-20261021` continues remote `c6e526e`;
reconciliation remains `8e4b9ea`. Existing acquisition sources, publication outcome
evidence and listing milestone flow now occupy desktop spans 2, 3 and 5 within
the five-column content region, with 24px gutters/padding. No new metrics or
invented graphs. Desktop “Graphs on Overview” checkboxes select these views;
“Show all graphs” restores an empty selection. Preferences use a separate v1
account-scoped browser key, validate stored IDs and report denied writes.
Controls survive loading/error/empty report bodies. Both synthetic and connected
report entrypoints mount the same controls; existing report filters and stage
selection remain. Hiding flow also hides its selected-journey detail panel.
Selection/layout CSS applies only at >=1280px; narrower layout is preserved.

**PASS:** two isolation checks and all 26 existing browser cases (two desktop
cases intentionally skipped in mobile project), plus two new desktop acceptance
cases. New checks cover 1280/1440/1920px 2/3/5 spans, page bounds, selection,
error/recovery, reload persistence, empty selection, restore, stage interaction,
corrupt preferences and denied storage. Desktop graph screenshot inspected.
Preview restarted. **UNVERIFIED:** hosted connected aggregate data; no hosted
operations, authentication changes or publication performed.

## Repeatable info tile v1 — 2026-10-21

Branch `codespaces/admin-info-tile-v1-20261021` continues audited remote
`b35220a`; reconciliation remains `8e4b9ea` and existing drafts are preserved.
Shared `VACANCY_ADMIN_CONSOLE.infoTile` renders both synthetic and connected
journey aggregate tiles. Reference-inspired anatomy: decorative metric icon and
label, prominent value and supplied evidence/unit note. Desktop tiles occupy one
of five content tracks with 24px gutters/padding, 8px corners, a 160px minimum
height and natural growth. Shared renderer also gives insight tiles the same
anatomy. Existing values, units and unavailable-rate handling remain unchanged.
No synthetic trend, sparkline, comparison period or claim of real-time presence
is added. Desktop styling only; no unrelated reference-dashboard redesign.

**PASS:** two isolation checks, all 28 existing browser cases (four intentional
desktop-only skips in mobile), and focused tile acceptance at 1280/1440/1920px.
The focused check initially caught older specificity overriding minimum height;
corrected selector and rerun passed. It verifies five tiles, aligned/equal rows,
minimum heights, no clipped content, labels/notes, decorative icons, escaped text,
zero values and removal of stale tiles on report failure. 1440px tile screenshot
inspected. Private preview restarted. Hosted data remains UNVERIFIED.

## Make small and large graphs visible — 2026-10-21

Branch `codespaces/admin-visible-graphs-20261021` continues remote `e97b517`;
reconciliation remains `8e4b9ea`. Adds four explicitly labelled synthetic example
sparklines from the dev-only fixture to preview the top-row tile design. No trend
is inferred from a total; tiles without a validated nonnegative finite series,
and tiles with unavailable values, show Trend unavailable. Connected reporting
supplies no historical series and therefore does not render an invented trend.
Desktop flow now precedes source/outcome support cards and arrival summaries;
chooser spacing is tighter. Saved graph choices are preserved.

**PASS:** two isolation checks, 29 existing browser cases (five intentional
mobile skips), plus focused desktop acceptance for four visible preview sparklines,
unavailable-rate fallback, large chart preceding sources and no graph for an
unsupported real-data tile. 1440px screenshot inspected; preview restarted.
**PARTIAL:** production tile-history support and additional dashboard chart types
from the reference are not implemented. No hosted operations or publication.

## Restore agreed selectable daily graphs — 2026-10-21

Branch `codespaces/admin-agreed-metric-cards-20261021` continues remote `732e4ea`;
reconciliation remains `8e4b9ea`. Read the chats “Reconcile Vacancy handoff”,
“Prompt reusable metric cards” and “Create Vacancy Admin Mockup”. Exact requirement
and original implementation recovered from Reconcile turn
`01a153aa-55a7-7db0-9ef5-08fed631c5f8`, including the new-file patch and regression
cases. Some older ChatGPT assistant responses expose only content-reference
markers; their full prose is not claimed recovered.

Restores five matching cards: New accounts, New listings, New enquiries,
Messages sent and Media uploaded. Each independently selects any of those metrics
and Today/Yesterday/7/30/90 days, displays daily-count graphs and prior-period
comparisons, and saves choices per account in this browser tab. Removes arbitrary
example tile series. Uses existing protected adminDailyMetrics reader; existing
30-day backend history clamp stays unchanged, with unavailable history/comparison
shown explicitly. Original cohort summaries remain supporting report information
below the detailed flow rather than replacing the recovered top row.

Adds full-width Recorded activity line graph for the available daily accounts,
listings and enquiry counts, 7/30/90-day selector, legend, axes and matching data
table. Shares validated/cached reads with the tiles. Existing acquisition-source
counts gain meter bars without changing their journey counting unit. Recorded
activity joins existing graph visibility choices. Desktop five-track/24px grid
and mobile UI scope preserved. Both report paths mount the recovered component;
Refresh and account/visibility cleanup remain supported.

**PASS:** two isolation checks, 35 browser cases (11 intentional desktop-only
mobile skips), plus focused activity acceptance: three lines match table data,
period changes and missing 90-day history, five columns/24px gap/no page overflow
at 1280/1440/1920px. Recovered cases cover comparisons, zero baselines, malformed
history, failures, stale responses, reload choices and connected-renderer account
loss. Initial suite included an obsolete four-example-sparkline assertion; updated
to five daily graphs and full rerun passed. A focused test invocation initially
misparsed a CLI argument; corrected invocation passed. Desktop screenshot
inspected and private preview restarted.

**PARTIAL broader mockup:** reference-only visitor/live-user, location/map and
seeker-funnel charts are not claimed implemented by these daily-count graphs.
No production series validation or hosted operations performed.

## Live activity, location and seeker graphs; smaller-screen visibility — 2026-10-21

Branch `codespaces/admin-live-location-seeker-20261021` continues audited remote
`c32c806`; reconciliation remains `8e4b9ea`. Adds a two-column Live activity card
and three-column Listings by location card on the desktop five-track content
grid, with 24px gaps/padding. Existing seeker report now includes a full-width
search → open → enquiry → first owner reply stage graph, retaining its report
periods, coverage caveats and detail table. No new collection or backend changes.

Live uses existing recentActivity's browser IDs seen in five minutes, explicitly
not people online. Plot points are snapshots actually observed while this Overview
is open; initial state is a single point. Refreshes every 30 seconds only while
Overview/document is visible; request guards/timeouts and account cleanup prevent
stale updates. Location uses existing adminVacancies, deduplicates IDs and groups
active-status returned records by city; explicitly not a verified whole-market
count or visitor geolocation. Missing city becomes Unknown city. No IP inference,
map tiles, location permission or third-party analytics call is added.

Metric/large graphs and graph controls now remain visible below 1280px. Cards wrap
to three/two/one columns and new insight cards stack. Wide plot labels use internal
horizontal scrolling on narrow screens. Desktop shell/navigation ratios remain
unchanged. Graph preferences v2 migrate v1 selections and reveal the three new
choices, preserving the old key. User can hide/restore these graphs at every width.
Synthetic fixture adds isolated live/location/seeker responses for visual review;
renter collection remains unchanged/disabled where previously disabled.

**PASS:** two isolation checks and 42 browser cases, 12 intentional older
 desktop-only mobile skips. New acceptance runs in both browser projects:
1920/1440/1280/1024/800/600/390px graph visibility, 2/3 desktop spans, no page
overflow, hide/restore, invalid/missing/zero data and recovery, automatic polling,
Overview-hidden pause, resume and account loss. Six affected cases rerun cleanly
after final scheduling guard/style changes. Initial old graph-position check
raced report loading; added an explicit visible wait and clean full rerun passed.
Manual Chromium verified v1 migration, city values 12/6/3 after fixture refinement,
zero page errors/overflow and inspected desktop/small-screen screenshots, including
seeker graph. Private preview restarted.

**UNVERIFIED:** hosted data/permissions and whole-market geographic completeness.
No hosted service, production database, telemetry policy, credentials or deployment
changes; prior drafts and separate tools branch preserved.

## Constrained reusable cards and local-day graphs — 2026-10-21

Branch `codespaces/admin-card-constraints-20261021` continues audited `d31b058`;
reconciliation remains `8e4b9ea`. Reusable cards now constrain padding/gaps and
font sizes with clamp/container units; plots fill each card at a fixed aspect
ratio. Mini, activity and live plots use grey interior gridlines without a plot
frame. Mini/activity show compact value/date ticks without axis titles. Selectors
and graph actions use shallow grey fills, no border, no native dropdown arrows;
percentage arrows become signed values. Keyboard focus outlines remain. Redundant
Period/UTC labels and refresh/source arrow decorations removed; data-unit and
coverage caveats preserved. Timestamps display in the browser timezone.

Adds an additive, **UNAPPLIED** `admin_daily_metrics_local` migration plus client
reader. Local calendar days are aggregated by timestamp boundaries in a validated
IANA timezone, retaining existing private.is_admin authorization and 7–30-day
server clamp; the old RPC remains intact. Cards request the browser zone and
validate matching response metadata. Missing local-day reader/history displays
unavailable rather than relabeling old fixed-day totals. Custom journey date
inputs also use local midnight boundaries. Preview fixture supplies synthetic
local-day series; this does not enable hosted reporting or tracking.

**PASS:** two isolation checks and 46 browser cases (12 intentional older
 desktop-only mobile skips). New cases verify interior gridlines, no plot rectangle,
grey borderless arrow-free controls, full-width proportional plots and bounded
value fonts at 390–1920px. Timezone cases verify Today in Perth versus the prior
calendar date in Los Angeles at the same instant. Initial timezone assertion
caught inconsistent tooltip date formatting; corrected and full rerun passed.
Manual final asset/Perth screenshot checks pass at 1440/390px with zero errors
and overflow, including six live gridlines. A manual SVG-line visible assertion
was corrected to SVG visibility plus line count (horizontal lines have zero-height
bounding boxes); final check passed. Preview restarted.

**PASS isolated SQL:** PGlite 0.5.10 in `/tmp` executed the actual migration with
synthetic tables/admin predicate: guard response, execute grants, five metric
choices, 30-day clamp, Perth midnight inclusion/exclusion, anonymous exclusion,
invalid metric/zone rejection and 23/25-hour DST day boundaries. Reproducible check
is `tests/admin-daily-metrics-local.check.cjs`; install PGlite in a disposable
folder and set `VACANCY_PGLITE_MODULE` to its absolute package path when running
that file. No project dependency/lockfile change. This mocks the admin predicate;
it is not full real Auth/MFA or full-stack Supabase acceptance.

**PARTIAL hosted timezone readiness:** new RPC is not applied to any hosted
project. Actual hosted authorization, advisors, query plans and production data
remain UNVERIFIED. No credentials, Auth, database deployment or tracking policy
changed. PostgreSQL AT TIME ZONE documentation reviewed; Supabase changelog's
Markdown fetch was unavailable through the web reader. Query keeps created_at
columns bare and compares against precomputed bounds rather than wrapping table
columns in timezone functions. Existing deployment guards preserved.

## Overview subtitle and button/page event explorer — 2026-10-21

Branch `codespaces/admin-event-explorer-20261021` continues audited `de9355c`;
reconciliation remains `8e4b9ea`. Removes Overview's subtitle; existing metric
cards remain directly beneath the header. Adds full-width Button & page activity
on the same content grid with Track, Count and Period controls, grey interior
plot grid, local-day date ticks, daily data table and listing-page reach bars.
Selectors support existing Location/Listing details/Review opens, Create listing
and Publish clicks, and planned Contact/Text button events. Counts distinguish
recorded events, browser IDs, sessions and listing journey IDs. Transport duplicate
rows deduplicate by event ID; repeated real presses/opens retain separate IDs.
Missing identifiers make distinct counts unavailable instead of undercounting.
Stage differences are leads for investigation, not asserted funnel abandonment.

Uses existing protected adminListerMarketing read only. Records at the 5001-row
sentinel, malformed rows or out-of-range dates fail closed; account/visibility
changes clear stale data. Does not display raw identifiers. Graph preferences v3
preserve older selections and reveal the new explorer. Desktop/small-screen card
rules and preview isolation remain intact. Synthetic fixture includes repeated
page opens and contact/text examples with explicit fixture-only coverage metadata.

**PASS:** two isolation checks and 46 existing browser cases (12 intentional
older desktop-only skips in mobile), plus four new desktop/mobile explorer cases.
New checks cover subtitle removal, 3 total events versus 2 distinct browsers /
sessions / journeys after ID deduplication, stage differences, uncollected contact
state, missing unique IDs, capped-data failure and 1440/800/390px bounds.
Manual v2 preference migration, screenshots and zero page errors/overflow passed.
Private preview restarted.

**PARTIAL live button collection:** dedicated Contact/Text press instrumentation
and an approved collector/report coverage contract are not added or activated.
Actual report without those events/coverage says Not collected yet, never zero.
Existing listing milestone events can be explored when present; arbitrary page
tracking is not implied. No collection policy, consent, schema, PostHog setup,
hosted database or deployment changes in this slice. Previous unapplied timezone
migration remains untouched and unapplied.

## 2026-10-21 — Overview unique cards and time-grid rules

Removed header search/history/refresh/email. Reusable metric selectors exclude
metrics assigned to other tiles, regardless of period, and repair old duplicates.
Visible daily cards and Recorded activity poll every minute with hidden/account
cleanup. Zero periods have flat baselines through local current time; Yesterday
uses the full day. Rounded value scales expand/shrink with data. Period-based
major guides and thinner minor guides replace fixed vertical spacing. Reusable
tile dropdowns are transparent at rest and grey on hover/focus.

**PASS:** local server checks and workspace browser suite (50 passed, 12 intended
skips); final affected card suite (8 passed) includes new duplicate restoration,
three-hour/daily guides, hover and minute refresh/pause checks. Syntax/diff checks
passed. Desktop screenshot reviewed, no horizontal overflow; private preview
restarted through its lifecycle script.

**PARTIAL hourly data:** existing daily reports cannot provide hourly curves;
nonzero single-day periods show an aggregate point, zero days a flat baseline.
Percentages remain equal-length prior-period comparisons; Today compares its
partial total with full Yesterday. No new tracking, hosted operations or applied
migrations. Preview remains synthetic.

## 2026-10-21 — Overview daily-data refresh timestamp

Added a compact local date/time above the metric tiles. It advances after all
five daily reports refresh successfully, shows refreshing/incomplete states,
and is scoped to daily data because other reports refresh independently.
PASS: affected desktop suite 8/8, syntax/diff checks, browser success/failure
indicator checks. Private preview restarted. No hosted changes.

## 2026-10-21 — Reusable element tracking, development implementation

Branch `codespaces/reusable-element-tracking-20261021` continues audited `c875087`;
remote development remains `8e4b9ea`, open draft PRs preserved. Adds the shared
catalog/collector for Contact, Text/Send message, Location/Details/Review reach
and successful publication. Explicit tags and step hooks, versioned opt-in,
privacy withdrawal, privacy signals, bounded queue and no entered content.
Reusable top cards now configure these points with total events/distinct browsers,
unique metric choices, saved preferences and continuous covered hourly/daily
buckets through refresh. Missing coverage is unavailable, never invented zero.

New migration `20261021120000_element_tracking.sql` is UNAPPLIED and disabled by
default. Private RLS tables, strict fields and registry, existing ingestion budget,
idempotency, MFA-admin report, coverage restart handling and bounded prune helper.
30-day logical expiry; physical retention scheduling/activation are not performed.
No long-term aggregate store or 90-day real tracking coverage is claimed. Prior
local-day migration also remains unapplied. Preview uses synthetic report data.

**PASS:** two isolation checks, workspace browser suite 54 passed / 16 intended
desktop-only skips; six shared queue cases; final targeted tracking cases passed
including captured activations fed to the real card renderer, unique-browser
counts, repeated step views, guest sign-in survival, opt-in/withdrawal, zero and
missing coverage. Disposable PGlite executed the migration: disabled gate,
valid batch, idempotent retry, invalid fields/catalog/bounds, admin guard/grants
and expiry cleanup passed. Syntax/diff checks, five configured tracking cards,
zero page errors and 1440/800/390px overflow checks passed. Preview restarted.

**PARTIAL hosted readiness:** real collector API/grants, opt-in notice acceptance,
retention scheduler and hosted source parity are UNVERIFIED. No hosted credentials,
Auth, collection settings, migrations, deployment or domains changed. Supabase
function documentation and Postgres indexing guidance reviewed; changelog Markdown
was unavailable to the web reader. Extension/use contract: docs/ELEMENT_TRACKING.md.

## 2026-10-21 — Live visitor first tile with unique-period overlay

Branch `codespaces/live-visitor-first-tile-20261021` continues audited `65a328f`;
remote reconciliation remains `8e4b9ea`; open drafts preserved. First default
metric is Live visitors: current five-minute browser count, green five-minute
activity series and blue hourly/daily distinct-browser series, plus deduplicated
period unique total. Same reusable controls, five-column desktop grid, local
periods, grey guides and smaller-screen visibility. Preference migration is once
per account/session; explicit later choices remain configurable.

**PASS:** isolated suite 55 passed / 17 intended desktop-only skips plus two HTTP
isolation checks. New visitor case covers default/migration, distinct colours,
hourly mode, zeros/current cutoff, 30-second polling, pause and invalid report.
Updated existing daily-source cases to select their metric explicitly. Disposable
PostgreSQL executed new report: admin guard/grants, five-minute activity,
per-interval versus whole-period deduplication, admin/missing-ID exclusion,
bounds and true recorded zero periods passed. Syntax/diff checks and desktop
screenshot reviewed; no page errors or horizontal overflow at 1440/800/390px.
Private preview restarted with synthetic visitor history.

**PARTIAL hosted data:** `20261021130000_admin_visitor_metrics.sql` is prepared,
UNAPPLIED. No collection/Auth/retention/deployment changes. Existing analytics
coverage and hosted query plans remain UNVERIFIED; “live” means recorded browser
activity in five minutes, not guaranteed people online. Earlier unapplied tracking
and local-day migrations remain untouched.

## 2026-10-21 — Add, remove and reorder Overview metric cards

Branch `codespaces/overview-card-management-20261021` continues audited `775c134`;
remote reconciliation remains `8e4b9ea`, existing draft PRs preserved. Add card
above the tile grid opens a metric/count/period dialog containing only unused
metrics. Ellipsis menus move cards earlier/later or remove them. Five equal
tracks and 24px gaps remain at desktop widths; extra cards wrap onto new rows.
Existing smaller-screen tracks remain. Labels now say Last 7/30/90 days.

Preference arrays support zero through all twelve current metrics, retain order
and settings across session reloads, and repair duplicate/malformed entries.
All-selected disables Add; removing makes a metric available again. Empty layouts
stay empty after reload. Removed cards invalidate delayed reads and stop live
polling; reorder keeps the card's data/settings attached and shares period reads.
Scoped journey filter lookups prevent the new dialog form interfering with reports.

**PASS:** two HTTP isolation checks, 51 unaffected browser cases in the final
broad regression run; its seven selector-scoping failures were corrected and all
seven affected cases then passed in a targeted desktop/mobile rerun (3 intended
new desktop-only skips). Broad run had 20 intended desktop-only skips overall.
Coverage includes seven-card wrapping at 1280/1440/1920px, one shared tracking
read for two added same-period cards, reorder/settings persistence, removal and
availability, all twelve unique metrics, empty reload, disabled boundary moves,
late visitor response removal, and the existing operations-card arrangement flow.
Syntax/diff checks passed. Reviewed desktop grid/menu/dialog screenshots; manual
Escape closure, zero page errors and no overflow at 1920/1440/1280/800/390px.
Private synthetic preview restarted. No database, Auth, collection or deployment
changes; previously prepared migrations remain unapplied.

## 2026-10-21 — Shared card refresh, shorter comparisons and restored arrows

Branch `codespaces/shared-card-refresh-comparisons-20261021` continues audited
`d50e365`; reconciliation remains `8e4b9ea`; open draft PRs preserved. Removed
visitor tile's independent timer. Reusable cards now stage and publish together
on one minute refresh cycle, with one cutoff and Card data refreshed timestamp.
Previous card values stay visible while pending; incomplete reads are explicit.
Configuration changes retain normal user-triggered loading and shared caches.

Percentage text again ends with ↑ / ↓ and matches existing direction colours.
Footers say vs yesterday, vs the day before, or vs last 7/30/90 days. Added exact
current/previous range counts for five service metrics, matching elapsed local
time instead of comparing a partial Today to yesterday's full total. Tracking
cards use the same labels/arrows with existing matched event-time ranges. No
proration of daily aggregates. Missing exact comparisons never fall back to an
unlabelled full-day percentage. Daily-only single-day graphs remain aggregates.

**PASS:** full isolated suite 58 browser cases / 20 intended desktop-only skips
plus two HTTP isolation checks; two additional targeted cases passed for staged
all-card publication/common cutoff, comparison labels, upward/downward arrows,
matched yesterday cutoff and missing exact comparison. Updated visitor case
confirms no independent 30-second read and one shared minute read. Disposable
PGlite executed `20261021140000_admin_metric_comparison.sql`: admin guard/grants,
five metrics, matching windows, after-cutoff/anonymous exclusion, invalid inputs
and DST duration differences passed. Syntax/diff checks, desktop screenshot,
zero page errors and 1440/1280/800/390px overflow checks passed. Preview restarted.

**PARTIAL hosted comparisons:** new read migration remains UNAPPLIED; no hosted
SQL, collection, Auth records, roles, credentials or deployment changed. Hosted
source parity/query plans remain UNVERIFIED. Existing legacy report panels remain
independent of the reusable-tile refresh group. Official function documentation
and indexed-range guidance reviewed; changelog Markdown fetch was unavailable.

## 2026-10-21 — Visits/unique intervals and repeat visitors

Branch `codespaces/visits-repeat-visitors-20261021` continues audited `5e40bdd`;
reconciliation remains `8e4b9ea`; existing branches and draft PRs preserved.
First traffic tile now compares sessions and unique browsers in identical local
intervals, replacing five-minute presence. Added repeat-browser card with
registered/non-registered lines and explicit unknown classification. Both use one
shared read per period and the existing staged refresh. Repeat card is added once,
then respects removal/order/preferences; desktop remains five cards per row.

Prepared UNAPPLIED admin/MFA aggregate report/index migration
`20261021150000_admin_traffic_metrics.sql`. Canonical v2 only, admin activity
excluded; browser/session pairs dedupe page clicks and total intervals. Repeat
requires two sessions observed within the period. Current linked account status
cannot identify logged-out owners or reconstruct historical registration.

**PASS local:** disposable PGlite report tests cover dedup, cross-interval sessions,
repeat timing, guest/registered/mixed/deleted account splits, zero/missing data,
admin/legacy exclusion, bounded input and grants, aggregate-only results. Broad
workspace run: two HTTP isolation checks, 59 browser passes, 22 intended skips;
one selector failure was fixed and its affected flow passed in a targeted rerun,
alongside the new repeat-card shared-read/account-split/removal regression (2/2).
Syntax and diff checks passed. Preview restarted after tests.

**PARTIAL live:** read-only production schema/aggregate audit verified the source
and found 231 sessions, 131 unique browsers, 15 repeat browsers (3 registered,
12 non-registered) in a rolling 30-day window; latest canonical event 20 October.
New reports are absent. No production DDL, collector, Auth, credentials or
deployment changes. Codespaces remains synthetic. Scoped hosted verification and
activation remain outstanding; see ADMIN_TRAFFIC_CONNECTION_20261021.md.

## 2026-10-21 — Journey-map row and browser analytics speed-test switch

Branch `codespaces/journey-map-browser-analytics-20261021` continues audited
`8602a5c`; reconciliation remains `8e4b9ea`; open draft PRs preserved.
Added a reusable journey map on its own full-width content row immediately after
stats cards. Centre and branches show unique recorded browsers; selecting nodes
explores next recorded page/creation steps, reset restores the overview. Local
period/device filters, counts table, grey controls, circular nodes and a compact
browser-only analytics switch use existing layout constraints. No live-presence
claims, animation loop, graph dependency or independent map polling. Region
filtering and live pulses remain outside this recorded-transition first version.

Page tracking reuses bounded v2 batches after completed renderers and skips
obsolete requests/group refresh duplicates. Create entry precedes Location;
subsequent creation edges require explicit event linkage. Added UNAPPLIED report
candidate `20261021160000_admin_journey_map.sql`: same-browser/session page edges,
30-minute gap bound, distinct-browser counts, admin exclusion, bounded ranges,
existing admin/MFA guard, authenticated-only grants and five-second query timeout.
No visitor identifiers are returned. Historical missing edges are not reconstructed.

Browser-local setting loads before trackers and takes effect on reload. Disabled
mode skips tracker setup, identity creation, optional-policy requests, listeners,
timers and wrappers, while retaining no-op public hooks. Queue and six backend
telemetry writers are gated too. Static script downloads/parsing and server-side
operational records are not removed; this is a runtime analytics bypass. Other
visitors, optional consent and collection policies are unaffected.

**PASS local:** two HTTP isolation checks, 67 browser passes / 23 intended skips
in the broad regression run. Final focused map/switch/render-tracking suite 8/8
passed after lifecycle/entry-link refinements; separate appearance checks passed
for circular borderless nodes, compact switch and 1920/1440/1280/800/390px bounds.
Disposable PGlite report checks passed for observed edges, revisits, linked steps,
create entry, missing links, session isolation, gap bounds, device filters, admin
and legacy exclusion, no identity export, grants, invalid ranges and zero history.
Reviewed corrected desktop screenshot; zero page errors. Syntax/diff checks pass.
Preview restarted after tests. Production performance/query plans and hosted UI
remain **UNVERIFIED**; no migrations, Auth, credentials or deployments changed.

## 2026-10-21 — Authorized live reporting connection

Branch `codespaces/live-analytics-viewer-20261021` continues audited `369861a`;
reconciliation remains `8e4b9ea`; previous branches/drafts preserved. Owner explicitly
requested connection to live data after the no-prior-live-change clarification.

**APPLIED production:** provider migration `admin_live_analytics_reports_20261021`,
canonical bundle `20261021170000_live_analytics_reports.sql`, creates four previously
absent admin/MFA read reports plus `analytics_events_v2_session_time`. Local-day
history supports 180 days, matching card requests. The bundle was installed,
verified and removed in the isolated test database first; original Auth/admin/
analytics counts and guard definition preserved. No historical candidates replayed,
source records changed, collectors enabled, Auth settings/users/memberships changed,
or privileged provider variables pulled. Official provider receipts are retained.

**LIVE VIEWER:** separate opt-in server on 8780, exact static allowlist, fixed
production connection CSP, no API proxy, no synthetic fallback, no product write
controls. Uses existing password/MFA/admin verification and dedicated sessionStorage,
local-session sign-out and chart clearing on authorization failure. Reuses stats
cards and journey map with grid rules. Unsupported optional tracking metrics are
omitted. Both 8776 and 8780 verified Private through Codespaces; forwarded URLs
resolve to GitHub authentication (HTTP 302). Temporary verified official GitHub CLI
used existing workspace authorization to register forwarding; no token exported.
The auxiliary localhost forwarder was stopped; private web forwarding persists.
Manual startup helper has its own lock/readiness header/detached process and is
not called by normal lifecycle hooks. Synthetic preview protections are intact.

**PASS:** bundle installation/180-day histories in disposable PGlite; hosted test
and production aggregate queries; actual anonymous HTTP requests to all four
reports rejected 401; actual SQL AAL1/non-admin guards reject. Source range scan
uses the partial index (representative 1.155 ms, not a load benchmark). Actual Perth
Last 30 days: 231 visits, 131 unique browsers, 15 repeat (3 registered/12 non),
journey map 10 nodes/23 observed edges. Latest canonical activity 20 October at
8:05 pm Perth. No visitor identifiers or source row exports.

**PASS local UI:** full isolated suite two HTTP checks, 73 browser cases / 23
intended skips. New live-viewer cases use explicitly synthetic intercepted Auth/
report responses with real adapter: no pre-MFA reports, counts/map render,
unauthorized session clears, local sign-out and no exposed product mutation methods.
Actual unauthenticated sign-in screen reviewed, zero page errors, charts hidden.
Preview and live viewer running. Syntax/diff checks passed.

**PARTIAL browser acceptance:** owner must complete real admin sign-in/MFA in the
private live viewer; no production test account or user credential was used.
Google-only accounts without an existing password are not supported by this
initial viewer form. Existing source journeys are partial; expanded navigation
instrumentation and browser analytics preference remain development code, not a
public-site release. Contact/text collection stays off. Public production remains
`dpl_558VydjBz3tjnsNok5wgGQsoKZRz` / `1a03a32`, independently rechecked unchanged.
Exact preservation, activation and rollback scope:
`docs/ADMIN_LIVE_ANALYTICS_ACCEPTANCE_20261021.md`.

## 2026-10-21 — Redesigned Overview published to the live site

Owner explicitly authorized live admin publication. Branch
`codespaces/publish-admin-overview-20261021` continues audited `8301484`;
reconciliation remains `8e4b9ea`; earlier drafts/branches preserved.

**PUBLISHED:** production `dpl_BKoctvt9tPJRxMrDPeCp2AZW4Kkh`, live
`https://getvacancy.site/#admin`. Scoped artifact reconstructs public `1a03a32`
and overlays 13 admin/reporting preference files; 115 total source files pinned in
`docs/ADMIN_OVERVIEW_RELEASE_MANIFEST_20261021.json`. Existing public API handlers,
public styles and unrelated product modules are byte-identical. Draft design
editor/unsupported optional tracking are excluded. Actual connected-report mounting
now includes the journey map immediately after reusable stats cards. Desktop grid,
card management, native Auth/MFA and real aggregate report connections retained.

**PASS:** generated artifact syntax and actual admin composition with isolated
responses: six stats cards, map placement/creation exploration, no extra editor,
no browser errors or external requests. Hosted staged/static/live asset hashes
match (only the exact Vercel preview-toolbar suffix excluded on staging). Existing
API invalid-listing route 404 / webhook GET 405. Actual live unauthenticated admin
requires normal sign-in, with zero report requests, telemetry writes and page errors.
Automation disabled its own analytics before opening the public site. Protected
report source/permissions were verified in the preceding activation task.

Preview promotion returned 422; a normal production build of identical assets
passed READY and custom live alias was explicitly assigned. No force bypass.
Rollback `dpl_558VydjBz3tjnsNok5wgGQsoKZRz` remains. No database, collection-policy,
user, membership, Auth, email or privileged provider-variable changes in this release.
Owner's genuine authenticated browser acceptance remains **UNVERIFIED**; no real
credentials or production test account used. Partial historical coverage remains.
Publication and frontend rollback record: `ADMIN_OVERVIEW_PUBLICATION_20261021.md`.

### 2026-10-21 — Bounded live visitor/journey acceptance: PARTIAL

Authorized fresh-browser checks against getvacancy.site allowed normal analytics
and blocked all other non-GET requests. No account, listing or publication was
created. A test browser's production records confirmed one session, a Find page
view and listing_started at Create / step 0. Native chooser automation then timed
out, so later creation steps are UNVERIFIED. No browser page errors occurred in
the completed first run.

Read-only authenticated-role report checks at 08:00 UTC returned four visits/four
unique browsers over the preceding 30 minutes (aggregate includes all activity,
not asserted to be exclusively this test), Find=4 and step:0=2, but no edges.
Confirmed broken boundary: the deployed baseline connected-journey collector emits
lister_landing_viewed only at script initialization, so SPA navigation into Create
does not record its page node and cannot supply Find → Create → Location edges.
Stop full-flow acceptance here. Required correction: observe completed SPA route
renders once per actual navigation, preserve browser/session identity and linked
step events, then retest real chooser/Location/details/review transitions without
publishing. Authenticated admin browser rendering remains UNVERIFIED; database
report checks do not substitute for native admin login/MFA acceptance. No live
code/configuration/database schema changes were made during this test.

## 2026-10-21 — Reference charts, navigation repair and bounded active presence

Branch `codespaces/admin-graphs-presence-20261021` preserves publication branch and
its draft; remote tips/open PRs audited. Implements reference-style reusable
charts, previous-period overlays and elapsed-period percentages; data-only shared
refresh and right-aligned timestamp; heading/divider removal, Add card border,
neutral keyboard focus; corrected Create-before-Location event order; persistent
admin-browser exclusion and membership-gated telemetry; separate expiring private
presence with pulse-only-active nodes. See ADMIN_CHART_PRESENCE_20261021.md.

PASS: isolated workspace suite 72 passed / 16 intended skips; disposable database
presence/report checks; curated production composition with six cards/map and no
browser errors. Browser lifecycle covers visible, idle, hidden, resumed and
excluded states. SQL covers dedup, expiry, admin exclusion, invalid inputs and
private grants. Scoped activation/live acceptance recorded below when complete.

**PUBLISHED:** chart/presence update at https://getvacancy.site/#admin, production
`dpl_CcL6DQj3S66x5EudxKPhM81pEwju` (READY), source `cd61eee`, final 118-file
manifest in ADMIN_CHART_PRESENCE_RELEASE_MANIFEST_20261021.json. Prior live
`dpl_BKoctvt9tPJRxMrDPeCp2AZW4Kkh` preserved. Scoped production migration
`admin_chart_presence_20261021` only; Auth21/admin2/admin guard unchanged.

**PASS:** real live Home→Create→Location→Details→Review UI and corresponding
protected report edges; new traffic rows; presence reported active while open and
zero for that browser after closure. Collection 200/presence204, no browser errors,
no account/listing/upload/publication writes attempted. Local test images remained
in the disposable browser only. Native sign-in gate and 15 changed asset hashes
verified on live; genuine owner's authenticated admin visual acceptance remains
**UNVERIFIED**. See ADMIN_CHART_PRESENCE_20261021.md for complete bounded evidence
and reviewed provider advisor notices, not a clean advisory-scan claim.

## 2026-10-21 — Curved interval charts correction

Branch `codespaces/admin-curved-interval-charts-20261021` preserves previous live
branch/draft; remote tips and open PRs audited. Owner clarified counts are actions
per interval, not cumulative totals. Audit found the squared shape came from
plotting both start/end of each bucket at the same value. Underlying action
reports already count rows/events per half-open interval, with event-ID dedup for
custom tracking and distinct-browser mode where selected.

Replaced shared staircase polylines with bounded cubic paths through one sample
per interval end. Horizontal join tangents remain smooth and control points stay
within endpoint bounds: no negative counts, artificial peaks or future extension.
Zero periods remain a baseline; dashed previous periods and existing counts,
comparison percentages, admin exclusion and desktop constraints preserved.

PASS: 72 isolated browser tests / 16 intended skips; production composition;
curved geometry/zero/future/dashed regression check; disposable SQL explicitly
verifies action intervals [2,0,1] remain [2,0,1], excluding an admin action.
No database migration is needed for this presentation correction. Publication
receipt recorded below after verified activation.

**PUBLISHED:** curved interval charts, production
`dpl_4fGc63khFQVgpjUYTkNftAmQbxPc` (READY), source `2d865e4`, live
https://getvacancy.site/#admin. Only four deployed files differ from previous
live artifact: shared chart module and three cache-version integration files.
Pinned manifest: ADMIN_CURVED_INTERVALS_RELEASE_MANIFEST_20261021.json. Prior
`dpl_CcL6DQj3S66x5EudxKPhM81pEwju` preserved. No database/collection/Auth changes.
Production candidate composition and changed non-HTML asset hashes/native sign-in
gate verified before alias assignment; live verification used an excluded browser,
not a real owner session. Native authenticated owner visual acceptance remains
UNVERIFIED. New curve regression is part of npm test; standalone SQL verifies
individual per-interval action counts rather than cumulative counts.

## 2026-10-21 — Restore earlier chart design; repair vertical guides

Owner requested the earlier chart design rather than the reference-image restyle.
Branch `codespaces/restore-original-chart-style-20261021`; remote tips/open drafts
audited, previous branches and releases preserved. Restores compact 170×94 plots,
original per-metric palette and green/blue visitor lines, line legends and original
800×280 activity-chart proportions. Curved paths and actions per interval retained.
Existing comparison percentages, refresh controls, journey tracking and admin
exclusion retained.

Vertical guides now use local calendar/hour boundaries, fixed major spacing
(three hours/day, daily/week, weekly/30 days, fortnightly/90 days), thin minor
spacing and non-scaling strokes. Only interior lines are drawn; narrow cards hide
minor lines. Right date label matches the actual period boundary. No data or
counting changes. PASS: 72 browser tests / 16 intended skips, geometry/guide unit
checks, exact production composition and visual inspection. Additional local DST
hour-alignment check recorded after completion below.

**PUBLISHED:** restored chart design at https://getvacancy.site/#admin, production
`dpl_EQqGhUuXLjvFiKy926zaDBYCqDyC` (READY), source `f50ce45`; seven deployed files
differ from the prior live artifact. Earlier compact proportions, colour palette,
scale headroom and grey guides restored. Prior production
`dpl_4fGc63khFQVgpjUYTkNftAmQbxPc` preserved; intermediate build
`dpl_5DqaQ2N1RWJ6JFuEdPRHwKfZYcHw` also preserved, not assigned the custom domain.
Exact 118-file manifest: ADMIN_ORIGINAL_CHARTS_RELEASE_MANIFEST_20261021.json.

PASS: 72 full-suite checks/16 intended skips; 11 focused card checks/11 intended
mobile skips, including local New York daylight-saving guide alignment; bounded
curve/grid/scale unit checks; exact production composition and visual inspection.
Native sign-in gate and fifteen changed non-HTML asset hashes verified on final
production and the public domain, zero page errors/telemetry writes in excluded
check browser. No database, collection or Auth changes. Owner's genuine signed-in
live visual acceptance remains UNVERIFIED.

## 2026-10-21 — Actual pre-screenshot plots; no vertical lines; compact top gap

Owner clarified that the earlier restoration still retained unwanted vertical
lines and requested the actual plots used before the screenshot-based changes.
Branch `codespaces/pre-screenshot-graphs-no-vertical-lines-20261021`; remote tips
and open drafts audited, all previous branches/releases preserved.

Restored original point-to-point polylines, endpoint dots for single-metric cards,
original multi-series legends above graphs and original plot palette/proportions.
Removed screenshot-era curves and previous-period plot overlays. Percent changes
still compare the same elapsed preceding period; event counts remain per interval.
Removed vertical gridlines entirely, including supporting Live activity. Restored
comparison logic needs two traffic reads rather than the now-unused third full
previous-period overlay read.

Collapsed the unused desktop Overview header and the public Back button's reserved
space, which was hidden behind the sidebar but still consumed 43px. Add card now
starts 12px below the content top. Narrow-screen navigation remains available.

PASS: 73 isolated browser checks/17 intended skips, horizontal-only/original-plot
unit checks, exact production composition and direct DOM spacing measurement
(12px). No database, Auth, collection or journey/presence changes. Final release
receipt recorded below after publication.
