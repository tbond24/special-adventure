# Admin dark mode — 23 October 2026

Implemented on `codespaces/admin-dark-mode-20261023`, continuing audited remote `7e1bba0`. Open drafts #2–#40 and reconciliation `8e4b9ea` remain preserved. This is a development change; nothing was deployed or migrated.

The admin shell hides the public header and previously forced light surfaces. A compact top-right circular control now shares the existing `vacancy-theme-v1` preference and sun/moon icons. It stays available when Overview hides its title bar, leaves room for the data-refresh control and does not introduce a new grid row. Admin/public controls and open tabs stay in sync. The saved theme is applied in the document head before the page is displayed. Denied browser storage falls back to a usable in-memory control; persistence cannot be guaranteed when storage is blocked or cleared.

Admin colours now use scoped semantic variables, retaining exact light-mode fallbacks. Dark backgrounds, readable text, neutral selectors, borders, dialogs, menu surfaces and chart/map guides follow the theme. Chart series colours, numbers, periods, graph shape, grid spans and pulse eligibility are unchanged. Existing navy sidebar and activity feeds remain dark in both themes. No SDK or dependency was added.

The curated release builder imports the shared theme module and guarded bootstrap, and versions the resulting files. It still composes onto the preserved baseline rather than publishing raw workspace source. Automatic Git deployment remains disabled in both Vercel configurations. The production database, Auth, analytics exclusion and telemetry identity were not changed.

## Verification

- **PASS:** Node 24.21.0 and `npm ci --ignore-scripts`; committed lockfile unchanged.
- **PASS:** final `npm test`: 94 browser checks, 22 intentional skips, chart checks and both HTTP isolation checks.
- **PASS:** eight focused Chromium desktop/phone theme checks: dark/light reload persistence, all main admin destinations, return to public navigation, cross-tab preference changes, blocked storage, label/menu/dialog/graph/map colours, no horizontal overflow, centred icon and no overlap with refresh. Sampled card text meets a 4.5:1 contrast ratio.
- **PASS:** both existing production-candidate composition/stability checks on the final composed bytes: six-card shell, journey map, feed mounting, retained focus/nodes and no currency-triggered remount. External requests denied.
- **PASS:** reviewed desktop dark-mode screenshot. Final tests include correction of remaining hard-coded card heading/period colours found during visual review. Test selectors target a graph-bearing card and load the map through its normal scroll trigger.
- **PASS:** private isolated preview restored after tests. No live user, event, listing, message or photo was created.
- **UNVERIFIED:** real owner/MFA browser acceptance and physical iOS/Android devices; phone checks use Chromium emulation. No publication is claimed.

## Analytics recommendation

Keep the current lightweight first-party collector while improving its reliability before adding more charts or SDKs. Use one metric definition and local-time period calculation across every report, exclude identified admins consistently, and mark unavailable collection history explicitly. Use database-confirmed outcomes for successful messages/publications, separate from best-effort click intent. Keep browser/session identity independent of login.

Define a small event catalog with names, units, properties and coverage dates; expose collection failures, stale data and missing history in a tracking-health view. Verify Contact and Text end to end with a controlled non-admin visitor. Then build source/device/region breakdowns, stage completion and time-between-step reports on those verified events. Add bounded aggregates and reconciliation checks as volume grows. These are recommendations; this patch does not change analytics collection, reporting queries or production data.
