# Messaging and enquiry stability repair

User scope: repair messaging/enquiry races, preserve drafts/photos, prevent duplicate submissions and later actions after navigation, retain admin analytics exclusion, test before publishing. Only the messaging/read-only reconciliation slices from draft #35 and enquiry route guards from #31 were reused; those independent branches and their unrelated work remain intact.

## Final behavior

- Polling reconciles read-only bubbles, listing labels and peer presentation. It retains the actual composer, text selection, selected file, busy state, shared-photo controls and scroll position. Unrelated conversations no longer replace the current thread; corrected text/listing labels participate in its signature.
- A per-account/thread in-flight lock prevents repeated submits, including a fresh form mounted while the old request settles. Failures keep text and photos for an explicit retry. A next draft typed during an earlier send is preserved.
- Chat drafts/files stay only in this tab's memory and can be restored when returning to the thread; they are not persisted to localStorage, sent to analytics, or shared between account identities. Closing/reloading the document does not promise draft-file persistence.
- Navigation/page exit cancels pending controllers. Request guards check connected form, route, account and signal before sends and after asynchronous credential/upload stages. A photo upload finishing after navigation cannot start its message-commit RPC. A late guest login cannot start an enquiry; completed obsolete enquiries cannot redirect to Messages or report stale success.
- The backend adapter passes abort signals and rechecks the intended account immediately before the network action. If a photo commit may already have reached the server, cancellation does not delete the potentially linked photo. Only known precommit uploads or definitive client rejections are eligible for the existing bounded cleanup path.
- Hidden conversations stop their polling timer and resume with one immediate read when visible.
- The remaining manual-currency race is fixed by calling the already-reviewed in-place currency refresh, preserving an enquiry draft on the page reached while rates load. Other Find/gallery/dashboard audit issues remain outside this release.
- Existing admin browser opt-out, telemetry guards and shared visitor/session identity are unchanged.

Already submitted requests can complete on the server before cancellation arrives. These client fixes prevent duplicate concurrent submissions and obsolete subsequent stages; they do not claim transport-wide exactly-once delivery, recall of accepted messages or automatic retry after an ambiguous response. No server schema or RPC contract migration was introduced.

## Verification before publication

PASS: `npm ci --ignore-scripts`, committed lockfile unchanged, Node 24.21.0. PASS: `npm test` — 86 browser passes / 22 intended skips plus chart and HTTP-isolation checks, including admin exclusion across logout/reload and shared identity.

PASS: `node scripts/build-admin-production-candidate.mjs > /tmp/vacancy-admin-candidate.json`, then `npx playwright test --config playwright.messaging.config.cjs` — **46 passed** across desktop 1440px and phone 390px. Tests use the committed synthetic account-cloud fixture, restrictive preview CSP and sanitized backend origins. No genuine users, messages, photos, accounts or analytics writes.

Coverage includes pending/double Send, typing during replies, other-thread changes, photo selection during a delayed poll, failed photo retry, same-tab draft restoration, detached forms, a next draft during Send, navigation during guest Auth, late enquiry results, same-user object refresh, account switch during upload, cancellation during credential refresh/upload, shared-photo/scroll retention and zero hidden reads during 12.1 simulated seconds with one read on resume. Direct adapter tests exercise actual candidate functions with intercepted service responses, not only UI stubs.

PASS: both existing curated production-composition checks: Overview initialization, cards/feed/map ordering, retained graph node/focus, zero page errors and no unrelated editor regression.

An initial adapter test token was malformed, causing a refresh before the intended upload stage; corrected the synthetic JWT to test the intended boundary. Final checks all passed. Initial test failures were never published.

Reproduce with the dedicated `playwright.messaging.config.cjs`; it serves the exact curated candidate through `scripts/test-production-candidate-server.mjs` on loopback 8785. Never use the legacy live-targeting Playwright configuration. The workspace preview uses its unchanged lock/readiness script on 8776.

Publication is separately recorded in the live receipt. Genuine user-to-user delivery, provider/Auth configuration and owner MFA were not exercised or changed. The controlled post-publication checks must not be described as genuine customer delivery.
