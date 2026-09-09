# Stage 48 — guided listing production release

## Release

- Promoted tested preview `dpl_F6GMnk9LJiq2QjwX1VdeDXXFaqQG` without rebuilding.
- Production deployment: `dpl_Fp5BQeQVjodrN2qUDVyofihcmUcX`.
- Live aliases: `https://getvacancy.site`, `https://vacancy-nine.vercel.app`, and `https://vacancy-tbond24s-projects.vercel.app`.
- Supabase migration `atomic_listing_map_location` was already active and passed the preview gate.

## Evidence

- Preview combined acceptance: 80/80.
- Production public, map-sync and guided-listing browser checks: 30/30.
- Live SHA-256 content equality: backend.js, listing-composer.js, listings.js, market-explore.js and styles.css all match the tested workspace artifact.
- Vercel reports the production deployment Ready with exchange-rates, geocode and reverse-geocode functions present.

## Score

- Deployment integrity: 10/10.
- Public discovery regression: 10/10.
- Guided listing smoke coverage: 9/10.
- Rollback readiness: 10/10.
- Production release score: 9.8/10.

Rollback target before this release: checkpoint/stage46-production-pass. New rollback baseline: checkpoint/stage48-guided-listing-production-pass.
