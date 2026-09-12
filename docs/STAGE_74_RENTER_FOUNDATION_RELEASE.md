# Stage 74 — Renter foundation production release

## Exact release

- Source checkpoint: `checkpoint/stage73-product-foundation-pass` at `305f064`.
- Production deployment: `dpl_54pffK1zLuoL12a8EYZTSqEhJRPv` (`vacancy-ee0hwqksm-tbond24s-projects.vercel.app`).
- Branded domain: `https://getvacancy.site`.
- Supabase project `xtutkwiivqkgkqjpkxvj`: `ACTIVE_HEALTHY` during the release gate.

## Runtime proof

- Local renter/lister desktop and mobile regression: **136/136 pass**.
- Repeated startup/auth race gate: **54/54 pass**.
- Exact hosted production gate: **30/30 pass** across desktop and mobile.
- Live data: **6 listing cards and 6 matching map markers** rendered from Supabase.
- Live sign-in: unified form and password path rendered; no browser runtime errors were reported.
- Live dark theme: approved orange mark retained and the wordmark layer rendered white.
- Google provider probe: Supabase returned `Unsupported provider: provider is not enabled`. The app therefore hides Google sign-in. The implementation and enabled-provider simulation pass locally; real Google consent is not claimed.

## Failure and repair record

The first preview and production attempts uploaded the repository root and returned Vercel `404 NOT_FOUND`. Promotion, a direct root production build, and deploying the established `app` directory were ranked. Deploying `app` ranked first because it matches the project's previous successful releases and changes no product behavior. The branded domain was returned to the prior healthy deployment before each retry.

The first correct hosted run exposed a startup race in which an instant inventory response rendered before enhancement scripts loaded. Timer delays, moving every script, and booting on `DOMContentLoaded` were ranked; the lifecycle event ranked first. Runtime asset versions were advanced to prevent old scripts from being combined with the new page.

The live inventory then exposed document overflow from a 21-image listing. Gallery truncation, data deletion and CSS containment were ranked; containment ranked first because it preserves the full swipe gallery. The page now blocks horizontal document movement while retaining gallery scrolling.

## Rollback

If Find, sign-in, listing, or enquiry regresses, assign `getvacancy.site` back to the previous healthy production deployment `dpl_UPA6GRoXtN7nJ6kRt552J1NXpKBh` (`vacancy-iga1ag6l3-tbond24s-projects.vercel.app`), confirm the alias, and rerun the hosted gate. The failed root deployments must not be used as rollback targets.

## Remaining external task

Create or select the Google Cloud OAuth client, add the Supabase callback URL, enable the Google provider with its Client ID and secret, and then complete a real Google account consent/session test. Until then, email/password and guest enquiry remain available and the unavailable Google control stays hidden.
