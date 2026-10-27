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

**PUBLISHED:** pre-screenshot plots with horizontal guides only, production
`dpl_DUDobz55C9BoUEWfoedJTZiteQNM` (READY), source `c6e6f3f`, live
https://getvacancy.site/#admin. Eight frontend files differ from previous live
artifact. Previous `dpl_EQqGhUuXLjvFiKy926zaDBYCqDyC` preserved. Exact manifest:
ADMIN_PRE_SCREENSHOT_PLOTS_RELEASE_MANIFEST_20261021.json.

PASS: final production and live asset hashes/native sign-in gate, zero page errors
or telemetry writes in excluded verification browser. Exact production composition
confirms original polylines and 12px toolbar spacing; focused horizontal-only and
spacing browser check passed after supporting Live activity guide removal (one
intended mobile skip). No database/Auth/collection or journey/presence changes.
Owner's genuine authenticated live visual acceptance remains UNVERIFIED.

## 2026-10-21 — Balanced cards and persistent periods (development)

Implemented the owner-selected balanced card rows (190px readable-width target, up to six per row), Today defaults with account-scoped browser persistence, 12-hour daily chart labels without vertical guides, and conditional journey-map reset. Saved choices are preserved, including removed cards. The activity plot now uses the exact hourly/daily server buckets for Today as well as longer periods. Lower overview reports were reviewed but retained pending the owner's selection.

Validation: PASS — 12 focused desktop card checks, horizontal-guide renderer checks, and isolated curated production composition; full isolated suite PASS — 74 tests passed, 18 intended skips. No production data, Auth, schema or telemetry collection changes.

Published curated frontend source `7d54415` to READY deployment `dpl_GvEArrdoNDPPm3LWvgWULBMHsAsC` (`vacancy-nerzds9wd-tbond24s-projects.vercel.app`) and `getvacancy.site`. Nine changed frontend files were uploaded within the preserved 118-file release; release manifest: `docs/ADMIN_BALANCED_CARDS_RELEASE_MANIFEST_20261021.json`. PASS: all 15 changed non-HTML release asset hashes matched; native admin sign-in loaded with zero browser errors and zero analytics writes in the excluded browser. Owner-authenticated live visual acceptance remains UNVERIFIED. Rollback `dpl_DUDobz55C9BoUEWfoedJTZiteQNM` retained; draft PR #33 preserves review. Isolated preview restored on 8776.

## Desktop activity feeds — 2026-10-21

Branch `codespaces/admin-activity-feeds-20261021` continues current local balanced
card source `7d54415` after remote-tip/open-PR audit. Earlier uncommitted balanced
card work is preserved. Two navy Overview feeds occupy spans 2 and 3 of the
existing five-track desktop grid with 24px spacing at >=1280px. Latest eight
summaries expand in place through native keyboard-accessible details controls.
Existing appearance history supplies published Save button edits only; the
protected marketing report supplies seven-day recorded actions/publications.
Coverage is explicit: no inferred registrations, visitor geography or code
releases. No new collection, database, Auth or hosted operations. Existing
synthetic fixture supplies labelled edit examples; no live-user proof claimed.

**PASS:** Node 24.21.0 locked install, chart checks, two HTTP isolation checks,
76 browser passes / 20 intentional desktop-only skips. Final focused feed rerun
passes both desktop checks (two mobile skips), including 1280/1440/1920px grid,
keyboard/pointer expansion, dark-panel text colour, empty/invalid/failing reads,
escaped notes and stale-session cleanup. First run exposed an incorrect CSS
property in the test; corrected. A subsequent full run was interrupted by SIGTERM;
fresh complete rerun passed. Close-up visual review caught inherited dim text;
explicit feed colours corrected and focused rerun passed. Preview restarted.
**PARTIAL:** site-wide edits, repository releases, registrations and visitor
geography have no connected feed source. Hosted data/owner-session acceptance
remains **UNVERIFIED**; no publication or production changes in this task.
Earlier balanced-card work was committed independently as `c7a6f70` while this
slice was underway; its remote branch and publication record remain preserved.

## 2026-10-21 — Mockup cards and integrated dark feeds

