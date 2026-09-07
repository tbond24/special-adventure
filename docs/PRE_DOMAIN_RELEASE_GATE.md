# Pre-domain release gate

Candidate branch: `dev/pre-domain-auth`
Candidate preview: `https://vacancy-bbbibvdlg-tbond24s-projects.vercel.app`
Deployment: `dpl_7ZL3BDdhHsCDSx1EToS5di7zcapb`
Production remains `https://vacancy-nine.vercel.app` and is untouched.

## Regression iteration 1
The first equivalence attempt executed no product assertions because the Playwright 1.55.1 browser build was missing locally. Options ranked: install the matching browser (chosen); downgrade to the vulnerable package; create another CI job. After installing build 1193, the unchanged equivalence suite passed **20/20** across desktop and Pixel 7.

The hardening suite then reached **8/10**. Both desktop/mobile failures were the same fixture defect: the image-mapping test stored `qa-token`, which the new session lifecycle correctly treated as expired/malformed before reaching the mocked Storage endpoint. Genuine Auth upload behavior was already covered separately. Options ranked: use a structurally valid future-expiry fake JWT (chosen); mock refresh too; weaken token checks. Only the fixture was corrected. The full 30-test gate must be rerun from the start before acceptance.

## Regression iteration 2
- Exact preview: `dpl_7ZL3BDdhHsCDSx1EToS5di7zcapb`, READY, no production alias.
- Equivalence: **20/20 passed** (desktop and Pixel 7).
- Targeted hardening: **10/10 passed**.
- Adversarial preview: **24/24 passed**.
- Established hardened preview gate: **54/54 passed**.
- Auth/recovery/session/deletion/edge UX gate: **9/9 passed** in isolated Supabase.
- Genuine renter↔landlord rerun: GitHub Actions run `34087861622`, **2/2 passed** in 13.5 seconds against isolated Supabase.
- Frontend tree tested: `872b80cb0e36310eccbb9f2151791feaba91549f`.
- Auth function source tree tested in isolation: `e94aa9a2503a50ab15b0d32f83ab67e758b214cf`.
- Production verification after testing: `vacancy-nine.vercel.app` still aliases READY production deployment `dpl_3dFTvKScNGchkwW2czHh6RbmGjP2`.
- Production Supabase functions remain unchanged at `delete-account` v1 and `secure-signup` v1; `secure-password-reset` has not been deployed.

## Acceptance
All non-domain launch-critical gates are green. The candidate is accepted for the pre-domain checkpoint. No production promotion, production database write, production Auth configuration change or production function deployment occurred.

Remaining gate: choose the final brand/domain; verify it in Resend; configure Resend SMTP in Supabase with confirmation on; bind the minimal CAPTCHA configuration to the final public hostname; deploy the exact tested Auth functions; prove a real signup confirmation and real password-reset email; rerun the final production gate; promote the exact tested frontend artifact; run production QA; create the new rollback baseline.
