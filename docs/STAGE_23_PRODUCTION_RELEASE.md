# Stage 23 — iOS typography production release

## Release artifact

- Tested source: `2ca36fc`
- Tested preview: `dpl_23MukBCFAq5NfQ4EtoKfBtruGPeS`
- Production deployment: `dpl_9s65Up2invnvcuYfFpcib6shSwQT`
- Production domain: `https://getvacancy.site`
- The exact tested preview artifact was promoted without rebuilding.

## Production proof

- Vercel status: Ready.
- `getvacancy.site`, `vacancy-nine.vercel.app`, and `vacancy-tbond24s-projects.vercel.app` resolve to the production deployment.
- Complete production regression: **89 passed, 1 intentionally skipped**.
- The skip is the mobile-only typography assertion under the desktop test project; the same assertion passed under the mobile project.
- Database price markers, currency/location independence, responsive containment at 390px and 320px, auth, listings, messages, account, and admin flows passed.

## Rollback

The immediately previous production deployment is `dpl_7hmb9mZqunE78yAkx1zY4fRXQtVA`. If a regression appears, promote that deployment, verify all production aliases, and rerun the production suite.

## Result

The database price markers and native iOS marketplace typography are live with a green production acceptance gate.
