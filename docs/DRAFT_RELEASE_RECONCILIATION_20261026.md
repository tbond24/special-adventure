# Vacancy draft-to-release reconciliation — 26 October 2026

Current authorization: the user requested that pending drafts be published before continuing. This permits releasing compatible tested pending work. It does not make obsolete chart designs, local-only analytics experiments or unresolved editor adoption/recovery safe to release.

## Current serving baseline

- Domain: https://getvacancy.site
- Deployment: dpl_59tEFWEaiK5Q6yUjXHSZbeEaQUCm, dark-mode release.
- Latest remote source: 91b0911b28c32866c77b1a9382c0e512e9fb313f, analytics-accuracy branch.
- Original Codespace reported Shutdown, clean and with no unpushed changes in GitHub metadata. No workspace was resumed or reset.

## Every open draft PR

| PR | Work | Classification | Treatment |
|---|---|---|---|
| [#2](https://github.com/tbond24/special-adventure/pull/2) | Draft: Continue Vacancy admin implementation in Codex | Blocked editor release | Original continuation preserved; reconciled successor is #3. Full editor needs its separate hosted adoption/access/recovery gates. |
| [#3](https://github.com/tbond24/special-adventure/pull/3) | Reconcile Vacancy admin publication, language and analytics controls | Blocked editor release | Reconciled design editor/appearance/optional analytics source exists. Curated live overlay intentionally excludes editor; production role/adoption/recovery prerequisites remain. |
| [#4](https://github.com/tbond24/special-adventure/pull/4) | Set up safe Vacancy Codespaces development | Development tooling | Isolated Codespaces setup. Not a public product release. |
| [#5](https://github.com/tbond24/special-adventure/pull/5) | Add minimal admin grid cards and restore agreed Overview layout | Superseded / retained | Initial card grid, evolved into later published dashboard. |
| [#6](https://github.com/tbond24/special-adventure/pull/6) | Set desktop admin shell to one navigation column and five content columns | Published through successor | Desktop shell constraints retained in published Overview. |
| [#7](https://github.com/tbond24/special-adventure/pull/7) | Align desktop admin data cards to five-column grids | Superseded / retained | Early size rules evolved into later balanced card layout. |
| [#8](https://github.com/tbond24/special-adventure/pull/8) | Add selectable Overview graph cards on the desktop grid | Published through successor | Graph selection functionality retained/evolved in later published Overview. |
| [#9](https://github.com/tbond24/special-adventure/pull/9) | Build reusable desktop info tile v1 for Overview | Superseded | Early info-tile prototype replaced by agreed selectable cards. |
| [#10](https://github.com/tbond24/special-adventure/pull/10) | Set up Vacancy agent guidelines, mobile smoke checks and disabled PostHog | Development tooling | Agent guidelines/smoke tooling and disabled analytics setup; no public PostHog activation. |
| [#11](https://github.com/tbond24/special-adventure/pull/11) | Show tile trend prototypes and bring the Overview flow graph forward | Superseded | Synthetic trend prototype replaced by recorded-data card implementation. |
| [#12](https://github.com/tbond24/special-adventure/pull/12) | Restore agreed selectable daily metric cards and activity graph | Published through successor | Selectable cards evolved into current published Overview; old historical chart failure is not current release status. |
| [#13](https://github.com/tbond24/special-adventure/pull/13) | Add live activity, location and seeker graphs across screen sizes | Published through successor | Live/location/seeker reporting evolved into later published contracts; unsupported coverage remains labelled. |
| [#14](https://github.com/tbond24/special-adventure/pull/14) | Constrain reusable graph cards and prepare timezone-correct daily counts | Published through successor | Constraints/time-period work incorporated into subsequent dashboard releases. |
| [#15](https://github.com/tbond24/special-adventure/pull/15) | Remove Overview subtitle and add configurable button/page event explorer | Partial / optional pending | Subtitle removal evolved into published layout. General event explorer excluded from curated live artifact; not automatically enabled. |
| [#16](https://github.com/tbond24/special-adventure/pull/16) | Refine Overview card choices, time grids and automatic refresh | Published through successor | Uniqueness and refresh work retained; old vertical-guide design superseded. |
| [#17](https://github.com/tbond24/special-adventure/pull/17) | Show Overview daily-data refresh time | Published through successor | Shared refresh timestamp retained in published cards. |
| [#18](https://github.com/tbond24/special-adventure/pull/18) | Add named element tracking to reusable Overview cards | Partial / optional pending | Named Contact/Text aggregates published; general optional tracking catalogue remains excluded/disabled. |
| [#19](https://github.com/tbond24/special-adventure/pull/19) | Show live and unique browser counts in the first Overview tile | Published through successor | Live/unique first tile evolved into current visitor/presence cards. |
| [#20](https://github.com/tbond24/special-adventure/pull/20) | Add Overview card management and clearer period labels | Published through successor | Card management and period controls retained/evolved. |
| [#21](https://github.com/tbond24/special-adventure/pull/21) | Synchronize reusable card refreshes and restore percentage arrows | Published through successor | Shared refresh/comparisons retained; later plot style supersedes old overlay. |
| [#22](https://github.com/tbond24/special-adventure/pull/22) | Compare visits and unique visitors, and add repeat visitor card | Published | Visits/unique/repeat reports and cards included in released Overview. |
| [#23](https://github.com/tbond24/special-adventure/pull/23) | Add visitor journey map and browser analytics speed-test switch | Published through successor | Journey map and browser-local telemetry controls shipped through scoped releases. |
| [#24](https://github.com/tbond24/special-adventure/pull/24) | Connect live analytics reports through a separate private viewer | Private development tool | Read-only live viewer requires normal admin/MFA; not intended for public deployment. |
| [#25](https://github.com/tbond24/special-adventure/pull/25) | Connect Vacancy Test with an opt-in local-only PostHog page | Local-only experiment | Optional PostHog test page; intentionally not a public collection rollout. |
| [#26](https://github.com/tbond24/special-adventure/pull/26) | Publish scoped live admin Overview with stats and journey map | Published | Initial scoped admin Overview release, followed by later releases. |
| [#27](https://github.com/tbond24/special-adventure/pull/27) | Catch UI regressions and share overlapping listing renders | Published in this release | In-flight listing-read fix restored in current candidate; test infrastructure remains tooling. |
| [#28](https://github.com/tbond24/special-adventure/pull/28) | Refine admin charts, repair journey links and add expiring active presence | Published | Presence/navigation/reporting release; chart appearance later superseded. |
| [#29](https://github.com/tbond24/special-adventure/pull/29) | Draw curved admin charts using per-interval event counts | Superseded presentation | Curved chart presentation replaced by owner-selected point-to-point plots; interval counting retained. |
| [#30](https://github.com/tbond24/special-adventure/pull/30) | Restore compact admin charts and correct vertical time guides | Superseded presentation | Intermediate restored chart design replaced by later no-vertical-guide release. |
| [#31](https://github.com/tbond24/special-adventure/pull/31) | Fix mobile text overflow and stale page transitions | Published in this release | Remaining overflow/account/render fixes restored selectively; later published enquiry guards retained. |
| [#32](https://github.com/tbond24/special-adventure/pull/32) | Restore pre-screenshot plots and remove vertical gridlines | Published | Original polylines/horizontal-only guides published. |
| [#33](https://github.com/tbond24/special-adventure/pull/33) | Balance admin overview rows and preserve period selections | Published | Balanced cards and durable period choices published; later hierarchy refinements retained. |
| [#34](https://github.com/tbond24/special-adventure/pull/34) | Add desktop activity feeds with expandable summaries | Published through successor | Activity feeds expanded and published through #36/#37. |
| [#35](https://github.com/tbond24/special-adventure/pull/35) | Preserve forms and galleries during background refreshes | Published in this release | Unreleased Find gallery-preservation slice restored. Newer released messaging/currency repairs retained instead of wholesale old-branch replacement. |
| [#36](https://github.com/tbond24/special-adventure/pull/36) | Match admin cards to mockup and integrate dark activity feeds | Published | Mockup card hierarchy and dark feeds published, expanded later. |
| [#37](https://github.com/tbond24/special-adventure/pull/37) | Complete admin click cards and activity feeds with gated backend activation | Published | Scoped backend activation and complete cards/feeds release recorded. |
| [#38](https://github.com/tbond24/special-adventure/pull/38) | Preserve analytics identity through login/logout and stabilize Overview loading | Published | Identity and Overview initialization release recorded. |
| [#39](https://github.com/tbond24/special-adventure/pull/39) | Record published-site render, error and request audit | Audit only | Runtime audit report, not a product feature requiring publication. |
| [#40](https://github.com/tbond24/special-adventure/pull/40) | Preserve messaging drafts and prevent duplicate or obsolete sends | Published | Messaging/enquiry repair released; retained. |
| [#41](https://github.com/tbond24/special-adventure/pull/41) | Add persistent admin dark mode with a top-right sun/moon control | Published | Dark mode release verified by current live alias despite draft PR state. |

## New candidate scope

- Complete already-tested analytics frontend repair against the installed six report definitions. Read-only comparison verified exact function bodies, security-definer flags and settings; anonymous execution denied on all six readers.
- Bring across only remaining reviewed public fixes: listing in-flight reads, account render identity, Find card/gallery retention and long-content wrapping.
- Preserve current published messaging, cancellation, shared identity, admin exclusion, dark mode, card selection and original horizontal-only chart appearance.
- Curated builder remains based on preserved public app. No raw development deployment, merge, historical migration replay, new telemetry catalogue or PostHog activation.

## Concrete remaining editor/optional-feature gates

The current curated builder explicitly removes the Design destination and general event explorer. The older complete editor candidate requires its own schema/value adoption and role/access workflow, plus project-specific data/media recovery and hosted acceptance. Earlier isolated tests are not proof of current hosted adoption. Do not concatenate the original divergent candidate bundles or apply source migrations wholesale.

## Verification

- Isolated workspace: 102 passes / 22 intentional skips, chart checks and two HTTP-isolation checks.
- Actual curated admin composition check: PASS.
- Actual curated Overview stability check: PASS.
- Exact curated candidate across 320/390/820/1440 widths: 240 passes, including real polling timers, 4x CPU slowdown, gallery preservation, account switching, message drafts and cancellation. Synthetic isolated responses; not genuine live user delivery.
- Early test startups failed because the lazy Git baseline build had not finished. No product test was executed in those attempts. Exact baseline blobs were subsequently fetched/verified and both admin checks passed.

Production schema was inspected read-only. The final verified release was recorded in the site-change ledger only; no migration or customer mutation was performed.


## Release state

Candidate verified locally and published to getvacancy.site as dpl_AqzAjspq9LpHyE7kE41U9BdhPRTz from b0a89f2. Preserve dpl_59tEFWEaiK5Q6yUjXHSZbeEaQUCm as the prior frontend. The six analytics report bodies/settings match source and anonymous execution is denied. No SQL replay is needed for this candidate. Editor/optional-feature gates remain separate.

## Verified publication

All 113 staged static assets matched, including HTML. All 16 changed files matched on the production deployment and live custom domain. Normal sign-in gates rendered at 390/1440 widths with no page errors/write attempts and analytics excluded. Those gate checks controlled the public inventory response to avoid the cloud network read delay; they are not genuine owner/MFA/provider acceptance. Real user delivery and physical devices remain unverified.

Vercel rejected preview promotion with 422, so a normal production deployment was built from the same 121 content-addressed files, then independently checked before assigning getvacancy.site. No bypass or raw source deployment. The prior dark-mode deployment remains retained for frontend rollback. The release was recorded as one code and three UI ledger entries, transactionally preserving engagement coverage.

Current production catalog confirms admin_access_roles, admin_change_audit, admin_appearance_current, admin_appearance_drafts and admin_appearance_revisions are all absent. This is a concrete remaining editor deployment boundary, not a claim that every pending draft has been released.

GitHub PR workflow 40335120709 passed at exact source b0a89f2. Redundant push run 40335052449 was cancelled; it is not counted as a pass. No old PR was merged, closed or deleted.
