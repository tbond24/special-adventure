# Vacancy mobile and full-page audit

This undeployed follow-up uses latest admin/presence development source `0af97b9`,
plus the previously tested audit infrastructure and dashboard-render fix from
draft #27. Separate branch: `codespaces/full-ui-audit-20261021`.
Rollback checkpoint: `rollback/pre-full-ui-audit-20261021`.

## Confirmed issues and fixes

| Reproduced issue | Small compatible fix | Regression evidence |
| --- | --- | --- |
| An unbroken message and long peer name made a 320px conversation overflow by 2,975px. | Allow message text to wrap and grid/flex children to shrink. Keep the back button usable. | Inbox/thread bounds, bubble containment, reachable back action, screenshots. |
| Long lister names overflowed enquiry headers, public profiles and the listing's lister link. The profile overflowed by 518px at 320px. | Wrap long text within the existing layouts; let the profile text column shrink. | Long-name enquiry/profile checks, enlarged base font, detail gallery/resize and screenshots. |
| Changing users during an outstanding Account profile read reused the old request and left the page loading. | Share pending renders only for the same route, renderer, user object and market. Remove a superseded loading cover. | Delayed old-user/new-user completion, cross-page loading, fresh later reads and concurrent Inbox checks. |
| An enquiry completing after navigation forced the visitor into its conversation. | Check the originating form/route after each asynchronous stage and the submitting user after sending. Ignore stale completion/errors. | Leaving during guest authentication and send; normal success, duplicate-submit prevention and failed-send draft preservation. |

An already-started backend request may still complete after leaving; this fix
prevents stale navigation and prevents starting the next enquiry stage once the
originating form has been left. It does not claim to cancel accepted server work.
Enquiry event names/routes and existing consent/collection settings are preserved.

## Coverage

Chromium runs at 320/390/820/1440px, with touch at mobile widths. Existing listing
creation exercises guest/member flows, both themes, photos, Review/Back and Edit
boundaries. Expanded cases cover:

- Find: type filters, search suggestions with long labels and page containment.
- Saved: browser-local entries, unavailable listings and removal.
- Listings: long content, gallery/viewer lifecycle, safety dialog and landscape resize.
- Listers: long public display names and contained listing cards.
- Inbox/chat: long messages, peer identity, polling without losing a typed draft,
  shared concurrent reads and back navigation.
- Enquiries: anonymous and guest UI, successful/failing sends, duplicate actions
  and delayed completion after leaving.
- Auth/Account: mode changes, password visibility, mobile input font threshold,
  long identities, delayed loads and user replacement.
- Owner dashboard: counts/actions and a tour across public/account pages.
- Privacy, Terms, Storage, Safety, recovery, invalid reset and unknown routes.
- Scroll/history: delayed pages, Back/Forward, keyboard links, clean listing URLs,
  in-page anchors, validation focus and preservation of user scrolling.
- Current synthetic admin/reporting regression, including newer presence/chart UI.

Normal `npm test` runs the existing workspace suite plus the expanded UI behavior
suite. `npm run test:ui` also compares the eight reviewed sign-in/chooser references
for the current OS. `npm run test:ui:report` opens the latest HTML report. Screenshots
of repaired conversation, enquiry and profile layouts are attached to that report.
See [UI_AUDIT.md](UI_AUDIT.md) for installation and reference-review instructions.

## Fixture compatibility

The existing synthetic cloud handles sanitized `/__offline` routes and explicitly
disables visitor measurement for UI/data-contract tests. Dedicated measurement
tests retain their own fixtures. Nothing is sent to a hosted backend.

History fixtures explicitly represent an owner with listing history, provide
controlled scroll room on information pages and choose navigation by layout width.
Clean-link HTML resolves root assets without loosening preview CSP or its base-URI
denial. These fixes correct old test assumptions; they are not product defects.
The Saved startup failure was resolved by waiting for the initial auth screen.

## Scope and limits

No deployment, merge, database/Auth/mail/domain changes, real customer records,
provider settings or production tracking activation. No new dependency. Preserve
the separate PostHog experiment and existing branches/worktrees.

Tests use isolated synthetic data. Real delivery/authentication, production
inventory/maps, physical-device keyboards, Safari and Firefox remain unverified.
Passing targeted checks does not prove the absence of every possible overlap or
intermittent glitch. Existing screenshot references are compared, never silently
updated. The curated production builder preserves older public files; future
publication must explicitly include and verify these source fixes under the
owner's separately authorized release process. Do not deploy this raw checkout.

## Verification receipt — 2026-10-21

PASS: Windows/Node 24 isolated UI run: 176/176 (168 behavior checks and eight
reviewed screenshot comparisons), 2.6 minutes. Added enquiry Back-button reachability
and reran that case: 4/4. Existing workspace/HTTP suite passed before the final
UI-only fixture changes; Linux CI supplies the combined final-source check.
JavaScript syntax checks and whitespace/diff checks passed. No screenshot reference
was regenerated. Mobile conversation/profile images were visually inspected.

Earlier failures were resolved from evidence: reproduced source defects above,
plus Saved startup timing, gallery selectors, and navigation fixture assumptions.
One interrupted final run produced no completion receipt and was rerun; its
partial output is not counted as a pass.
