# Stage 68 — branded production live E2E repair

## Aim and scope

Restore a trustworthy GitHub live E2E gate for the current branded production site. Keep production unchanged and preserve meaningful browser, backend-security and responsive checks.

Acceptance criteria:

- The workflow tests `https://getvacancy.site`.
- Changing live inventory volume does not fail setup by itself.
- Filters validate the returned records rather than a historical count.
- Tests match the current listing-detail and unified-auth interfaces.
- Desktop and mobile both exercise the live product.
- The complete workflow-equivalent command passes at runtime.

## Options considered

1. **Update the live target and current assertions.** Retains real production evidence with low complexity and no production data mutation.
2. **Seed or clear production before every run.** Makes counts deterministic but risks customer data and changes the system under test.
3. **Replace the gate with mocked inventory.** Deterministic and simple, but no longer proves the deployed frontend and production data path work together.

Ranking: 1, 3, 2. Option 1 is the smallest safe repair.

## Build and diagnosis loop

- Root cause: the workflow targeted the retired `vacancy-nine.vercel.app` address and waited for exactly three cards. Production correctly contained five active vacancies, so all tests stopped in shared setup.
- First repair: target the branded domain, require enough live inventory for map interaction, and compare map pins with the rendered listing count.
- Follow-up failures were stale interface assumptions: one pet-friendly record, the removed `Property facts` heading, the former two-form signup layout, and an overflow calculation that counted intentional offscreen map/gallery content.
- Fix options were: restore retired UI/data assumptions, replace the suite, or assert the current user-visible behavior. The current-behavior assertions ranked first and were applied.
- Responsive proof keeps the strict root-width check on mobile. Desktop checks the visible body and main layout so Leaflet tiles and the deliberate horizontal card rail do not create a false failure.

## Runtime proof and score

Command:

```text
VACANCY_E2E_URL=https://getvacancy.site npm run test:e2e
```

Result on 12 September 2026:

- Main live scenarios: 18/18 passed.
- Map/card synchronization: 2/2 passed.
- Desktop Chromium: passed.
- Mobile Chromium: passed.
- Total: 20/20 passed.
- Score: 100/100 against the Stage 68 acceptance criteria.

## Release state

No application code, database setting, Vercel deployment or production alias changed in this stage. The GitHub workflow and its live test harness are ready to be pushed and run remotely.
