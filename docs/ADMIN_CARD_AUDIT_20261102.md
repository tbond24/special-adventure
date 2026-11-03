# Admin card behaviour and presentation audit

2 November 2026, Australia/Perth. Branch: `codespaces/admin-card-audit-20261102`.
Base: `583bba9e5ef5f4a61107a187ce5e222eb5d76abb` on
`codespaces/local-live-preview-20261102`. Remote tips and all open PRs were
reviewed first; older branches, drafts and release checkpoints are preserved.

**Result: PASS for the tested local behaviour and repaired presentation;
PARTIAL against the broader analytics roadmap; genuine signed-in production
acceptance UNVERIFIED. These repairs are LIVE as of 3 November 2026; publication
evidence is recorded in GOOGLE_TAG_20261103.md.**

**3 November correction:** the Google-tag regression run exposed a later,
more-specific chart-label rule in this audit's baseline that still used
`#737b89` in light mode (about 4.27:1). The earlier 5.0:1 light-axis claim below
was incorrect for the actual rendered rule. The follow-up corrects that rule's
fallback to `#637087` and retains the existing contrast assertion. Six focused
desktop/phone card checks pass after correction. The original screenshots and
JSON remain historical evidence; see `GOOGLE_TAG_20261103.md` and STATUS.md for
the follow-up validation and current delivery status.

The audit follows controls → backend adapter → SQL definition → rendered result.
It uses the existing synthetic fixture, isolated workspace browser configuration,
curated production composition and disposable PGlite 0.5.11. No hosted query,
customer action, session export, migration, email or deployment was performed.
Read-only HTTP checks found all eight sampled live JS/CSS assets identical to the
latest November 2 release manifest. This establishes the source baseline, not a
genuine signed-in walkthrough or current database-definition verification.

## Card-by-card findings

PASS below means the stated existing contract passes local checks. It does not
assert that a deferred product requirement is implemented or a real transaction
was performed. Every metric card uses the same repaired presentation template.

| Card | Actual meaning and boundary checked | Result |
| --- | --- | --- |
| Active now | Fresh browser identities, registered/guest availability and current page presence; independent refresh, expiry to unavailable, zero, slow historical reads, hidden-page and account cleanup | PASS locally; browser counts are not people online |
| Visits & unique visitors | Distinct recorded sessions and browser identities within the selected period; shared traffic reads, calendar bounds, incomplete history and unavailable comparisons | PASS for the existing measure; PARTIAL for the agreed New/Total visitors and persistent account identity feature |
| Repeat visitors | Existing repeat-session measure and registered/guest split; shared reads, distinct identities, unavailable history and account cleanup | PASS locally; original definition preserved |
| New listings | First qualifying successful publication per listing, excluding transient create/reset events, failed transactions and retries; existing Admin exclusions | PASS locally, including disposable SQL publication tests |
| Contact clicks | Accepted Contact/phone/enquiry-entry press records, or distinct recorded browsers in the selected counting mode; coverage, invalid reports and retry deduplication | PASS for existing event counting; PARTIAL for per-visitor/listing Call actions |
| Text clicks | Accepted Text/SMS/WhatsApp/enquiry-submit press records; count mode, history, validation and unavailable state | PASS for existing event counting; PARTIAL for per-visitor/listing Message entry. A press does not establish successful delivery |
| File storage used | Latest observed storage-object byte total, not the sum of samples or database size; decimal units, unknown sizes, gaps, no history, live/history contracts, retained graph and open values table | PASS locally |
| Live listings | Observed active, unexpired listing stock; change from first available sample, expiry/history gaps and live refresh; never summed across time | PASS locally |
| New registered accounts, optional | Verification completion, including later guest conversion on the same ID; excludes unverified, anonymous and Admin records | PASS locally, including verification-date SQL tests; real verification/email delivery untested |
| New Messages sent, optional | Owner-approved first persisted visitor message per visitor–listing pair; guests included, separate listings count separately; Registered/Non-registered lines reflect send-time verification | PASS locally, including failed transactions, duplicate conversations, boundaries and unknown historical status |
| Total messages sent, optional | Successfully persisted initial messages, follow-ups and replies with send-time sender split; invalid splits do not fabricate lines | PASS locally; actual production delivery and live push acceptance unverified |
| Media uploaded, optional | Existing count of retained media records created in the period with existing Admin exclusions | Rendering, periods and failure handling PASS locally; broader media-history feature remains deferred. This is not a permanent upload-event ledger |