Branch `codespaces/admin-mockup-cards-and-feeds-20261021` builds on the completed `680c474` feed work after remote/open-PR audit. Implemented compact reusable cards with header period selectors, comparisons beside counts, visible unique/repeat breakdowns, bounded full-width interval plots and bottom legends. Added Active now from existing fresh visitor presence, at shared refresh, with page counts and admin exclusion. Preserved saved choices, balanced rows, deduplication and card management; no new collector or schema changes. Both dark feeds remain directly below the journey map with native expandable details.

PASS: isolated production composition and visual checks. Initial full suite found two obsolete test selectors after period/count controls moved into the header; selectors corrected. Final isolated suite PASS: 77 browser tests passed, 21 intended skips, plus renderer and HTTP isolation checks. Release receipt follows. PARTIAL: change feed has published Save button edits only; visitor feed has recorded actions/publications only. Code releases, registrations and locations are not claimed. No owner-authenticated live acceptance yet.

Published curated source `9a74a6f` to READY deployment `dpl_BUTFDuWyh36viYBR5kniLn3Fog3v` (`vacancy-3ydds54bl-tbond24s-projects.vercel.app`) and `getvacancy.site`. Nine changed frontend files within the preserved 119-file artifact; exact manifest: `docs/ADMIN_MOCKUP_CARDS_FEEDS_RELEASE_MANIFEST_20261021.json`. PASS: 16 changed non-HTML release assets matched on hosted release and live domain; native admin sign-in loaded with zero page errors and zero telemetry writes in the excluded verification browser. The upload of one plot module failed transiently and succeeded on retry before deployment. Previous `dpl_GvEArrdoNDPPm3LWvgWULBMHsAsC` retained for rollback. Draft PR #36 preserves review. Owner-authenticated live data/visual acceptance remains UNVERIFIED. Preview restored on 8776.

## 2026-10-22 — Complete cards/feeds, prepared for database approval

Branch `codespaces/admin-complete-cards-feeds-20261022` preserves the current released slice and separate refresh-stability work after remote/open-PR audit. Implemented the approved fresh six-card order and stronger visual hierarchy, explicit Contact/Text aggregates, registered/guest live-presence split, coarse registration context, and complete filtered/grouped/pausable UI/code and visitor feeds. Preserved existing saved layouts and removal preferences. Metadata-only inspection confirmed missing optional RPCs on production; no production data/schema writes occurred.

PASS: 82 isolated browser checks / 22 intentional skips, renderer and HTTP isolation; final focused feed checks and exact curated composition; disposable SQL coverage/counts/feed/AAL2/ghost/identity/cleanup checks; coarse-context endpoint privacy checks. Reused pinned Node24/lockfile, with disposable PGlite 0.5.11 outside the repo. Preview restored. Review images and precise activation/rollback sequence: `docs/ADMIN_COMPLETE_CARDS_FEEDS_REVIEW_20261022.md`.

UNVERIFIED: hosted activation and owner-authenticated real traffic. The production database update requires specific authorization under AGENTS.md; collection remains disabled in the candidate until a verified release receipt activates its coverage. No deployment or alias change has been performed in this task.

## 2026-10-22 — Approved production activation of complete cards and feeds

User explicitly approved the scoped database update, activation and publication. Installed only the reviewed migration and published curated source `4656864` to READY `dpl_AWnS1xJBLe65HFbjskuxJsvG6cKt` / `getvacancy.site`. Tracking activated by the verified release receipt at 01:17:56 Perth. Preserved previous deployment and presence rollback; no Auth/env/customer changes.

PASS: staged/live asset hashes, native sign-in without errors or telemetry, runtime coarse-context endpoint, authenticated production reports, anonymous report denial, rolled-back Contact/Text recording/dedup/card/feed checks and existing-admin event rejection. Real site feed has five release groups; visitor feed has 13 recent genuine groups. PARTIAL: no genuine new Contact/Text action or owner-authenticated browser observation yet; new totals zero at last read. Full evidence and limits: `docs/ADMIN_COMPLETE_CARDS_FEEDS_LIVE_20261022.md`. Draft PR #37 remains unmerged.

## 2026-10-22 — Stable browser identity and Overview initialization

On isolated branch `codespaces/identity-overview-stability-20261022`, verified login/logout already preserved connected IDs but Contact/Text used a separate session key. Centralized browser/session identity while retaining existing valid IDs, 90-day browser lifetime and 30-minute session inactivity. Presence reads browser identity without prolonging sessions. Existing admin client/server exclusion remains.

