# Reproduce the isolated repair checks

Install root lockfile dependencies (`npm ci`) and the official Playwright Chromium test browser (`npx playwright install chromium --only-shell`). No production credentials are needed.

- `node qa/repair-oct08/run.cjs scoped` runs the current repair/browser regression matrix.
- `node qa/repair-oct08/run.cjs launch` reads the exact suite list from the existing `test:launch` package script.
- `node --test tests/*.test.cjs tests/*.test.js` runs unit/caller/API tests.
- `npm ci --prefix qa/data-repairs && npm test --prefix qa/data-repairs` runs all application migrations and security tests in isolated PostgreSQL.

If a managed test runtime provides a browser explicitly, set `VACANCY_BROWSER_EXECUTABLE` to that installed executable. `VACANCY_REPORT` and `VACANCY_TEST_RESULTS` can choose distinct evidence destinations. Additional Playwright filters may follow the mode argument.

The browser launcher starts its local server in the same invocation. It uses an automatic context route to intercept all non-local browser requests; explicit per-test mocks take precedence. The checked suites use browser mocks, not direct authenticated APIRequestContext writes. Do not add genuine account or production-mutation suites to this harness without separately reviewing their requests.

This harness does not prove real hosted OAuth, MFA, Storage or Auth service behavior. It is not the live-inventory `test:e2e` package script. Release evidence distinguishes passed, failed, obsolete baseline checks and unrun hosted checks.
