# Synthetic listing accordion QA

Run from the repository root:

    npm ci
    npx playwright install chromium --only-shell
    node node_modules/@playwright/test/cli.js test --config qa/listing-accordion/playwright.config.cjs

The isolated static server uses http://127.0.0.1:8777, serves only `app/`, rejects non-GET requests and contains no API proxy. The spec preloads `qa/repair-oct08/safe-fixtures.cjs`; every nonlocal request is fulfilled locally instead of sent. Auth, REST and geocoding responses are synthetic. The sample owner, property, listing and photos exist only in the browser fixture. Every mutating backend boundary rejects by default; individual save tests install recording stubs for the exact methods being asserted.

The tests use real form rendering, actual controls and event handlers, original creation/edit submission flows, and actual localStorage/IndexedDB photo-draft persistence. They do not replace the accordion or save handlers. No genuine hosted database, auth or storage writes are performed. Synthetic boundary passes establish frontend payload/order/validation behavior, not hosted backend permissions or connectivity.

Coverage:
- Native keyboard interaction, five sections closed initially, one expanded section at a time
- Location, minimum three photos, positive rent and nonnegative deposit readiness
- Repeated Review/Back transitions preserving input node identity
- Editable description, features, custom amenities/utilities/rules, and availability
- New-property and existing-property create/upload/activate contracts
- Existing-listing hydration and one atomic edit update with structured options
- New/duplicate unit data and distinct photos; deleting the first retains shared fields
- Device-local Save and exit with restoration of fields, options and exact photo bytes
- Partial publication retry retaining only the unfinished unit and its stable request ID
- Native date validity and advanced numeric validation without invalid-event recursion
- 320px, 390px and 1440px overflow/readability checks
- Language switching with continued responsive controls and review

The config uses Playwright’s installed Chromium by default. Set `VACANCY_BROWSER_EXECUTABLE` only when a custom browser executable is needed. The JSON report and failure screenshots/traces are written under `test-results/`.