Fixed premature Overview shell reveal, repeated presence graph rebuilding and duplicate initial feed reads. Reused the reviewed currency-display slice from draft #35 without merging its independent form/gallery work; curated builder versions and includes that slice. PASS: 86 isolated browser tests / 22 intended skips, chart/HTTP isolation checks, focused identity/Auth-adapter checks and both exact curated-composition checks. Preview restored. Full evidence and limits: `docs/ADMIN_IDENTITY_RENDER_STABILITY_20261022.md`. No hosted writes or publication; genuine owner/browser acceptance UNVERIFIED.

## 2026-10-22 — Authorized live identity/render stability release

Published tested curated source `3ae5594` to READY `dpl_7528RE57NTRrzkZ5JXuw9HkaA7cr` / `getvacancy.site`; previous `dpl_AWnS1xJBLe65HFbjskuxJsvG6cKt` retained. PASS: 18 staged/live client asset hashes, native admin sign-in with zero page errors or analytics POSTs, controlled hosted Overview initialization/preserved graph nodes/single feed reads, and published-script login/logout/reload identity and admin exclusion checks. Existing-admin transactional server check accepted zero events without changing counts. Recorded the verified release receipt; original tracking coverage remained unchanged. No schema/Auth/env changes or merge.

PARTIAL: controlled hosted Auth/report responses are not a genuine owner-browser/MFA/provider session. No real account, listing, contact or message was created and no test analytics were persisted. Evidence and exact manifest: `docs/ADMIN_IDENTITY_RENDER_LIVE_20261022.md`, `docs/ADMIN_IDENTITY_RENDER_RELEASE_MANIFEST_20261022.json`.

## 2026-10-22 — Read-only site runtime audit

Audited the exact current live artifact at 1440px/390px. PASS: 11 live routes per width, no uncaught/console errors, failed requests, duplicate IDs or overflow in sampled default states; analytics excluded throughout and zero write attempts. Protected-page redirects are expected.

FAIL: isolated interaction stability on that artifact — 45 passes / 41 behavior failures across 23 overlapping scenarios; four additional missing-screenshot-reference failures excluded from defects. Confirmed composer data loss and duplicate pending Send, obsolete enquiry actions/redirects, three overlapping dashboard reads, Find gallery resets, manual currency navigation race, account-switch stall, stale message edits, hidden polling (three reads/12.1s) and long-content overflow. Four targeted reproductions confirm duplicate Send and hidden polling at both widths. No real messages/accounts/listings or analytics writes; no publication or product changes. Prior draft #31/#35 fixes remain separate. Evidence, priorities and limits: `docs/SITE_RUNTIME_AUDIT_20261022.md` and sanitized JSON under `docs/review`.

## 2026-10-22 — Tested messaging and enquiry repairs

Branch `codespaces/messaging-enquiry-stability-20261022` scopes the audited P1 fixes: keep composer/text/photos/busy state during read-only message refreshes; in-flight send locks; same-tab memory drafts; route/account/signal guards across guest Auth, credential refresh, uploads and commits; no stale enquiry redirects; hidden polling pause. Reused reviewed #31/#35 slices, preserving their other changes. Fixed only the manual-currency continuation needed to protect enquiry drafts. Existing shared analytics identity and admin exclusion remain unchanged.

PASS before publication: 46 targeted desktop/phone checks on the exact curated artifact; full npm test 86 browser passes / 22 intended skips plus chart/HTTP isolation; both admin production-composition checks. No schema/Auth/provider/env changes or real customer test activity. Review, coverage and delivery/cancellation limits: `docs/MESSAGING_ENQUIRY_STABILITY_20261022.md`. Live receipt follows after authorized publication.

## 2026-10-22 — Published tested messaging/enquiry repair

After the authorized pre-publication checks passed, published curated `bd14fb1` to READY `dpl_95Ghha9oCYXFYn3WuU9LE6eErvJN` / `getvacancy.site`. Nine changed files; prior `dpl_7528RE57NTRrzkZ5JXuw9HkaA7cr` retained. PASS staged and live: 22 client hashes, native admin gate with zero errors/write attempts, and 38 controlled messaging/enquiry browser checks per origin. Production transaction-local existing-admin recording check accepted zero events without changing counts. Recorded the actual verified code release in the site feed; no migration/Auth/env changes or real customer test activity. Draft #40 unmerged.

