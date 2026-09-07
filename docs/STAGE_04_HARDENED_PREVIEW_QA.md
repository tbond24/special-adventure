# Stage 4 — Hardened Preview QA

## Scope
Validate the hardened Vacancy candidate on an isolated Vercel preview before any production promotion.

Preview under test:
- https://vacancy-a4916zcur-tbond24s-projects.vercel.app
- Vercel deployment: `dpl_EuxPEfXRkoykKu6jtuMXWB9UFdZi`
- App artifact pinned to commit: `f2b5a683a0ce352d23012a4c39e2409771b6d807`
- Production alias was not changed.

## Gate
The Stage 4 automated gate comprises:
- 20 production-equivalence browser checks
- 10 targeted MVP hardening regressions
- 24 adversarial preview checks across Desktop Chrome and Pixel 7

Total: **54 checks**.

Adversarial coverage includes denied geolocation, zero-result recovery, markup-injection search strings, malformed detail routes, anonymous protected actions/routes, private-address RLS leakage, inactive/expired public visibility, preference persistence, temporary inventory-network failure, map-tile failure, repeated navigation, responsive overflow, and browser runtime errors.

## Iteration 1 — 52/54
The first hardened-preview run passed:
- production-equivalence: 20/20
- targeted hardening: 10/10
- adversarial: 22/24

Both failures were the same preference-persistence assertion on desktop and mobile: selecting the US market and reloading returned to Kenya.

### Diagnosis
Vacancy persisted the chosen market correctly in `localStorage`. The adversarial test helper itself installed this init script:

```js
localStorage.setItem('vacancy-market-v1','KE')
```

Playwright init scripts run for every new document, including reloads, so the test overwrote the user's saved `US` preference before Vacancy booted.

This was a **test-harness bug**, not a product persistence bug.

### Ranked fixes
1. Seed Kenya only when no stored market preference exists — **chosen**. Smallest change and accurately models a first-time user.
2. Remove/reconfigure the Playwright init script before the reload — more harness-specific complexity.
3. Change Vacancy to fight the forced test value — rejected because it would damage correct product behaviour.

### Fix
The helper now seeds Kenya only when the market preference is absent:

```js
if (!localStorage.getItem('vacancy-market-v1')) {
  localStorage.setItem('vacancy-market-v1','KE')
}
```

No Vacancy application code changed.

Harness-fix commit:
- `9bcd0a5f29a4d6e79a23b5074aad644fe2ca6991`

## Final result
All three checks attached to `9bcd0a5f29a4d6e79a23b5074aad644fe2ca6991` completed successfully:
- `equivalence` — PASS
- `hardening` — PASS
- `preview-qa` — PASS

Final Stage 4 score: **54/54 PASS**.

## Decision
Stage 4 is accepted. The preview is a valid hardened release candidate for the tested app artifact. This does **not** authorize production promotion yet; production transactional signup/email readiness remains a separate release gate.
