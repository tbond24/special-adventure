# Stage 65 — organised authentication layout

## Aim

Make sign-in and account creation easy to scan on mobile and desktop while preserving the existing unboxed interface and all authentication behavior.

## Options and ranking

1. A single vertical form: familiar, lowest mental load, responsive without separate layouts, and the smallest safe change.
2. A centred card: strong grouping, but reverses the approved container-free direction and reduces usable width.
3. Two columns on desktop and one on mobile: uses horizontal space, but separates related credentials and adds responsive complexity.

Option 1 was selected. The logo and heading are centred; labels and fields share one full-width column; password recovery aligns with the field edge; primary and account-mode actions have clear hierarchy.

## Acceptance

- Email and Password have identical left edges and widths.
- Password follows Email vertically at every tested viewport.
- Forgot password stays within and aligns to the form width.
- Create account still switches the same form and reveals Name.
- Password rules, email confirmation, error handling, and backend calls remain unchanged.

## Runtime and production evidence

- Local Stage 64/65 regression: 22/22 passed across desktop and mobile.
- Hosted preview `dpl_9WVUNmSAujBiHfoQR5uhCLHrHsh2` reached READY and rendered the expected accessible sign-in controls without browser errors.
- Production deployment `dpl_7GZFgjYYExFcuGvM4iKpUyD2D2D6` reached READY and `getvacancy.site` was explicitly assigned to it.
- Final branded-domain authentication proof: 4/4 passed across desktop and mobile, covering aligned visible fields and the Sign in/Create account mode switch.