PARTIAL genuine delivery acceptance: controlled responses do not exercise real user-to-user delivery or owner/provider Auth. Accepted server requests cannot be recalled; client cancellation stops later obsolete stages and duplicate concurrent submits. Evidence and exact manifest: `docs/MESSAGING_ENQUIRY_LIVE_20261022.md`, `docs/MESSAGING_ENQUIRY_RELEASE_MANIFEST_20261022.json`. Private preview restored.


## 2026-10-23 — Persistent admin dark mode

Branch `codespaces/admin-dark-mode-20261023` continues audited `7e1bba0` after remote-tip/open-draft review. Adds a compact sun/moon control at the admin top right, sharing the site's existing browser preference. Choice survives refresh, navigation and another tab; blocked storage keeps the control usable. Scoped theme colours cover cards, selectors, dialogs, map/graph guides, tables and reports with light fallbacks. Numbers, analytics, grids and existing dark feeds remain unchanged. The curated builder includes the shared theme module/bootstrap with new cache versions.

**PASS:** Node 24.21.0 locked install; final npm test 94 browser passes / 22 intended skips plus chart/HTTP isolation checks; eight focused desktop/phone theme checks, including saved selection, public/admin return, cross-tab sync, blocked storage, centred icon, refresh spacing and sampled 4.5:1 text contrast. Both final composed-candidate checks pass. Desktop screenshot reviewed; private preview restored. No deployment, database/Auth/telemetry change or real visitor/message activity. Physical devices and real owner session acceptance remain **UNVERIFIED**. Review and analytics recommendations: `docs/ADMIN_DARK_MODE_REVIEW_20261023.md`.


## 2026-10-23 — Authorized dark-mode publication

Published tested `a76f589` as READY `dpl_59tEFWEaiK5Q6yUjXHSZbeEaQUCm` and assigned `getvacancy.site` after staged checks. PASS staged/live: 24 asset hashes, saved dark/light refresh, real sign-in gate, zero page errors and zero write attempts. Recorded actual release receipt; no schema/Auth/env or visitor activity changes. Previous messaging release preserved as rollback; draft #41 unmerged. Exact manifest/evidence: `docs/ADMIN_DARK_MODE_LIVE_20261023.md`.


## 2026-10-23 — Tested analytics accuracy and click-collection repair

Separate branch `codespaces/analytics-accuracy-20261023` follows the verified dark-mode publication. Fixes the real engagement payload/allowlist mismatch while retaining shared browser/session IDs; excludes identified admins in older reports; adds bounded unexpired location totals and a business-record snapshot; replaces the unsupported ratio with publication counts; shares local calendar periods/refresh cutoffs; marks unavailable traffic history and refreshes the retained snapshot in place. Original report definitions preserved for rollback; only the newly generated migration is in scope.

PASS before hosted changes: final npm test 102 browser passes / 22 intended skips plus chart/HTTP checks; disposable SQL source/count/dedup/history/expiry/privilege tests; both curated-candidate composition/stability checks. Preview restored. No historical or customer records were modified by these local checks. Review and controlled live-test cleanup procedure: `docs/ADMIN_ANALYTICS_ACCURACY_REVIEW_20261023.md`. Hosted results will follow separately.


## 2026-10-26 — Draft reconciliation and tested compatible release candidate

Audited all 40 open draft PRs against current dark-mode deployment dpl_59tEFWEaiK5Q6yUjXHSZbeEaQUCm and preserved remote histories. Many drafts are already published through curated successor releases or intentionally local-only/superseded. Current Codespace metadata reports Shutdown, clean and fully pushed.

Completed exact six-function analytics source/body/settings/grant comparison read-only. Restored only reviewed remaining public fixes from #27/#31/#35 (in-flight listing reads, identity-bound Account render, Find galleries and text wrapping), retaining published messaging/cancellation, theme and analytics identity. The curated overlay adds only those five public files plus the existing analytics-accuracy repair. No migration, new collection class or raw development deployment.

PASS: 102 workspace browser tests / 22 intentional skips, chart/HTTP isolation, both actual curated admin composition/stability checks, and 240 exact-candidate public/messaging/refresh cases across four viewports including polling soak and 4x CPU stress. See DRAFT_RELEASE_RECONCILIATION_20261026.md for every PR and remaining editor/optional-feature gates. Publication receipt will follow separately; this entry does not claim live release.