Important scope differences are retained and explicit: the capacity Live listings
reader includes qualifying Admin-owned listings; location and business snapshot
readers exclude them. File storage covers storage objects, while System's Media
storage uses its existing media-storage source. These numbers are not required to
match. The legacy Activity accounts-created series measures creation rather than
Overview's verified registration. This audit does not silently redefine any of
those populations or backfill unavailable history.

## Supporting panels

| Panel/cards | Verification and limit |
| --- | --- |
| Recorded activity | Three series, period selector, matching table, missing/invalid reports, refresh and local calendar bounds pass; axis text now shares the metric-card treatment |
| Visitor journey map | Branch exploration, period/device filtering, expanded transition counts, retained graph/focus/height on slow refresh, failure, access loss and live invalidation pass |
| Site changes and Visitor activity feeds | Grouping, filters, pause/resume, escaping, failure recovery and identity cleanup pass. These remain intentionally desktop-only below 1280px; viewport re-entry refreshes each feed |
| Live activity | Explicit five-minute browser snapshot measure and history collected while Overview is open; zero/missing/invalid data and visibility polling tested. It intentionally differs from Active now's 45-second window |
| Listings by location | Bounded aggregate, city totals, exclusions, malformed-report rejection and refresh tested; no inference of visitor addresses |
| Acquisition sources, publication outcomes, listing milestone flow | Existing fixture tests cover graph choices, selection, empty/incomplete/error states and recovery; current curated composition also checked with an explicit empty connected-report fixture |
| Marketplace snapshot: Open reports, Oldest report hours, Active listings, Profiles, Properties, Units, Message requests 7 days, Published listings 7 days | Retained eight-card grid, hide/add/reorder/width preferences and refresh/failure-to-unavailable tests pass. These supporting counts retain their documented definitions |
| Activity: recent browser IDs, non-guest accounts created, daily activity | Synthetic populated rendering and light/dark navigation inspected; existing creation-based series kept distinct from verified registrations |
| System: Delivered, Bounced, Complaints, Failed/suppressed, Media storage, Client errors | Populated rendering, period change, zero denominator, current failure/recovery and stale success/error rejection pass after the fixes below. No real provider-delivery acceptance claimed |
| People/listing results and report queue/history | Synthetic read-only navigation and rendering inspected in both themes, without overflow; moderation/account write actions were not exercised |
| Seeker journey | The production builder omits this unshipped panel but previously retained its checkbox. Removed the nonfunctional production option and preserved existing selected graph IDs. Workspace-only seeker previews remain available |

## Repairs and styling consistency

1. **Truncated headers:** a single line shared the title, period and menu. At
   1440px several default names were visibly ellipsized. The title now occupies
   its own row; the period/Now badge and menu share the following row. Native
   selectors, keyboard access and saved metric IDs remain intact.
2. **Inconsistent axes:** only three X axes were previously compensated for SVG
   stretching. All shared chart axes now render at their CSS size, including Y
   axes and Recorded activity. Narrow charts keep endpoints/noon and omit crowded
   quarter-day labels. Interval values, series coordinates and counting rules
   are unchanged. Chart and legend muted text now uses the existing readable
   `#637087` light fallback rather than `#737b89`.
3. **Compact dimensions:** shared compact charts are 120px high, preserving the
   existing compact-card acceptance after the extra header row. Metric cards
   retain 20px padding, 10px corners, 24px grid gutters, 16px title controls and
   42px values. Cards grow for content and share height within each row. Graph,
   feed and live-presence layouts retain the controls and explanations their
   different data requires.
