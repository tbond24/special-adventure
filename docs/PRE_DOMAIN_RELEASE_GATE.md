# Pre-domain release gate

Candidate branch: `dev/pre-domain-auth`
Candidate preview: `https://vacancy-bbbibvdlg-tbond24s-projects.vercel.app`
Deployment: `dpl_7ZL3BDdhHsCDSx1EToS5di7zcapb`
Production remains `https://vacancy-nine.vercel.app` and is untouched.

## Regression iteration 1
The first equivalence attempt executed no product assertions because the Playwright 1.55.1 browser build was missing locally. Options ranked: install the matching browser (chosen); downgrade to the vulnerable package; create another CI job. After installing build 1193, the unchanged equivalence suite passed **20/20** across desktop and Pixel 7.

The hardening suite then reached **8/10**. Both desktop/mobile failures were the same fixture defect: the image-mapping test stored `qa-token`, which the new session lifecycle correctly treated as expired/malformed before reaching the mocked Storage endpoint. Genuine Auth upload behavior was already covered separately. Options ranked: use a structurally valid future-expiry fake JWT (chosen); mock refresh too; weaken token checks. Only the fixture was corrected. The full 30-test gate must be rerun from the start before acceptance.