## 2026-10-26 — Published reconciled compatible draft fixes

Published curated b0a89f255249e12be01e81e4d15b9cc2a902c30a as READY dpl_AqzAjspq9LpHyE7kE41U9BdhPRTz and assigned getvacancy.site. Source remains reviewed branch codespaces/release-reconciliation-20261026. All 113 staged static hashes and all 16 changed production/live file hashes passed. Native desktop/phone sign-in gate rendered without page errors or attempted writes, using controlled public inventory responses. The exact PR workflow passed. Recorded the real release in the site-change ledger without changing engagement coverage. No schema/Auth/customer changes or merge.

Prior dpl_59tEFWEaiK5Q6yUjXHSZbeEaQUCm retained. Manifest: DRAFT_RECONCILIATION_RELEASE_MANIFEST_20261026.json; evidence: evidence/draft-release-20261026.json. Complete per-PR status: DRAFT_RELEASE_RECONCILIATION_20261026.md. Full visual-editor foundations are confirmed absent in current production and remain a separate gated release. Optional event explorer/tracking and local-only PostHog remain excluded. Do not claim every draft has been published.


## 2026-10-26 — Independent admin theme

User requested that Admin and the public Vacancy site be treated separately for theme selection. Admin now uses vacancy-admin-theme-v1, while the public site retains vacancy-theme-v1. Each defaults to light without its own saved choice. Existing public preference is preserved. Route changes and reload bootstrap select the appropriate preference; storage events affect only the matching surface, while Admin tabs still synchronize with each other. Blocked storage retains usable independent in-memory controls. No page layout, analytics, Auth, database or broader admin architecture changes.

PASS: ten focused desktop/phone theme checks; complete workspace 104 passes / 22 intentional skips, chart and HTTP isolation checks; actual curated admin composition with independent-theme navigation assertions; existing Overview stability check. Curated builder cache version updated. Publication receipt follows separately.


## 2026-10-26 — Independent Admin theme published

Published source cd39976ec1255f9b9ce34d2bdb9736b9456a5962 as READY dpl_7BTib4TYV1EHyit842MgW3Y2gTdM; getvacancy.site alias verified. Only five delivered files differ from the previous release: HTML, theme controls, Admin toggle binding and two cache-reference consumers. Admin and public preferences are separate and preserved across reload/navigation and other tabs.

PASS: local complete suite 104 / 22 intended skips, ten focused theme cases, actual curated composition and Overview stability. Five changed file hashes match at stage, production target and live domain. Native gate/storage checks passed at 390/1440 widths with controlled public inventory, no page errors or write attempts. These checks do not establish real owner/MFA acceptance.

CI run 40338456354 initially passed all theme cases but failed one inherited shared-cutoff timing assertion (103 passes / 22 skips / 1 fail). The exact inherited case then passed 20 repeated local cases. Hosted rerun was still installing browser dependencies at publication and is not represented as passed. Local full-suite and exact hosted artifact evidence supported this narrow release; CI status remains explicitly pending.

Recorded one code and one UI release ledger row, transactionally verifying engagement coverage unchanged. No migration/Auth/customer changes, merges or raw development deployment. Preserve dpl_AqzAjspq9LpHyE7kE41U9BdhPRTz for frontend rollback. Manifest: ADMIN_INDEPENDENT_THEME_RELEASE_MANIFEST_20261026.json; evidence: evidence/admin-independent-theme-20261026.json. PR43 retains the source history.

CI follow-up: exact deployed source run 40338456354 attempt 2 / job 121629275409 completed successfully after browser dependency installation. The initial inherited-cutoff failure remains recorded above; the rerun is now PASS.


## 2026-10-27 — Active now freshness repair baseline

Resume the requested Active now repair after the authenticated read-only Admin walkthrough. Account Details permission failure is recorded separately and deferred by the owner. Live deployment dpl_7BTib4TYV1EHyit842MgW3Y2gTdM is the rollback baseline; source d964988. Confirmed code defect: the card retains presence results through a shared approximately 60-second refresh even though each presence snapshot expires after 10 seconds. A slow full-card batch can also delay displaying the live result. Repair only the card's display freshness and lifecycle; retain browser identity, 45-second server presence window, registration breakdown, admin exclusion, telemetry and all other reports. No schema or Auth changes.


