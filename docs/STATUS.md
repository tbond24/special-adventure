# Vacancy development status

Audited 2026-10-20 (Australia/Perth). Repository: `tbond24/special-adventure`.

## Confirmed starting state

| Ref or service | Evidence |
| --- | --- |
| Latest development | `codex/vacancy-branch-reconciliation-20261016` at `8e4b9ea379bcbd88f9789c255b9480fb507a2c25`; 401 commits ahead of `main` |
| Original feature | `feature/admin-desktop-editor-20261014` at `0a5d4d8`; preserved |
| Continuation | `codex/vacancy-admin-continuation-20261015` at `3411cc2`; preserved |
| Open work | Draft [PR #3](https://github.com/tbond24/special-adventure/pull/3) targets the original feature; draft [PR #2](https://github.com/tbond24/special-adventure/pull/2) remains open |
| Default branch | `main` at `e4676ef`; older, not the current development source |
| Live Vercel project | `vacancy`, Node 24, production deployment `dpl_558VydjBz3tjnsNok5wgGQsoKZRz`, source `1a03a32592892a05ee0bdebbc33b75e409d7392e` on `test/remove-extra-copy-20261011` |
| Latest live-project preview | `dpl_6FMUHmBws5eT5HriaRtmEmS9cFXm`, synthetic preview source `859f6eb`; distinct from production |
| Protected test lab | `vacancy-admin-recovery-lab-20261015`, latest `dpl_8CpQAc6qUJmeheJXZMRRNmxCdpHo`, READY; hosting protection enabled |
| Supabase | Production `xtutkwiivqkgkqjpkxvj` and separate test `raauicmfyjpcuhfzknak` are healthy; production branch listing contains only its default `main` |

The repository had no dev container, root README/AGENTS or safe default start/test
command. The old laptop handoff selected an obsolete release. Product source is
`app/`; existing fixture and disposable integration tests can be reused.
Two existing local checkouts were also inspected read-only: the original feature
at `0a5d4d8` and the deployed baseline at `1a03a32` were clean and left untouched.

The Vercel connector provides reduced project metadata. Actual configured Git
production branch, root directory and build overrides were **not returned**.
The existing local Vercel login returned 403, so these remain unknown. Source
`app/vercel.json` contains listing-page rewrites. Workspace branch auto-deploy
guards are therefore included at both repository root and `app/`. The observed
deployment's source ref does not establish the configured production branch.

## Workspace change

Branch: `feature/codespaces-workspace-20261020`, based on the exact development
tip above. Adds a versioned Node 24 dev container, secret-free isolated server,
safe `npm test`, environment ignore rules and current setup instructions.
No existing branch/PR, product UI, database or hosted configuration is changed.
The only `app/` change is the branch-specific Vercel Git deployment guard.

See [DEVELOPMENT.md](DEVELOPMENT.md) for device switching, tests, secret handling
and explicit GitHub UI steps. See [DECISIONS.md](DECISIONS.md) for tradeoffs.

## Verification

- **PASS:** `npm ci --ignore-scripts` installs the existing lockfile; no dependency
  or lockfile changes. Microsoft Container Registry returned HTTP 200 for the
  Node 24 Bookworm manifest pinned in the dev-container configuration.
- **PASS:** `npm test`, Windows/Node 24.19.0: two HTTP/isolation tests and twenty
  Chromium cases across desktop/mobile, exit 0. Startup, logo/auth/error shell,
  synthetic admin report failure/recovery, real composed preview assets and
  existing language-control draft/conflict/restore behavior pass locally.
- **PASS:** CSP itself denies the browser's external fetch probe without network
  mocks. HTTP tests deny API/private/encoded-traversal paths and writes, remove
  production backend configuration, and fail closed on unrecognized hosted keys.
- **PASS:** staged whitespace, JSON and bounded secret-pattern checks; dotenv
  ignore rules verified. Product HTML/CSS/JS, SQL, lockfile and existing workflows
  match the starting source. Original local checkouts remain clean.
- **UNVERIFIED:** the new secret-free Linux workflow awaits its first GitHub run.
  Actual Codespaces creation, image launch and private forwarded-port access need
  the user's GitHub account UI; no Docker runtime or Codespaces API is available
  here. Registry resolution does not establish successful container startup.
- **Preserved:** no production/test database changes, provider variable changes,
  deployment, alias, domain, email, Auth or role changes. Existing draft PRs remain
  open. Latest production deployment still reports source `1a03a32`.

The first sandboxed Windows browser attempt passed its assertions but could not
finish child-process cleanup. A fresh run with normal process permissions ended
successfully as recorded above; no test failure was hidden or assertion weakened.
