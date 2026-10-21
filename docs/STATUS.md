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
