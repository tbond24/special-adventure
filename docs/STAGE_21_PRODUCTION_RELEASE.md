# Stage 21 — Map typography production release

## Release artifact

- Tested source: `a54a19e`
- Tested preview: `dpl_D1Prq9nHc9QoXCDp3PXixFi3BTi3`
- Production deployment: `dpl_7hmb9mZqunE78yAkx1zY4fRXQtVA`
- Production domain: `https://getvacancy.site`
- Released by promoting the tested preview artifact without rebuilding it.

## Production proof

- Vercel status: Ready.
- Production aliases resolve to the new deployment: `getvacancy.site`, `vacancy-nine.vercel.app`, and `vacancy-tbond24s-projects.vercel.app`.
- Complete production browser regression: **86/86 pass** across desktop and mobile.
- Coverage includes discovery, map synchronization, location handling, currency independence, responsive containment at 390px and 320px, listing creation rules, auth safety, account, messages, and admin behavior.

## Rollback

The prior production artifact remains available as deployment `dpl_8k4oibS2h4jgunEt1P5aAJvhjSVk`. If the live site regresses, promote that deployment, confirm the three production aliases, and rerun the production smoke suite.

## Result

The unified-header and map-typography release is live and its production acceptance gate is green.
