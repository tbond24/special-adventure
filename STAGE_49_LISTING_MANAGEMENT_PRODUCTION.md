# Stage 49 — listing management production release

## Release

- Source feature commit: `97e5328`.
- Final release record commit follows this document.
- Tested application preview: `dpl_DLyLnfnLX148ReMR3iENcyjeGKsJ`.
- Production deployment: `dpl_jihfw6cS2zSAKfD3kdmhgm3HvV43` (`vacancy-55kib2jko-tbond24s-projects.vercel.app`).
- Live aliases: `https://getvacancy.site`, `https://vacancy-nine.vercel.app`, and `https://vacancy-tbond24s-projects.vercel.app`.
- Supabase migration: `20260909053012_archive_and_delete_vacancies.sql`.

## Runtime evidence

- Live Stage 49 owner-management suite: 8/8 across desktop and mobile.
- Live Find: map present, 3 active Kenya cards, result count `3 current vacancies`.
- Live Auth: sign-in and sign-up forms present.
- Live Privacy: information page present.
- Find, Auth and Privacy checks each reported zero horizontal overflow.
- Supabase public API independently returned 3 active listings.
- Database migration history matched locally and remotely after application.

## Failure and recovery record

The first preview deployed the repository root and returned Vercel's own 404. It was rejected. The actual `app/` directory was then deployed and tested.

Promoting that preview with the current CLI recreated a root-based production artifact. The live smoke gate found the map, Auth and policy content missing. Production was immediately rolled back to `dpl_Fp5BQeQVjodrN2qUDVyofihcmUcX`; rollback verification showed the map and 3 active cards again.

The accepted fix deployed `app/` directly with the production target, then assigned the live aliases to that exact deployment. This path passed the final live gate.

## Rollback

If Stage 49 fails, point the three live aliases back to `dpl_Fp5BQeQVjodrN2qUDVyofihcmUcX`. The Stage 49 database additions are backward-compatible with Stage 48: reference columns are additive and `archived` extends the status constraint.

## Score

- Listing management usability: 9/10.
- Reversibility and removal safety: 9/10.
- Mobile containment: 10/10.
- Database integrity: 10/10.
- Deployment recovery: 10/10.
- Stage score: 9.6/10.
