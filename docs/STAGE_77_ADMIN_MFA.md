# Stage 77 — admin authenticator protection

## Decision

Supabase-native TOTP ranked first over SMS OTP and a separate admin identity provider. It is free, already supported by the Auth project, and produces an `aal2` JWT that PostgreSQL can enforce. The UI supports enrolment, challenge, removal and a manual setup key. An AAL1 operator can discover that verification is needed but cannot read admin data.

## Runtime and security proof

- Targeted browser acceptance: **2/2 passed** (`stage77-admin-mfa.spec.js`).
- JavaScript syntax: backend, MFA UI and test files passed `node --check`.
- Database guard: `private.is_admin` now requires both admin membership and `auth.jwt()->>'aal' = 'aal2'`; every existing admin RPC and admin table policy already uses this shared guard.
- Supabase MFA rate limits and the existing session refresh path remain intact.

## Score

| Area | Score | Evidence |
| --- | ---: | --- |
| Security | 10/10 | AAL2 is enforced in PostgreSQL, not only hidden in the UI |
| Correctness | 9/10 | enrol, challenge, verify and remove paths are covered; real owner enrolment follows preview deployment |
| Usability | 9/10 | QR, manual key and automatic focus are provided |
| Complexity | 9/10 | one isolated module and one replacement of the shared guard |

No score is below 8. Rollback is the commit immediately before this stage.