4. **Silent preference failure:** denied local storage previously swallowed the
   save error. A persistent status now says layout changes are temporary; opening
   Add card preserves that notice. A subsequent successful save clears it.
5. **System state/units/race:** replaced the permanently visible Loading
   description with a description of the records. MB now consistently means
   1,000,000 bytes. Request-version, actor, route, connection and assurance checks
   prevent obsolete period results/errors from replacing the selected period.
6. **Production chooser:** omitted Seeker/Button-page choices are filtered from
   the curated chooser while old saved selections retain their available IDs.
   The candidate builder includes the System fix and fresh asset version
   `20261102-card-audit`.

Measured light/dark layouts at 390, 768, 1024, 1280, 1440 and 1920px: no page or
card-control overflow, no clipped card text and no truncated metric titles. All
twelve choices render across Today/Yesterday/7/30/90-day synthetic periods.
Regression assertions verify unit text transforms, tick separation and at least
4.5:1 chart-axis text contrast; light chart labels are approximately 5.0:1.
Screenshots were visually reviewed. This is not a complete accessibility audit,
physical-device test or Safari/Firefox acceptance.

## Validation and evidence

- Node 24.21.0; `npm ci --ignore-scripts`; committed lockfile unchanged.
- `npm test`: **160 passed, 22 intentional skips**, plus chart and HTTP isolation
  checks. Six new desktop/phone cases cover all-card presentation, System races/
  units/error recovery and denied preference storage.
- Eight existing disposable SQL suites PASS: message metrics, registered accounts,
  first publication, first enquiries, capacity changes, analytics accuracy,
  complete cards/feeds and realtime notifications. They also cover access and
  scoped rollback. These do not run real cron/concurrency or hosted transactions.
- Final curated composition and stability checks PASS, including preserved graph
  choices, one feed read per viewport entry and retained map/chart/disclosure state.
- An intermediate broad run had 154 passes/22 skips/two failures because the new
  visual test sampled a resize before fitting completed. Its unchanged geometry
  expectations now poll for responsive rendering. A subsequent full run passed.
- A curated check initially expected one feed read over a sequence that scrolled
  through the feeds twice after the layout change. It now establishes an
  offscreen baseline and requires exactly one read per controlled viewport entry.
  No feed runtime behaviour or expected counts were weakened.
- Initial audit-script period selection included Active now's intentionally hidden
  control; corrected the audit selector to visible controls.
- Preview restarted using the existing lifecycle hook after browser tests.

Evidence: [measurements and asset hashes](evidence/admin-card-audit-20261102.json),
[desktop light](evidence/admin-card-audit-light-1440-20261102.png),
[desktop dark](evidence/admin-card-audit-dark-1440-20261102.png),
[phone light](evidence/admin-card-audit-light-390-20261102.png),
[phone dark](evidence/admin-card-audit-dark-390-20261102.png),
[loaded supporting panels](evidence/admin-card-audit-panels-light-1440-20261102.png).

## Delivery, remaining work and rollback

**LIVE, 3 November 2026.** The owner explicitly requested publication. Curated
source `1e1bece` and production `dpl_AQGn9ZZipYzfPSMjLUwPXBubAnQk` now serve
getvacancy.site, including these repairs, the separate contrast correction and
Google tag. No SQL/Auth/role/provider/environment changes. The preceding November
2 deployment `dpl_GV7QcLskPJ7K4gkQJnAH9Rb9LhE7` is retained for rollback;
no production rollback was executed or needed. See GOOGLE_TAG_20261103.md for
source/served hash verification, browser checks and explicit live acceptance limits.
Review/revert only this branch's repair commit to undo it; no recorded activity
or customer history needs reversal. Existing release rollback deployments remain
preserved. Draft PR targets the audited latest development source, not `main`.

Do not declare every production card fully accepted: genuine Admin/MFA, actual
visitor sends, provider outcomes and production change notifications were not
observed here. Identity/New-versus-Total visitors and per-listing Call/Message
definitions remain pending under the existing metric plan. Repeat visitors,
retention, media backfill and unshipped reporting are not implemented by these
presentation repairs.