## 2026-10-27 — Active now freshness repair published

Published curated source 3225a9d7fc921e1dba19379037e94a6874051063 as READY dpl_8RGCnJpqfBRUKBBjhkngDWS2WwfM; getvacancy.site alias and five changed asset hashes verified. Active now refreshes shortly before its approximately 10-second snapshot expires, clears expired values while a read stalls, retries unavailable reads, and stops on hiding/removal/session changes. It no longer waits for historical cards. The 45-second server window, identity, registered/guest split, admin exclusion, historical cadence, layout and other reports stay intact.

PASS: regression fails on prior source; final local suite 110 passes / 22 intended skips, including six focused desktop/mobile cases; exact-source CI 40376302460 / job 121760156692; actual curated composition with independent refresh/expiry assertions; existing stability checks. Initial test harness issues (closed mobile sidebar, short early-morning visitor fixture period, asynchronous return to Admin) were corrected in test setup without weakening assertions.

Five changed files match stage, production target and live domain. Both hosted builds reached the native sign-in gate using real inventory. Owner's existing verified Admin session rendered the repaired card after live reload. Dynamic synthetic visitor transitions were tested only locally; no production visitor simulation or listing/message/moderation action was performed. Hosted anonymous entry checks can generate passive page analytics. No schema or Auth change. Release ledger recorded one code/one UI row with engagement coverage unchanged.

Retain dpl_7BTib4TYV1EHyit842MgW3Y2gTdM for frontend rollback. Manifest: ADMIN_ACTIVE_NOW_RELEASE_MANIFEST_20261027.json. Evidence: evidence/admin-active-now-20261027.json. Draft PR44 preserves source history; no merge. Account Details permission repair remains deferred by the owner.

### Owner-facing completion record — Active now

- **Issue:** The live card could display an expired presence snapshot and wait behind slower historical reports.
- **Solution discussed:** Refresh Active now independently and clear expired counts. This was the single proposed approach discussed with the owner; no comparison of multiple designs was conducted together.
- **Choice and reason:** Implement that scoped approach so the live count stays fresh without refreshing all historical reports more often or changing the counting rules.
- **Before:** The card joined the roughly 60-second shared refresh despite its server snapshot expiring after 10 seconds. Slow historical reads could delay displaying the result.
- **Now:** The card requests a fresh result shortly before expiry (normally about 10 seconds), clears expired numbers while fresh data is unavailable, retries failures and pauses when Overview is hidden. A confirmed zero remains distinct from unavailable data.
- **Verification:** 110 local passes / 22 intentional skips; six focused desktop/mobile browser cases; exact-source CI passed; assembled-release checks, live file hashes and the signed-in Admin load passed. Dynamic visitor changes were tested with isolated synthetic responses, not simulated production visitors.
- **Live status:** PUBLISHED and confirmed serving on getvacancy.site on 27 October 2026 (Perth). Source 3225a9d7fc921e1dba19379037e94a6874051063; deployment dpl_8RGCnJpqfBRUKBBjhkngDWS2WwfM. Rollback and evidence references are immediately above.

The owner requested this completion-report structure for every future repair. It is now part of AGENTS.md. This reporting update changes documentation only.


## 2026-10-27 — Account Details permission repair prepared

Issue: verified Admin Details fails before the existing helper's Admin/AAL2 gate because the invoker wrapper lacks permission to execute that helper. Discussed one-helper execute grant versus elevating the public wrapper; chose the missing grant to preserve existing function bodies, privilege modes, active-account/Admin/MFA checks, API exposure and data scope. Expected outcome: authorised Details opens the existing account/property/unit/vacancy hierarchy. No frontend change.

PASS: disposable PostgreSQL reproduces the original error, restores the full hierarchy, denies anonymous/non-admin/AAL1/suspended/absent-user reads (including direct helper calls), verifies no table grant or function-body/mode changes, and confirms revoke rollback. Prepared migration, exact captured baseline, test and rollback are in ADMIN_ACCOUNT_DETAILS_REPAIR_20261027.md. NOT LIVE: production permission change awaits scoped approval required by the recorded project process.

## 2026-10-27 — Account Details permission repair live

This completion supersedes the prepared/not-live entry immediately above. The owner explicitly approved the scoped production change.

