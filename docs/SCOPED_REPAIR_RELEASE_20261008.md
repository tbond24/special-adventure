# Scoped repair release — 8 October 2026

## Source and release boundary

Prepared from `feature/owner-requested-edits-20261001` at `edb5b8a30af985d4d392e3fbb5913ab45d701370`, preserving all changes in the latest reviewed October 8 preview. Production release is pending hosted frontend verification. The approved live SQL and temporary deletion guard are verified; their exact receipts are recorded in the data-repair ledger. No new dashboard editor or unit-card redesign is included.

## Per-feature decisions

| Repair | Chosen boundary and alternatives | Required evidence |
|---|---|---|
| Inbox request races | Route/session/request-generation guards through the existing collection and peer awaits. Avoid a global router rewrite or generic cache. | Delayed initial success/failure, A→B→A threads, replaced session, one initial fetch, current draft/photo preservation |
| Same-ID inventory refresh | Content-aware card/pin signature, preserving the existing map. Avoid full-page rerender or removing caching. | Changed rent/image/location/content/saved state reflected; map identity, viewport and selection retained; unchanged data preserves node |
| Maximum-rent filtering | Existing conversion helper after period normalization. Avoid changing stored money or reviving superseded wrappers. | Currency/period boundaries, missing/recovered rates, sort preserves missing-rate explanation |
| Detail Save and Block | Capture the button before awaiting; guard repeated Save. Avoid shared-service rewrites. | Save/Unsave, failed Save/Block, repeated clicks, navigation during request, no page errors |
| Auth form containment | Scoped single-track grid and min-width containment. Avoid shrinking intended logo or hiding overflow globally. | Sign-in/signup/finish-account, Google/password controls at 390/768/1165/1440px, centered ≤420px form |
| Permanent-member Account guard | Reuse the existing permanent-user guard. Avoid duplicate policy logic. | Signed-out and anonymous users are gated; guest enquiry/Inbox continue; permanent profile/security controls work |
| Remove floating question mark | Remove its entry/call and dedicated styles only. Keep shared dialog styles. | Repeated navigation has no floating entry; security and blocked-account dialogs still open/close |
| Canonical listing→enquiry flash | Same-document transition only for this branch. Avoid global navigation or loader redesign. | Card/direct canonical entry, double-click, scroll, Back/Forward; one history entry and no blank/boot frames |
| Previous price editor | Reuse the existing mount in both legacy and current edit journeys. Avoid duplicate semantics or restoring the old whole renderer. | Higher-than-saved validation, explicit toggle, independent save, failed/empty/late reads in both paths |
| Logout truthfulness | Shared UI cleanup helper paired with backend HTTP failure detection. Avoid swallowing revocation failure or duplicating handlers. | Normal/global logout, HTTP503/network failure, cleared local auth state, accurate local-only message, no unhandled errors |

## Baseline and test provenance

- Original selected browser baseline: 88/92 passed, four failed, zero skips/retries. Two legacy cases failed on both viewports before any app repair.
- After exact test-only alignment to current documented controls: 92/92 passed against unchanged application source. See `qa/repair-oct08/baseline.md` for each assertion change and rationale.
- Original Node baseline: 25/25 passed; app/API JavaScript syntax passed.
- The UI-only candidate passed 40/40 targeted desktop/mobile checks, including actual repaired-backend HTTP503/network logout paths, and four additional canonical-enquiry scenarios.
- A broader historical UI matrix returned 102/114. All twelve failures also occurred on exact pinned baseline: Inbox topbar visibility; old sort expectation; obsolete composer file-input selector; obsolete edit-restart selector; gallery fixture outside current viewport; removed map-filter toggle selector, each on desktop and mobile. These results are recorded separately and are not represented as a clean aggregate.

The final combined source reran the defined launch matrix, current scoped browser gate, Node tests, actual SQL migration replay and negative privilege tests. Synthetic browser tests intercept external requests; they do not establish successful genuine hosted login, MFA, or live account/data writes.

## Rollout and rollback

1. Review and commit the complete combined source, then verify its immutable remote SHA.
2. Publish and verify a preview from that exact SHA. Confirm changed asset hashes and affected browser behavior.
3. Apply only separately approved live SQL/edge-function changes after their relevant checks pass. Do not change live permissions or delete user data as part of browser testing.
4. If supported production staging is unavailable, build production from the same tested immutable source using the existing production environment. This is a new production build, not the same preview artifact.
5. Immediately verify production asset hashes, affected flows and `getvacancy.site` assignment. Preserve the previous live deployment as the rollback target. Do not silently switch an unrelated legacy alias.

The initial verified custom-domain target is deployment `dpl_3Lfzxakv1wbkkAdsXUZ8qGPpC6Vy`. Recheck it immediately before release. The newer preview is `dpl_9UL3c4HyUwSnR5iLDCzzpyjDSN6h`. Production/preview webhook environment metadata has separate service-role entries, so no secret parity is assumed or secrets retrieved.

## Known limits

- Standard headless and local-HTTP tests show no app-level enquiry draft restoration after Back→Forward in either baseline or repair. Production-browser BFCache draft restoration remains unverified. Failed-send draft retention is covered.
- Database/storage/auth services cannot share one browser transaction. Any partial-success behavior must remain explicit and safely retryable.
- Final release status and integrated counts will be recorded only after execution; the candidate checks above are not a production completion claim.

## Final local checkpoint

- Exact defined launch matrix: **156/156 passed** on desktop/mobile, zero failures/skips/retries/flaky results.
- Combined scoped regression, including the restored Previous price editor and deletion-unavailable state: **166/166 passed** on desktop/mobile, zero failures/skips/retries/flaky results.
- Node unit/caller/API tests: **38/38 passed**.
- Full65-migration replay and security tests: **21/21 passed** on PostgreSQL18.3 and **21/21 passed** on PostgreSQL17.5, matching the live server major version (live17.6).
- All application JavaScript syntax checks and diff whitespace checks passed.

These matrices overlap and must not be added together as a count of distinct tests. Their original pre-maintenance failures remain recorded in `qa/repair-oct08/results.json`. Exact current-control alignment kept test intent and did not delete tests or add skips. The Previous price control was a real product regression and was restored separately before the final matrices.

The two new SQL filenames are aligned to verified provider-generated versions without changing their SQL content. The approved temporary account-deletion guard is included; permanent cleanup repair is tracked separately in `docs/ACCOUNT_DELETION_REPAIR_FOLLOWUP.md`. Hosted preview, genuine hosted authentication and production completion are not claimed by this local checkpoint.

The final guard-inclusive matrices were rerun to completion after an interrupted verification attempt:156 launch checks and166 scoped checks, with no failures/skips/retries. The interrupted partial logs were not treated as passing evidence.
