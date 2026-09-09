# Stage 51 — production release

- Source commits: `0a4a16f`, `9b97301`.
- Tested preview: `dpl_33qiHQWgQrNFvNihs25TyKt9PiTn`.
- Production deployment: `dpl_CEDBAHQNBWQqLxQ2HtixJ9CQBrYw`.
- Live aliases: `https://getvacancy.site`, `https://vacancy-nine.vercel.app`, `https://vacancy-tbond24s-projects.vercel.app`.
- Previous rollback deployment: `dpl_jihfw6cS2zSAKfD3kdmhgm3HvV43`.

Vercel reported the production deployment READY. The custom alias initially remained on Stage 49 after `vercel promote`; verification caught that mismatch, so the established aliases were assigned explicitly to the promoted artifact. A second inspection proved `getvacancy.site` resolves to the new production deployment. The live Stage 50 module returned HTTP 200.

Accepted runtime evidence before release: 80 relevant interface checks passed with 11 desktop applicability skips after the single placeholder-size fix; the focused fix passed; and 46/46 guided-listing, management and hardening checks passed on desktop/mobile. Unauthenticated hosted Playwright navigation was rejected before application load in this environment and was excluded rather than misreported as a product failure.
