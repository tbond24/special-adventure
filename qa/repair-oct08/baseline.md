# Exact pre-repair baseline

Source: `edb5b8a30af985d4d392e3fbb5913ab45d701370`, feature/owner-requested-edits-20261001.
All 505 tracked files were cloned and verified before changes. Node tests: 25 passed, no failures. JavaScript syntax checks: all app/src and app/api scripts passed.

The selected eight-suite desktop/mobile browser baseline ran 92 tests: 88 passed, four failed, no skips or retries. All external browser traffic was intercepted and synthetic data used; no live database write was made.

The four failing executions were two existing test cases on both viewports. Test assertions were aligned with prior documented product changes, separately from new product repairs:

- stage101 existing-property case: `#mine [data-edit]` matched both the unit-name action and the restored pencil. The test now requires exactly one `[data-edit][title="Edit unit"]`, verifies its expected name, and independently requires exactly one `[data-edit][aria-label="Edit listing"]`. After selecting Current listings, it requires one unit-name action for the active room. It still checks the archived delete icon and exercises the existing-property form. This distinguishes intentional separate actions from duplicate renders.
- stage102 multi-unit case: the picker already creates ISO-code option labels (`new Option(code, code)`), so the exact expected label changes from KSh to KES; the exact selected currency value remains KES.
- After that stale currency assertion was unblocked, the same test reached another obsolete expectation that `.unit-type-data` was hidden. The October 6/8 repair restored a visible property-type control (documented in `docs/scoped-rent-render-controls-20261008.md`). The test now requires it visible and also checks its accessible label and exact Studio value.

- The same stage102 case then reached a stale 0px journey-control margin assertion. The last compact-composer override in the exact baseline stylesheet (`app/styles.css`, line 935) explicitly sets 8px. The expected value is now exactly 8px, preserving an exact layout check rather than removing it.
- The old media selector matched the visible Add media button plus two deliberately present menu actions. The updated test opens the direct-child Add media button, selects Upload photos, and awaits the native file chooser.
- The same legacy test used a removed per-unit duplicate menu. It now uses the existing shared Add another unit menu with exact `data-copy-unit` indexes, as the current stage101 regression already does. Each copied unit is explicitly asserted to have no inherited photos and receives its own three images before publication, matching the established minimum-photo rule.

No app code was modified to satisfy these alignment changes. Passing baseline checks are not proof of genuine hosted authentication or live database behavior. The isolated full-auth Supabase suites require a separate authenticated test stack and were not run as part of this browser baseline.

## Aligned baseline result

With only the two test files aligned to existing controls, the complete selected baseline passed **92/92** on desktop and mobile Chromium, with zero skips, retries, or flaky results. No application file was changed. Evidence: `vacancy-repair-baseline-aligned.json`, started 2026-10-08 18:44:08 UTC; duration 75.7 seconds. This is the comparison checkpoint before combining the new repair patches.

## Defined launch baseline and alignment

The untouched17-file launch baseline contained152 cases:134 passed,18 failed (nine cases on both viewports). The initial combined run contained156 cases after guest-guard additions:140 passed,16 failed; Stage101's two stale-selector failures were already fixed by the alignment above.

The remaining exact current-control alignments are:
- Stage75 now establishes and precisely preserves a chosen viewport when intercontinental inventory changes. The old fixture had already booted Home yet assumed a fresh first map; new initial-country/nearest-listing behavior is explicitly deferred in the October8 scope document.
- Stage76 checks right-anchored search expansion/focus and exactly one current results Filters opener; the duplicate gear was intentionally removed in the October6 scope.
- Stage78 uses the current location/details/review editor, its required photo minimum and complete atomic update contract. Missing required rent replaces an obsolete mandatory-address assumption; a valid pin now permits optional precise address. Photo preview/removal and update-only assertions remain.
- Stage88 retains currency, auto-location behavior, regular switches and move-in containment using the current Filters opener.
- Stage91 retains exact compact, equal-spacing geometry using the documented two-column filter layout.

The former-price test exposed a real missing mount in the new editor. That assertion was retained; the existing control was restored, with ten additional legacy/current-chain scenarios. None of these alignment changes restored obsolete product UI merely for tests, removed a test, added a skip, or accepted arbitrary output. The final defined launch matrix passed156/156.
