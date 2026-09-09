# Stage 46 — Production release

## Result

The Stage 45 launch candidate was promoted to `https://getvacancy.site` on 9 September 2026.

- Production deployment: `dpl_EgHGG1ZvqpLgR63bXciYK2ppJG1A`
- Accepted preview: `dpl_4cc4DUTUuLsQBTGXkQX3Ys8mffgd`
- App tree: `e1464493dfd7347a2467e91c2d12c51973b40279`
- Vercel status: READY
- Production public regression: 20/20 passed
- Preview public regression: 20/20 passed
- Preview hardening/adversarial: 56/56 passed
- Legal shell: 14/14 passed
- Genuine isolated personas: 10/10 passed; mean score 9.34/10
- Critical `src/listings.js` SHA-256 matched preview and production exactly: `F3044FA7DF14D5BADBBC23A67C7261BE2B96548F2BF2A2855604366E4EF23FDE`

## Changes released

- Privacy-limited listing drafts with discard and recovery.
- Progressive Location → Property → Units → Preview composer.
- Multi-unit photo ordering, removal, retry and post-publication recovery.
- Server-side request IDs preventing duplicate vacancy creation on retries.
- Truthful publication status after management refresh failures.
- Property selection before adding sibling units.
- Shared property features remain intact when unit data is normalized.
- Pilot and legal-navigation tests updated to exercise the current visible interface.

The mobile bottom navigation was reviewed but not changed; evidence supported retaining its four top-level destinations.
