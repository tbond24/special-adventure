# Journey-map refresh repair — 27 October 2026

Status: prepared and locally verified; not yet published. Release receipt will supersede this status. First repair in the owner's requested one-at-a-time sequence. No subsequent problem has been started.

## Issue and evidence

The live audit in PR #47 confirmed that a refresh removes the graph while its read runs, closes the transition-count table and resets the explored branch. The expanded-table test moved the following feeds upward by about 853 pixels during loading; that measurement includes the expanded table, not only the default map height. Source: ADMIN_FONT_JOURNEY_AUDIT_20261027.md.

## Solutions discussed, choice and reason

The discussion compared reserving height with retaining the map during an update; saving/restoring table state with retaining the table; and restoring the branch after rebuilding with retaining its selection while updating. Chosen: retain the existing graph, keyed node buttons, centre, disclosure and scroll container, and update their contents. This preserves focus/open state naturally and removes the temporary collapse. A small status line reports Updating, Updated, paused or stale data.

## Before and now

Before: shared/manual reads cleared data and canvas and reset focus before awaiting the backend. Painting recreated graph and disclosure. The shared minute refresh therefore interrupted exploration even if the data was unchanged.

Prepared behaviour:
- Same-filter refresh keeps the graph visible and retains the selected branch, open transition table, node identity, keyboard focus and scroll position.
- A successful read updates counts and table contents. A short reserved status line avoids a loading-label layout jump.
- If a selected page no longer exists in the returned map or fresh presence, explain that and return to all pages. The All pages button remains the explicit navigation control.
- Network failures, malformed results and 15-second timeouts retain the last successful same-context view and label it as stale. HTTP 401/403 and permission/JWT error codes clear the map; identity/AAL changes still destroy it.
- Changing period/device/day clears previous-context data before reading the new context; obsolete responses are ignored. Hidden Overview cancels pending work and catches up on return. Presence keeps its existing expiry/polling and never makes old presence current.

Scope: map JS/CSS and curated release cache references. No metric refresh cadence, real-time transport, history/scheduler/database/Auth policy, analytics collection, font renderer or public page feature is changed.

## Verification

- PASS: twelve new focused desktop/mobile cases, plus existing map/tracking checks. Covers manual stalled reads with changed counts, automatic shared refresh and actual minute scheduler, table/branch/height/focus preservation, network failure, timeout/recovery, permission denial, filter changes, obsolete responses, missing selected page, and hiding/resuming Overview.
- PASS: actual curated release composition and stability checks, including a stalled map read retaining graph/disclosure/height/branch; existing eight cards, feeds, themes and currency outcomes remain usable, with no page errors.
- PASS: full isolated workspace in Australia/Perth: 132 passes / 22 intentional skips, plus chart and HTTP isolation checks. Exact-source CI is pending and will be recorded in the release receipt. Synthetic checks do not establish real owner/MFA or hosted publication.

Test-environment notes: pinned Chromium was absent after environment restart; an initial run could not launch browsers while installation was incomplete. No assertions ran in that attempt. Hidden-element lookup and clock installation ordering were corrected in the new tests. One inherited contact-card assertion expects five fixture visitors even during the first local hour, when the fixture deliberately returns three; it reproduced in three focused runs on the host's America/Los_Angeles clock. No contact-card code/test was changed; the full suite was rerun in Australia/Perth. Final scope-key/node-order hardening is additionally covered by the exact-source hosted suite and actual assembled artifact checks.

## Release and rollback

Confirmed current live baseline: READY dpl_9THHwRembrMAtVo3M37FQZZSLJH4, released source 8c2c6383b7ab02323cb00420d0e9d9c22a3991be. Retain it for frontend rollback. No database rollback is needed. Keep existing capacity history/cron and all earlier repaired permissions unchanged.

Build only through scripts/build-admin-production-candidate.mjs; never deploy raw development source. Compare the artifact against the last release, verify staged hashes, retain exact source and deployment IDs, then verify live served files and the genuine authenticator-verified owner flow. Record only an actual completed release in the site-change ledger. Preserve engagement coverage. No merge or force-push.
