# Vacancy development instructions

Read `docs/STATUS.md` and `docs/DEVELOPMENT.md` before changing this repository.
The repository is `tbond24/special-adventure`; `main` is an older baseline.
Audit remote branch tips and open PRs before choosing the next base. This workspace
starts from `codex/vacancy-branch-reconciliation-20261016` at `8e4b9ea`.

- Preserve uncommitted work, existing branches, rollback checkpoints and draft PRs.
  Use a new `codespaces/<task>` or `feature/codespaces-<task>` branch and a draft
  PR against the current development branch. Never force-push or merge by default.
- Product source is `app/`; database history is `supabase/migrations/`.
  `release/`, `release-v3/` and old handoff records are historical references.
- Use Node 24 and the committed npm lockfile: `npm ci --ignore-scripts`.
  `npm run dev` starts the isolated preview; `npm test` runs only local checks.
  Stop a manually running preview before tests, which start their own server.
- Do not run the legacy `test:e2e`, `test:launch` or default Playwright config
  casually: they can target the live site. Use `playwright.workspace.config.cjs`.
- Preview assets are sanitized in memory, APIs are disabled and CSP denies
  external connections. Keep those protections. The synthetic admin is not
  evidence of real Auth, MFA, persistence, publication or email delivery.
- No production database, credentials, mail, deployment, domain, role or Auth
  changes are authorized by ordinary development. Hosted test operations require
  a scoped current authorization and the existing preservation/cleanup procedure.
- Never commit `.env` files, credentials, session exports, private keys or customer
  data. The default workspace needs no secrets. Do not pull Vercel production or
  preview credentials: the `vacancy` project has privileged preview variables.
- Codespaces branches disable automatic Vercel Git deployment in root and
  `app/vercel.json`; keep both rules aligned. Check deployment settings again
  before working outside these branch prefixes. No general root product build
  has been added by this workspace setup.
- Reuse the existing synthetic fixture and disposable integration suite. Keep
  changes scoped; do not redesign unrelated UI or replay hosted migrations.
- Verify the changed user flow and relevant failure cases. State PASS, PARTIAL,
  FAIL or UNVERIFIED accurately; record material changes in `docs/STATUS.md` and
  consequential choices in `docs/DECISIONS.md`.
