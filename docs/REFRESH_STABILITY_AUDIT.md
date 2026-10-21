# Vacancy refresh stability investigation

## Result and scope

This undeployed follow-up investigates intermittent redraws using the public UI
fixes from draft #31 (`084eaf3`) as its base. Branch:
`codespaces/refresh-stability-20261021`; rollback:
`rollback/pre-refresh-stability-20261021` at that same commit. Later admin chart
branches, the PostHog test experiment and previous worktrees remain separate.

The user story is: background data or currency responses arrive while a visitor
is typing, viewing a photo, reading older messages or changing pages; useful new
data appears without replacing the active form, losing its draft or jumping away.

## Confirmed reproductions and fixes

| Trigger demonstrated in isolated browser | Observed before | Change |
| --- | --- | --- |
| Saved non-native display currency; delayed exchange-rate response succeeds or fails after sign-in is ready | The entire page rendered again and the typed email became empty. | Update Find currency controls/results in place; do not render unrelated screens. |
| A currency response completes after navigation to Enquire | A typed enquiry became empty. | The same route-aware currency refresh preserves the connected form. |
| A reply arrives while a peer summary is delayed and the visitor keeps typing | Polling replaced the composer and restored an earlier draft. | Update read-only conversation content; keep the actual composer, focus and selection. |
| A visitor selects a photo during that delayed poll | The new file selection disappeared. | The file input and preview stay mounted. |
| Polling updates while Send is pending | The composer was replaced with an enabled Send button. | Preserve the existing form and its busy/disabled state. |
| A different conversation changes | The open conversation composer was replaced. | Compare the displayed conversation's content when a thread is open. |
| An inventory refresh changes another listing | An unchanged card was replaced and its gallery reset. | Reuse unchanged card nodes; preserve gallery positions for replaced cards too. |

Four initial currency reproductions and five polling/inventory reproductions
failed on the original source in mobile Chromium. Their reports/traces were saved
before fixing the causes. These reproduce source paths with controlled synthetic
responses; they do not establish that every reported live incident has this cause.

## Implementation choices

- No runtime recorder, dependency, provider setting or database change. Debug
  wrappers, DOM observations, stacks and timing probes exist only inside tests.
- Currency completion preserves form state. Find refreshes prices/filter results
  and currency labels without rebuilding the map/search shell. Other open pages
  keep their already labelled prices until their next normal render/navigation;
  the updated rates are then used. No currency conversion is fabricated.
- Polling still runs at four seconds. A thread update reconciles message bubbles
  by ID and source markup, preserving loaded photo buttons. Changed bodies/media
  are included in the signature. Navigation/user guards still discard old results.
- Find reconciles cards by ID plus data/presentation state. Existing handlers are
  reused or rebound through the established gallery/navigation hooks. Selected
  gallery index and rail offsets are retained where the content still permits it.
- No security boundary was relaxed: the isolated preview still sanitizes hosted
  URLs, denies API routes and enforces CSP. The fixture intercepts requests and
  blocks external services/WebSockets before opening the app. Measurement is off.

## Repeat the checks

Use this branch with Node 24 and locked dependencies. Install Chromium as in
UI_AUDIT.md and stop that checkout's manual port-8776 preview before testing.

- `npm run test:refresh` — all refresh cases at 320/390/820/1440px.
- `npm run test:refresh -- --project=mobile-390` — mobile investigation.
- `npm run test:refresh -- --grep '@soak'` — natural-timer mixed-page sessions.
- `npm run test:refresh -- --grep '@stress'` — 4x CPU slowdown with delayed replies.
- `npm run test:refresh:report` — open the report; click a row and its trace/timeline.
- `npm test` — existing HTTP/workspace/UI behavior regression.
- `npm run test:ui:visual` — compare reviewed screenshots; do not update references
  just to remove a failure.

The dedicated refresh config retains traces for passing and failing cases so the
cause can be inspected. It is separate from the faster normal checks. The
`Vacancy refresh stability` workflow runs the same isolated checks with read-only
permissions, no secrets and no deployment step; evidence expires after seven days.

Coverage includes delayed rates on Auth, Enquire, Account and Create; Find prices,
filters, galleries and repeated keyboard actions; chat typing/selection/photo/Send;
shared-photo dialogs and older-message scroll; failed and obsolete inventory
responses; and natural message intervals plus the real 30-second inventory gate.
The mixed-page session visits Inbox, Account, Enquire, Find, Saved, Detail and Create.
Focus bursts are explicitly simulated; an additional blank browser tab is opened
and brought forward/back. Traces record observed visibility, not a promise of
physical mobile backgrounding behavior. CPU slowdown is Chromium emulation.

## Limits and recovery

No deployment, merge, production collection activation, customer sessions,
real messages or hosted writes. Real Auth/delivery, real inventory/maps, physical
keyboards, Safari/Firefox and long-lived production sessions remain UNVERIFIED.
Performance entries are diagnostic evidence, not a zero-layout-shift or speed score.
Passing bounded cases does not prove that every intermittent glitch is resolved.

Revert the task commit(s), retaining later unrelated work; the checkpoint preserves
the prior public UI audit. No data/provider rollback is needed. Any future release
requires separate authorization and explicit inclusion in the curated production
composition; never deploy this raw checkout.

References: [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer),
[Playwright CDP sessions](https://playwright.dev/docs/api/class-cdpsession),
[Chrome CPU emulation](https://chromedevtools.github.io/devtools-protocol/tot/Emulation/#method-setCPUThrottlingRate).

## Read-only live-source check — 2026-10-21

Three public JavaScript GETs returned HTTP 200. The served currency-display.js
contains the late full-page render; messages-refresh.js contains the pre-response
draft snapshot; stage76-viewport-listings.js contains whole-card-list replacement.
These source paths are present in the live build at inspection time. This was
static source inspection, not execution with real users or proof that every live
incident shares these causes. No app session, record or collection setting changed.

## Verification receipt — local incremental runs

PASS: 68 refresh/session checks across four sizes (2.8 minutes), plus four
4x-CPU cases (17.6 seconds). Four added message-edit/listing-caption compatibility
cases passed (5.5 seconds) after correcting a stale caption in the first in-place
implementation. This intermediate issue is not counted as a pre-existing live bug.
The final combined 76-case fixture is verified on Linux in the draft PR receipts.

PASS: existing local regression: 2 HTTP isolation checks, 72 workspace browser
passes / 16 intended skips, 168 UI behavior passes, 8 reviewed screenshot
comparisons. No snapshot references regenerated. Syntax and diff checks passed.
Mobile and desktop session screenshots were inspected. Intermediate failures and
their traces were preserved; only completed successful runs count as PASS.
