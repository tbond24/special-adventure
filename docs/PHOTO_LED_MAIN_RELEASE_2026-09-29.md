# Photo-led listing release — 29 September 2026

The photo-led listing is the default `#detail/<vacancy-id>` page. The previous listing remains available at `#detail-classic/<vacancy-id>` without a public design switch.

Source branch: `experiment/photo-led-listing`, commit `969d85e`.

Production deployment: `dpl_DcCkfqELjynLErj3Qo3jSqR9XkJx`, aliased to `getvacancy.site`.

Immediate domain rollback target: `vacancy-bxl532iys-tbond24s-projects.vercel.app` (`dpl_F8i314hCwnpmhqUv3C93KkLaMXwT`). In the existing Vercel team, restore the old domain target with `vercel alias set vacancy-bxl532iys-tbond24s-projects.vercel.app getvacancy.site --scope tbond24s-projects`.

Verification: 36 focused desktop/mobile listing tests passed. On the live domain, the default listing/rollback routes and report/block dialog passed two mobile smoke tests with mocked data. The signed-in blocked-listing filter and You unblock refresh passed browser tests with mocked backend responses. A real two-account block/report exchange was not performed.
