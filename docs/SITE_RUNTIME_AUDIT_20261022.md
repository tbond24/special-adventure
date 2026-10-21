# Site runtime audit — 22 October 2026

Overall status: FAIL for interaction stability; PASS for the sampled read-only live routes and analytics exclusion. Audit only: no product fixes, publication, merge, database/Auth changes or customer activity.

Audited exact published source `3ae5594` / deployment `dpl_7528RE57NTRrzkZ5JXuw9HkaA7cr`. Seven critical served modules matched the existing release manifest. The isolated server used the same curated artifact, not the newer raw development checkout. Desktop 1440px and phone 390px; Chromium only.

## Live read-only pass

Opened Find, a public listing, Auth, Saved, Account, Create listing, Messages, Privacy, Terms, Storage and Safety: 11 routes at each width. Browser-local analytics exclusion was set before scripts loaded; all non-GET/HEAD/OPTIONS traffic was blocked. No blocked writes occurred, meaning the browser attempted no writes. No existing owner session or credentials were used.

PASS: no uncaught errors, console errors, failed requests, duplicate element IDs or horizontal overflow in these sampled default states. Analytics exclusion remained true at every sampled route. The two render calls on Account and Messages were intentional anonymous-user redirects to Auth, not duplicate layouts: one final layout each.

The initial cold page requested 78 scripts and six fetches at both widths. The fetches were inventory, country context, favicon, icon overrides, icon slots and listing display options. These are not individually established defects. Auth opened the provider-readiness endpoint again when visited directly and after Account/Messages redirects: a bounded cached readiness result is an optimization candidate. Some admin layers also load globally, but public Auth is intertwined with them; defer only after dependency review, not by removing all files with admin in their name. No transfer-size, capacity or full performance benchmark is claimed. Request routing disables normal browser HTTP caching, so repeated resource observations are not proof of repeated origin transfers.

## Confirmed interaction defects in published code

| Priority | Trigger / issue | Evidence and impact | Existing work to review |
| --- | --- | --- | --- |
| P1 | Reply arrives while Send is pending | Polling replaces the composer, new Send is enabled; submitting it yields **two synthetic send calls** at both widths. No real message was sent. | Draft #35, message reconciliation |
| P1 | Reply/other-thread update while typing or selecting a photo | New typing can revert to the earlier draft; a newly selected file disappears; unrelated thread changes can replace the current composer. | Draft #35 |
| P1 | Guest Auth/enquiry completes after navigation | Enquiry can still start after leaving; a completed enquiry redirects from Privacy back to Messages. | Draft #31, route/identity guards |
| P2 | Three overlapping listing-dashboard renders | Three `myVacancies` reads instead of one shared in-flight read; retries also duplicate reads. | Draft #27 / inherited in #31 |
| P2 | Find inventory refresh while viewing card photos | Unchanged card nodes are replaced; both unchanged and changed cards lose their gallery position. | Draft #35 |
| P2 | Manual currency change completes after navigation | Unlike the now-fixed saved-rate restoration path, `setDisplayCurrency()` still calls full `render()` and clears an enquiry draft on the page reached meanwhile. | Remaining market-explore slice of #35 |
| P2 | Account identity changes during a pending profile read | The existing in-flight render can be reused for the wrong identity, leaving the expected new account screen unavailable. | Draft #31 |
| P2 | Conversation stays open in a hidden document | Timer continues reading every four seconds: **three reads during 12.1 simulated seconds**, both widths. Published poller has no document visibility guard. | Needs explicit visibility handling; not established as solved by #35 |
| P2 | Long names/messages or narrow landscape | Synthetic long chat text and lister/enquiry names overflow; listing gallery resize also leaves horizontal overflow. Default sampled live content did not expose it. | Draft #31 and targeted layout review |
| P2 | Existing message text/listing label changes without new ID/timestamp | Poll signature ignores those values; corrected text and labels remain stale. | Draft #35 |

P1 denotes a high-priority user-flow/data-loss issue, not a confirmed security incident. Draft fixes are references, not approval to merge or publish unrelated changes. Several reports overlap one underlying cause; do not count them as independent bugs.

## Tests and classification

Reused `tests/refresh-stability.spec.js`, `tests/ui-anomalies.spec.js`, `tests/ui-rest.spec.js` and the existing synthetic account-cloud fixture from `2ee9bc7`, exported into `/tmp/vacancy-site-audit`. A temporary config served only the curated published artifact through in-memory backend sanitization and existing restrictive CSP. Every hosted call, including Auth, uploads and messages, was intercepted by the in-memory fixture. Analytics was disabled before initialization.

First audit: **90 test executions — 45 passed, 41 behavior assertions failed, four screenshot-reference failures**. The 41 failures cover 23 distinct scenarios, many sharing the causes above. The four screenshot failures are missing exported baselines, not visual regressions; no repository baseline was updated. Soak/CPU-stress runs were intentionally omitted from this bounded audit. This is not a claim that every failed assertion represents a separate runtime exception.

Four additional targeted executions confirmed hidden polling and duplicate Send at both widths; their pass condition was reproducing the defect, not proving correct behavior. Other passing coverage includes one chooser/form, no accumulated overlays in ordinary states, legal/recovery navigation, sign-in mode controls, some stale-route guards, and the saved-rate restoration patch.

Machine-readable, sanitized summary: `review/site-runtime-audit-20261022.json`. Full synthetic traces/screenshots and detailed failures remain under `/tmp/vacancy-site-audit/results`, with initial summaries in `summary.json` and logs in `run.log`/`targeted.log`. These do not contain genuine sessions or customer messages. No public listing IDs, images or customer data are committed in this report.

## Recommended repair order

1. Preserve messaging composer and pending Send state, and cancel obsolete enquiry/Auth continuations. Add focused tests proving one send and no action after navigation.
2. Add identity-aware in-flight dashboard/account guards and preserve Find cards/gallery state.
3. Finish the manual currency race fix and pause hidden-tab message polling; then recheck request counts and corrected-message refresh.
4. Review long-content overflow and cold-load/provider-readiness optimization separately.

Preserve #31/#35 and the released admin fixes while selecting only the needed slices. Re-run the current exact composition, not an old branch wholesale. Genuine multi-user delivery, real Auth/MFA/provider behavior, Safari/Firefox, physical-device background throttling and full session performance remain UNVERIFIED.