- **Issue:** People & listings → Details failed with `permission denied for function admin_account_hierarchy_impl` even for the authenticator-verified Admin.
- **Solutions discussed:** Grant EXECUTE on the one existing guarded helper, or elevate the public wrapper to SECURITY DEFINER.
- **Choice and reason:** Grant only the missing helper permission. This preserves the existing function bodies, privilege modes and active-account/Admin/AAL2 checks while allowing the existing public read path to reach them.
- **Before:** Details failed before its authorization check and the account hierarchy could not open.
- **Now:** Details opens in the real verified owner session. Empty accounts show “No properties”; a populated lister account displayed two properties and two draft listing statuses. The existing account list and Close control remain usable.
- **Verification:** PASS — disposable PostgreSQL reproduces the defect, exercises the full hierarchy and missing-account result, denies anonymous/non-admin/AAL1/suspended/absent-user calls, confirms no table grant and verifies REVOKE rollback. Exact-source CI 40379592302 / 40379585895 and isolated workspace 40379585901 passed. Live catalogue confirms the one intended ACL change with all four definitions, owners, privilege modes and search paths unchanged; anonymous remains denied. No new security-advisor findings. Genuine owner browser checks passed. Denied-caller and rollback tests were isolated; production customer data was only read.
- **Live status:** LIVE on getvacancy.site, 27 October 2026 (Perth). Supabase migration history version `20261026184117`, `admin_account_hierarchy_execute`; source `a1a501b096fd0c6611cf86955078e93cb51f2574`, local migration `20261026183324_admin_account_hierarchy_execute.sql`. These timestamps identify one applied change and must not be replayed as separate migrations. Frontend remains `dpl_8RGCnJpqfBRUKBBjhkngDWS2WwfM`; no frontend release was required. Draft PR45 remains unmerged.

Record and rollback: [ADMIN_ACCOUNT_DETAILS_REPAIR_20261027.md](ADMIN_ACCOUNT_DETAILS_REPAIR_20261027.md). Evidence: [admin-account-details-20261027.json](evidence/admin-account-details-20261027.json). Rollback is `revoke execute on function private.admin_account_hierarchy_impl(uuid) from authenticated;`, restoring the captured helper ACL and original failure. No rollback was performed on production.

## 2026-10-27 — File storage and live listings cards prepared

- **Request:** Two metric cards showing storage used over time and number of listings. The owner selected Live listings when asked which listing count to use.
- **Approach discussed and chosen:** Reuse the existing Overview card layout; record a shared hourly aggregate of file bytes and active/unexpired listing count. This builds history while Admin is closed and preserves deleted-file/past-listing observations. No other design alternatives were presented to the owner. Current object timestamps cannot reliably reconstruct past usage.
- **Before:** System shows a current partial-bucket storage sum; Overview has New listings, but no file-storage history or live-inventory stock card.
- **Prepared behavior:** Two additional removable, reorderable cards with current/selected-period observations and existing period selectors. All uploaded-file buckets are included; database size/quota are excluded. Live listings uses the existing active/unexpired catalogue rule. The headline is a stock level, not a sum; change compares first/last observations with the starting timestamp. Earlier dates and gaps are not backfilled. Missing sizes are unavailable, distinct from zero. Existing choices and intentional empty layouts are retained.
- **Verification:** Actual aggregate/access/rollback regression passes in disposable PostgreSQL. Local browser suite 118 passes / 22 intentional skips; focused card checks pass, with final empty-layout check and CI receipts recorded after completion. Chart and HTTP isolation checks pass. Curated production-composition and stability checks pass with eight cards and no page errors. Real scheduler worker verification is a separate disposable CI job; hosted activation remains unverified.
- **Live status:** NOT PUBLISHED. No production SQL, pg_cron activation, scheduled job or frontend release. Two concrete migrations and the curated frontend are prepared for scoped approval, as required by the recorded production database rule.

Review, definitions, limitations and preserve-history rollback: [ADMIN_STORAGE_LISTINGS_CARDS_20261027.md](ADMIN_STORAGE_LISTINGS_CARDS_20261027.md). [Preview](evidence/storage-live-listings-preview-20261027.webp) contains labelled synthetic data only. Existing live frontend `dpl_8RGCnJpqfBRUKBBjhkngDWS2WwfM` and Account Details grant remain intact.

