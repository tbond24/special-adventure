# Stage 13 — display currency without changing location

## Aim and acceptance

The header control must change the currency renters see without changing the country, search language, map centre, distance unit or available inventory. Converted prices must be honest and max-rent filtering must use the selected display currency. Listings retain their original stored currency.

## Options considered

| Rank | Option | Cost | Value | Complexity / risk |
| --- | --- | --- | --- | --- |
| 1 | Frankfurter daily reference rates through a cached Vacancy endpoint | Free, no key | Covers all six supported currencies with institutional reference data | Indicative rather than trading rates; needs graceful outage behavior |
| 2 | Manually maintained indicative rates | Free | No external runtime dependency | Becomes stale and creates a maintenance/error burden |
| 3 | Paid commercial exchange-rate API | Paid | Service guarantees and support | Unjustified cost at current traffic and requirements |

A symbol-only switch was rejected because it would present false amounts. Option 1 ranked first after live coverage tests returned all six quote currencies for every supported base: KES, AUD, USD, GBP, UGX and TZS.

## Build

- The saved location market and saved display currency are now separate preferences.
- The header is labelled `Display currency` and contains currency codes rather than country flags.
- Changing currency never mutates `marketCode`, search centre or selected inventory.
- `/api/exchange-rates` validates complete supported-currency coverage and caches daily reference rates for 12 hours.
- Listing prices and deposits show `≈` when converted; original database amounts and currencies remain unchanged.
- Max-rent input is converted back to the inventory's native currency for filtering, then restored unchanged in the field.
- A failed rate request keeps prices in the listing currency instead of inventing a value.

## Runtime proof and score

- Free service coverage: 6/6 supported bases each returned all 6 required quotes.
- Targeted component/browser verification: 2/2 pass across desktop and mobile.
- Real Vercel-runtime endpoint returned current USD-based AUD, GBP, KES, TZS and UGX rates dated 2026-09-07.
- Real inventory before change: Kenya market, KES display, 3 listings, Kenya search hint.
- After changing to USD: Kenya market remained `KE`; all 3 listings remained; prices changed from KSh 12,000/18,000/30,000 to approximately $93/$139/$232; Kenya hint, kilometre radius and Nairobi-area map centre remained.
- A USD 100 maximum retained `100` in the input and correctly reduced results to the approximately $93 listing.

The first broader Playwright regression could not load inventory because the sandboxed browser lacked network access; a Vercel development process also emitted a Windows runtime assertion during hot reload. Ranked responses were: (1) restart the isolated runtime and rerun the unchanged test with read-only network access, (2) establish a browser bypass session for the protected cloud preview, or (3) weaken/mock the existing regression. Option 1 was applied. The unchanged real-inventory regression then passed in 1.8 seconds; no product assertion was relaxed.

Score: correctness 10/10; separation of concerns 10/10; resilience 9/10; usability 9/10; cost 10/10; evidence 10/10. Stage score: **9.7/10 — PASS**.

## Rollback and status

Production remains unchanged. Return to checkpoint commit `a423180` to remove this stage. The next isolated stage is the multi-unit listing builder.
