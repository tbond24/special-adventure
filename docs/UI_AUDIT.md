# Vacancy UI checks

## Everyday use

Use branch `codespaces/ui-anomaly-audit-20261021` in a clean checkout. Install the
locked dependencies with `npm ci --ignore-scripts`, then install the matching
browser with `npx playwright install chromium` (Linux: add `--with-deps`).
Stop that checkout's manual preview before testing: tests start their own isolated
server on port 8776 and deliberately refuse to reuse an unknown server.

| Task | Command |
| --- | --- |
| Existing workspace checks plus new UI behavior checks | `npm test` |
| UI behavior and screenshot comparisons | `npm run test:ui` |
| Quick mobile UI run | `npm run test:ui -- --project=mobile-390` |
| Open the last UI report | `npm run test:ui:report` |
| Investigate interactively | `npm run test:ui -- --ui` |

The HTML report links failed steps, screenshots, videos and traces. Open a failed
test's trace to see its actions, DOM snapshots and network activity. Successful
runs discard traces/videos. Layout evidence records the route, viewport, page
width and duplicate IDs. All test accounts, listings and photos are synthetic.

## Coverage

- Chromium at 320, 390, 820 and 1440 pixels. Mobile sizes use touch emulation.
- Sign-in/recovery with enlarged text; chooser/location validation; long Account
  names/emails; Find and listing details with long synthetic content.
- Concurrent listing renders, fresh later reads, interrupted-read recovery,
  slow Account results after leaving, rapid navigation and Back/Forward.
- Existing guest/account listing-creation journeys in both themes, photo
  retention, Review/Back, navigation guard behavior and Edit/dashboard boundaries.
- Horizontal page overflow, duplicate IDs, critical covered actions and uncaught
  JavaScript errors. These checks are targeted, not a universal overlap detector.
- Pixel comparisons for sign-in and the listing chooser at all four sizes.
  Windows and Linux references are separate because fonts/rendering differ.

## Screenshot review

Run `npm run test:ui:update` only for an intentional appearance change. Inspect
every changed PNG and its diff before committing it. Never update references just
to turn a failing comparison green. The first Windows references were inspected
at all four sizes; Linux candidates are generated in CI and require the same review.

The `Vacancy UI anomaly checks` workflow compares committed Linux references.
If none exist, it generates a **candidate** artifact for inspection, not evidence
that the appearance passed comparison. Download `candidate-linux-ui-baselines`,
review the images, place them in `tests/ui-snapshots/linux/`, commit and rerun CI.
An explicit workflow input can also regenerate candidates for later review.
The normal workspace workflow runs `npm test`; neither workflow has secrets,
write permissions or a deployment step. Evidence artifacts expire after seven days.

## Fix included

Three concurrent dashboard render calls originally caused three listing reads.
`listing-list-entry.js` now shares only in-flight rendering for the same route,
user object and market. Completion or failure clears the shared request; a later
refresh still reads fresh data. Route changes invalidate the pending reference.
The existing cached script URL is versioned for this change.

The existing synthetic cloud now recognizes the preview's `/__offline` API prefix
and the disabled optional element-policy read. Hosted URLs remain rewritten,
the preview CSP and denied API routes are unchanged, and unknown external
services remain intercepted. No extra library or runtime collector was installed.

## Scope and recovery

This is a development-source audit based on published-admin branch `4ece56c`.
It preserves the separate PostHog experiment and other worktrees. Rollback branch:
`rollback/pre-ui-audit-20261021`. Revert only these audit commits after checking
for later changes; no database or provider rollback is needed.

No deployment is performed. The scoped admin publication builder deliberately
preserves older public product modules; it does not automatically publish this
public-render fix. Any future release must explicitly include and verify the fix
through the agreed product release process. Do not deploy the raw development tree.

Real sign-in/MFA, persisted data, production inventory, live map services, Safari,
Firefox and physical-device behavior remain unverified by these synthetic tests.
Screenshot comparisons detect changes from the reviewed reference, not every
pre-existing design error. No claim is made that every reported glitch is fixed.

References: [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots)
and [Trace Viewer](https://playwright.dev/docs/trace-viewer).
