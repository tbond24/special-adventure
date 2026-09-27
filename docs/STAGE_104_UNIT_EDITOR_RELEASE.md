# Stage 104: Unit editor release

Published on 2026-09-27 to [getvacancy.site](https://getvacancy.site/).

- Source commit: `044bebd` (includes listing-journey commit `836ddce`).
- Tested preview: `dpl_AnXp9CmDXnNqdVnzYs8Hpt7t1Y6w` at `https://vacancy-qmyhvedm4-tbond24s-projects.vercel.app`.
- Production deployment: `dpl_zCwTw3mXBUhTUCnhzMpsvcmbmBuF` at `https://vacancy-14xuapj5i-tbond24s-projects.vercel.app`.
- Previous healthy production deployment (rollback target): `dpl_9Xgz1tGjMr9ieB8n8or29pf7w5ED` at `https://vacancy-bw62qn4qt-tbond24s-projects.vercel.app`.

The release puts property photos with the property name, shows the selected residential type in a pill, adds a lister-only dashboard, and makes unit names editable beside an icon-only duplicate control. Each unit has a bottom delete control. Listing-step back navigation is a top arrow, Save draft and Continue stack at half width, and saved drafts use a pencil action. Existing property defaults and unit overrides remain the storage model; additional per-unit feature and utility overrides were not added.

Verification: 130/130 local launch checks; 12/12 listing-journey checks against the live domain. Vercel reports the production deployment Ready, and `getvacancy.site` serves the version 104 listing script and stylesheet. The custom domain was explicitly assigned after promotion because it remained pinned to the previous production deployment.

To roll back the live domain to the previous healthy deployment, run from the linked project:

```powershell
npx --yes vercel alias set vacancy-bw62qn4qt-tbond24s-projects.vercel.app getvacancy.site --scope tbond24s-projects
```

Then verify `getvacancy.site` resolves to `dpl_9Xgz1tGjMr9ieB8n8or29pf7w5ED`. The source rollback point is commit `836ddce`; no database migration was made in this release.
