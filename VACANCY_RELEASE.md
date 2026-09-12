# Vacancy release staging

This branch is **not** a production source branch yet. It exists only to stage release metadata while the dedicated private Vacancy repository cannot be created through the current GitHub connector.

Validated local checkpoint: `checkpoint/kenya-release-pipeline`
Local commit: `35ad6ab`
Kenya localisation commit: `5f0b8ac`
Self-contained release artifact SHA-256: `1f28fd9c7939431659b76451ae266844c11228c7e66e1946693dd0e9de34bc57`

Required release gate:
1. Run all local acceptance suites.
2. Deploy exact artifact to Vercel **preview**.
3. Verify Kenya markers and all asset responses.
4. Run desktop/mobile Playwright against preview.
5. Deploy/promote the exact same artifact to production.
6. Verify `https://vacancy-nine.vercel.app`.
7. Create a production rollback tag/checkpoint.

Never deploy a placeholder or an unverified branch head.

## Local Vercel CLI authentication

The normal Windows Vercel settings location fails atomic config saves with an `EXDEV` error in this workspace. Use the persistent private config directory at `..\..\.private\vercel-cli` for every Vercel CLI command by passing it through `--global-config`.

This directory sits outside the Vacancy Git repository and must never be copied into the repository, committed, printed, or deleted after routine deployments. The retained login prevents repeated browser authorization while preserving the preview-first release flow.
