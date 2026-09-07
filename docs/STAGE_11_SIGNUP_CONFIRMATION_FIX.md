# Stage 11: signup confirmation callback fix

## Aim and acceptance

Make a delivered signup confirmation visibly complete on Vacancy while keeping email confirmation enabled and preventing callback credentials from remaining in the address bar. Acceptance required a genuine Supabase confirmation link, successful sign-in after confirmation, auth regression, ten persona journeys, the 54-check preview gate, exact-artifact promotion, and a production callback smoke test.

## Diagnosis and ranked options

The production email was delivered and its Supabase verification endpoint returned a valid signup session. Vacancy's shared callback handler treated every credential fragment as password recovery, rewrote the route to `#reset-password`, and displayed an invalid reset-link result.

1. Recognize signup callbacks, scrub credentials, and show a sign-in confirmation — chosen; smallest secure change.
2. Import the returned session and sign the user in automatically — more convenient but expands session-handling scope.
3. Change only the email template or redirect — insufficient because the app would still confuse callback types.

## Change and proof

- `type=signup` callbacks now route to `#auth` with a clear success or expiry message.
- Callback credentials are removed immediately and are not stored as the normal app session.
- A genuine isolated signup link confirmed its user, landed on sign-in, removed credentials from the URL, and allowed password sign-in.
- Auth, recovery, session, deletion, and callback suite: **11/11 passed** (`34100233107`).
- Persona suite: **10/10 passed** (`34100232960`).
- Preview equivalence: **20/20 passed**.
- Targeted hardening: **10/10 passed**.
- Adversarial preview checks: **24/24 passed**.
- Exact tested preview: `dpl_CRvrpW9DCw6uFisochCX2r65gwXC`.
- Promoted production deployment: `dpl_8YsrtdH31y3uxhYCfX4bLtFsU6qX`, `READY`.
- Production expired-callback smoke: **1/1 passed**.

The prior production deployment `dpl_CVmHs5332HKjyeFj8kxXBq2NsFMW` remains the rollback target.
