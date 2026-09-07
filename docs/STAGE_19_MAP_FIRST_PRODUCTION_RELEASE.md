# Stage 19 — Map-first production release

## Released artifact

- Tested source commit: `3244931`
- Promoted preview: `https://vacancy-oal6m3z1f-tbond24s-projects.vercel.app`
- Preview deployment: `dpl_18PBPodrtGQMYLuqCfrZsDmWqYvc`
- Production deployment: `dpl_8k4oibS2h4jgunEt1P5aAJvhjSVk`
- Production URL: `https://getvacancy.site`
- Vercel aliases: `getvacancy.site`, `vacancy-nine.vercel.app`, `vacancy-tbond24s-projects.vercel.app`
- Vercel status after promotion: `Ready`

## Production proof

- Mobile map-first and full-page containment checks: **7/7 pass**
- Standard desktop/mobile production smoke: **34/34 pass**
- Pre-promotion combined regression on the exact source artifact: **78/78 pass**
- Dedicated 390px and 320px all-page audit: **2/2 pass**, covering 26 screen-width combinations

## Rollback

If a production fault appears, use Vercel rollback to restore the prior production deployment, then verify home inventory, sign-up, listing, and messaging. The pre-release code rollback point is `checkpoint/mobile-responsive-pass`; this release is recorded by `checkpoint/map-first-production-live`.
