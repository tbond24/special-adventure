# Stage 9: branded production launch

Date: 2026-09-07

## Aim and scope

Complete only the remaining launch gate: choose a low-cost branded domain, verify Resend, configure Supabase SMTP with confirmation enabled, prove genuine confirmation and recovery delivery, promote the exact accepted artifact, run production QA, and preserve a rollback point.

## Domain options and decision

1. `getvacancy.site` — USD 1.99 for year one; shortest and clearest call to action. Chosen.
2. `vacancyhomes.site` — USD 1.99 for year one; descriptive but longer.
3. `findvacancy.online` — USD 1.99 for year one; understandable but more generic.

Vercel confirmed the purchase under `tbond24s-projects`. The registrar currently quotes USD 27/year for renewal. Resend sending is verified in `ap-northeast-1`, TLS is enforced, and open/click tracking is disabled so auth links are not rewritten.

## Production configuration

- Primary domain: `https://getvacancy.site`
- Compatibility aliases: `https://vacancy-nine.vercel.app`, `https://vacancy-tbond24s-projects.vercel.app`
- Supabase project: `xtutkwiivqkgkqjpkxvj`
- Sender: `Vacancy <auth@getvacancy.site>`
- Confirmation: enabled
- Password minimum: 12 characters with lower case, upper case, and digits
- OTP expiry: 3600 seconds; OTP length preserved at 8
- Authenticator MFA enrollment and verification preserved as enabled
- Recovery redirects allow only the primary domain and the two tested Vercel deployments.
- Edge Function `secure-password-reset` deployed as version 1 with JWT verification enabled.
- CAPTCHA assessment retained the existing secure-signup screening and Supabase rate limits. No new CAPTCHA vendor was added because the completed abuse tests did not justify another launch dependency; this preserves the earlier smallest-safe-option decision.

## Failures and smallest safe fixes

The first Auth config push inherited two local defaults: authenticator MFA was disabled and OTP length changed from 8 to 6. Advancement stopped. Ranked fixes were: restore the two known remote values in the same config; patch through the Management API; or restore the full config manually. The first option was applied. A repeat config push reported the entire remote Auth config up to date.

The first recovery-browser command split the delivered URL at Windows command separators. Ranked fixes were: pass one shell variable; use an encoded browser navigation value; or paste manually. Encoded navigation was used after the wrapper still split the variable argument. The full delivered link then rendered the production reset form.

The first form interaction treated `@` browser references as PowerShell syntax. Ranked fixes were: quote references; use accessible labels; or execute DOM JavaScript. Quoted references were the smallest harness-only correction and the unchanged product flow passed.

The raw legacy equivalence invocation ran an obsolete coordinate-click map duplicate and failed on both devices, while the dedicated map suite passed on both. Ranked fixes were: run the maintained `test:e2e` gate; rewrite the obsolete selector; or change working product behavior. The maintained gate was chosen because the repository command explicitly replaces the ambiguous duplicate with `map-sync.spec.js`.

## Runtime evidence and score

- Genuine confirmation email: delivered from the branded sender.
- Confirmation link: landed on `getvacancy.site`; sign-in succeeded only after confirmation.
- Genuine recovery email: delivered from the branded sender.
- Visible recovery landing and password update: passed.
- Old password rejected; new password accepted: passed.
- Temporary account deletion and post-delete rejection: passed.
- Production equivalence: 20/20 passed.
- Targeted hardening: 10/10 passed.
- Production adversarial gate: 24/24 passed.
- Final browser smoke: primary UI, inventory, filters and map rendered; no browser errors reported.
- Vercel error scan: no runtime errors found after promotion.

Final score: **all required launch gates passed**.

## Release and rollback

Accepted preview artifact: `dpl_7ZL3BDdhHsCDSx1EToS5di7zcapb`.

Promoted production deployment: `dpl_CVmHs5332HKjyeFj8kxXBq2NsFMW` (`READY`). Vercel promotion created the production deployment from the accepted artifact without rebuilding source.

Previous production rollback target: `dpl_3dFTvKScNGchkwW2czHh6RbmGjP2`.

If signup, listing or messaging breaks, first confirm Vercel deployment health and Supabase Auth/Edge Function health. Roll Vercel back to the previous deployment ID for a frontend regression. Preserve the database and Auth configuration unless evidence identifies them as the failing boundary.
