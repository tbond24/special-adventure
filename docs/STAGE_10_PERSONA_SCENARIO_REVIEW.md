# Stage 10: ten-person scenario review

## Aim and scope

Prove that at least five genuine listers and five genuine renters can complete distinct MVP goals from end to end. Tests use isolated Supabase Auth sessions and real database writes against the accepted app, leaving production accounts, listings, and messages untouched.

Acceptance requires all ten journeys to pass, each outcome to be supported by runtime evidence, the auth/session suite to remain green, and the 20-check equivalence, 10-check hardening, and 24-check adversarial preview gates to pass unchanged.

## Options considered

1. **Isolated full product environment with genuine Supabase sessions — chosen.** Highest evidence, no production pollution, moderate setup cost.
2. **Ten temporary production accounts.** Highest production realism, but creates real inbox traffic and cleanup risk.
3. **Mocked browser personas.** Cheapest to run, but cannot prove Auth, persistence, ownership, messaging, or deletion boundaries.

Option 1 ranked first because it provides working-product evidence for the whole flow while remaining reversible.

## Lister journeys

| Person | Who they are and what they need | Proven outcome | Access | Core task | Clarity | Trust | Outcome | Total |
|---|---|---|---:|---:|---:|---:|---:|---:|
| Mary | First-time owner with one affordable Kasarani bedsitter | Created a property and unit, published it, and found it publicly | 9 | 10 | 8 | 9 | 10 | 9.2 |
| Kamau | Portfolio landlord adding another unit at an existing property | Added and published a sibling unit without duplicating the property | 9 | 10 | 8 | 9 | 10 | 9.2 |
| Fatima | Owner who entered the wrong rent | Edited the rent, reconfirmed availability, and saw the corrected public listing | 9 | 10 | 8 | 9 | 10 | 9.2 |
| Brian | Hands-on landlord managing availability | Paused, reactivated, and marked a vacancy filled; public visibility followed each state | 9 | 10 | 9 | 10 | 10 | 9.6 |
| Njeri | Owner responding to a serious renter | Received the enquiry and sent a reply visible to that renter | 9 | 10 | 8 | 9 | 10 | 9.2 |

Lister section averages: access **9.0**, core listing task **10.0**, clarity **8.2**, trust/control **9.2**, successful outcome **10.0**. Lister overall: **9.3/10**.

## Renter journeys

| Person | Who they are and what they need | Proven outcome | Discovery | Core task | Clarity | Trust/privacy | Outcome | Total |
|---|---|---|---:|---:|---:|---:|---:|---:|
| Amina | Budget renter seeking Kasarani at or below KES 12,000 | Search returned the target and every result met her locality and budget | 10 | 10 | 9 | 9 | 10 | 9.6 |
| Daniel | Signed-in renter shortlisting a studio | Saved the room and found it again after a full reload | 9 | 10 | 9 | 9 | 10 | 9.4 |
| Grace | Remote worker needing furnished housing with internet | Used More filters, found the matching home, and confirmed the exact address stayed private | 10 | 10 | 7 | 10 | 10 | 9.4 |
| Peter | Renter who needs an answer before applying | Found the room, enquired, and received the lister's reply in his own session | 9 | 10 | 8 | 9 | 10 | 9.2 |
| Wanjiku | Safety-conscious renter ending unwanted contact | Blocked the other member and proved further messaging was prevented | 9 | 10 | 8 | 10 | 10 | 9.4 |

Renter section averages: discovery **9.4**, core renter task **10.0**, clarity **8.2**, trust/privacy/safety **9.4**, successful outcome **10.0**. Renter overall: **9.4/10**.

Overall persona score: **9.3/10**. All ten intended outcomes passed.

## Failures, diagnosis, and smallest fixes

1. Amina's first script expected exactly one result even though other legitimate listings met her criteria. Ranked fixes: validate every result and require the target; invent a unique suburb; reset all data per test. The first was chosen because it tests the actual promise of filtering.
2. Daniel exposed startup navigation before session restoration. Ranked fixes: hold navigation during startup; queue protected navigation; add a test delay. Holding navigation was the smallest product fix.
3. Grace's furnished and internet controls were correctly inside the visible More filters panel. Ranked fixes: follow the visible user flow; force hidden controls; redesign filter priority. The first was chosen and clarity was scored 7 rather than hiding the extra step.
4. Daniel then exposed an interrupted save when reload followed the click immediately. Ranked fixes: show a pending state and completion feedback; implement optimistic background persistence; add a test delay. Pending/disabled state plus a `Room saved` confirmation was chosen. The full journey then passed consistently.
5. The focused already-signed-in test injected state before startup had restored the real session. Ranked fixes: duplicate a genuine session journey; wait for startup before focused injection; weaken restoration. The harness now waits for startup. Genuine signed-in behavior remains covered in the persona suite.

## Runtime evidence

- Ten isolated persona journeys: **10/10 passed** in 30.6 seconds, GitHub Actions run `34095182140`.
- Recovery, auth edges, session lifecycle, and account deletion: **9/9 passed**, run `34095291118`.
- Candidate preview: `dpl_vVrWLyzbVs817tChc7xwS8pw5bXQ`, `READY`.
- Preview equivalence: **20/20 passed** across desktop and mobile.
- Targeted MVP hardening: **10/10 passed** across desktop and mobile.
- Preview adversarial gate: **24/24 passed** across desktop and mobile.
- Combined established preview gate: **54/54 passed**.
- Candidate source: commit `7b9eec0` (product code last changed in `c1700d5`).

## Review decision

**PASS.** Every tested lister and renter achieved the intended goal. The main usability opportunity is clarity: secondary filters and some listing/account controls require discovery, producing the lowest section score of **8.2/10**. That does not block the MVP because outcomes, persistence, privacy, safety, and lifecycle controls all passed.

Production was not changed during this review. The tested preview is the release candidate and the existing production deployment remains the rollback baseline until this candidate is deliberately promoted.
