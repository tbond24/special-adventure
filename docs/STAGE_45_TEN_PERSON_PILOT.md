# Stage 45 — Ten-person pilot

## Aim and acceptance

Prove, with isolated genuine Supabase sessions, that at least five listers and five renters can complete their intended Vacancy journey. Acceptance requires 10/10 serial journeys, no weakened assertions, truthful failure diagnosis, and a per-person score.

## Options and decision

1. **Isolated Supabase plus browser journeys** — highest runtime value, moderate complexity. Chosen because it proves browser, authentication, database, RLS and UI behavior together.
2. **Production synthetic accounts** — realistic infrastructure, but risks production data and email limits.
3. **Mocked browser tests** — fast and cheap, but insufficient as launch evidence.

## Iteration record

| Run | Finding | Smallest safe response |
|---|---|---|
| 34300128551 | Listing fixture omitted the now-required property name. | Updated the shared genuine listing journey. |
| 34300426663 | Publication persisted, but the management UI assertion lacked diagnostic separation. | Added an owner-query persistence assertion. |
| 34300718388 | Success was announced before management refresh completed. | Awaited refresh and rendering before success. |
| 34300986129 | Post-publication refresh failure was reported as unfinished publication. | Made recovery messages reflect whether any unit actually remains. |
| 34301268370 | Isolated schema lacked the private manager nickname migration. | Synchronized the accepted production migration into the isolated database. |
| 34301754231 | Unit-name assertion also matched its containing property name. | Scoped the exact assertion to the owner list. |
| 34302005694 | Existing-property form now requires an explicit property choice. | Exercised the safer property-card workflow. |
| 34302318577 | Personas still expected the removed View button. | Opened listings through the current whole-card interaction. |
| 34302655194 | Max rent is now inside the live Filters panel. | Exercised the real filter panel. |
| 34303270697 | Unit normalization overwrote shared property utilities. | Separated property and unit normalization and added a targeted runtime regression. |
| 34303694417 | Internet appeared twice on a valid detail page. | Scoped the assertion to the primary detail facts. |
| **34303977017** | **All journeys passed.** | Accepted. |

## Final runtime evidence

GitHub run: https://github.com/tbond24/special-adventure/actions/runs/34303977017

| Persona | Goal | Score |
|---|---|---:|
| L1 Mary | Publish an affordable bedsitter | 9.2/10 |
| L2 Kamau | Add a sibling unit to one property | 9.2/10 |
| L3 Fatima | Correct rent and reconfirm availability | 9.2/10 |
| L4 Brian | Pause, reactivate and fill a room | 9.6/10 |
| L5 Njeri | Receive and answer a renter enquiry | 9.2/10 |
| R1 Amina | Find a Kasarani room within budget | 9.6/10 |
| R2 Daniel | Save a room and recover it after reload | 9.4/10 |
| R3 Grace | Filter for furnished internet and verify address privacy | 9.4/10 |
| R4 Peter | Enquire and receive a lister reply | 9.2/10 |
| R5 Wanjiku | Block contact and end messaging | 9.4/10 |

Result: **10 passed in 34.7 seconds; 0 failed.** Mean persona score: **9.34/10**.

## Scope held

Production was not changed during the pilot. Ratings, agency banners, parcel/building hierarchy and ranking remain deferred until genuine usage justifies them.