Preparation verified: final focused desktop/mobile checks 10/10 PASS, including the intentional empty-layout case. Exact source `da0573fe98b285158c349367480271140f8b1a1d` passes aggregate and real pg_cron scheduler CI 40384663261 / 40384657675, plus full isolated workspace CI 40384657626 (120 passes / 22 intentional skips). The first scheduler attempt failed to start its disposable cluster through runner systemd; direct cluster startup fixed that test setup. Actual background-worker execution, hourly registration and disable-with-history-preserved checks now pass. No hosted activation is claimed. Prepared evidence: [admin-storage-listings-prepared-20261027.json](evidence/admin-storage-listings-prepared-20261027.json). Draft PR46 preserves the candidate and rollback; production approval remains pending.

## 2026-10-27 — Owner's next edits recorded and prioritised

Recorded all 12 requested follow-up items in [VACANCY_EDIT_BACKLOG_20261027.md](VACANCY_EDIT_BACKLOG_20261027.md): three current issues, two new features and seven tweaks. Ordered easiest to most complex as requested. Includes save-button transparency/toast/copy cleanup, You copy, second Show number action, type icons/pins/pin labels, Admin journey-map motion, information relationships, map holding/random zoom, messaging usability, faster Find/detail/return navigation and a shared responsive public grid. Reported bugs are distinguished from verified root causes; unresolved visual/contact/layout choices remain open. This is documentation only, queued after the current metric-card task; none of the backlog UI changes were implemented or published.

## 2026-10-27 — Storage and live listings cards published

- **Issue/request:** The owner wanted storage usage and number of live listings visible over time. Existing System storage was a current, partial-bucket figure; New listings measured additions rather than the current live inventory.
- **Solution discussed:** Reuse the existing cards with one shared hourly aggregate recorder and a fresh protected current read. The owner selected Live listings. No alternative card redesign was discussed together.
- **Chosen solution and why:** Add File storage used and Live listings to the existing layout, record both together while Admin is closed, and preserve actual observations so deletion or status changes cannot rewrite past totals. Keep empty periods unavailable and existing counting/authorization rules intact.
- **Before:** No storage-history or live-inventory-stock card. A present-day file list could not reliably reconstruct deleted files or earlier listing states.
- **Now:** Real verified Admin shows **136.8 MB** and **6 live listings**, with hourly history from the first actual sample on 27 October (10:51 Perth). All uploaded-file buckets count; database size and quota are excluded. Yesterday correctly shows no recorded history. Existing periods, removal, ordering and saved layouts remain available.
- **Verification:** PASS — isolated aggregate/access/rollback tests, ten focused desktop/mobile card cases, chart/HTTP isolation, curated composition/stability, 113 staged static hashes and all seven changed production/live file comparisons. Real email/password plus authenticator owner acceptance passed after loading the fresh release. Two automatic hosted hourly runs succeeded. Final scheduler CI 40440738682 / 40440732072 passed; exact-source workspace 40440732023 attempt 2 passed 120 / 22 intentional skips. Its first attempt had an inherited cutoff-test timeout; local repeat attempts could not launch the missing Chromium executable and did not exercise the assertion. Both are recorded accurately in the review without weakening the test. Private deny-all table's informational no-policy advisory is intentional.
- **Live status:** LIVE on getvacancy.site. Released source `8c2c6383b7ab02323cb00420d0e9d9c22a3991be`; READY deployment `dpl_9THHwRembrMAtVo3M37FQZZSLJH4`. Hosted migrations `20261026191852` and `20261027025123` correspond to the two local capacity migrations; do not replay differing local/hosted timestamps as extra migrations. The owner explicitly approved publication. Optional old job-log deletion was removed entirely before recorder activation after the provider confirmation-state errors; only aggregate recording is scheduled.

Recorded one code/one Overview UI release entry with engagement coverage unchanged. No customer data, Auth settings or queued backlog changes. [Review and rollback](ADMIN_STORAGE_LISTINGS_CARDS_20261027.md), [manifest](ADMIN_STORAGE_LISTINGS_RELEASE_MANIFEST_20261027.json), [live evidence](evidence/admin-storage-listings-live-20261027.json). Rollback disables the named recorder, revokes its new read entry points and restores `dpl_8RGCnJpqfBRUKBBjhkngDWS2WwfM`, preserving snapshots, pg_cron and the previous Account Details repair. Draft PR46 remains unmerged.
