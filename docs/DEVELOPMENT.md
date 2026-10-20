# Develop Vacancy from any device

## Start in a browser

1. Sign into GitHub as an account with write access to
   [tbond24/special-adventure](https://github.com/tbond24/special-adventure).
2. [Create a codespace on the prepared feature branch](https://github.com/codespaces/new?repo=1316662153&ref=feature%2Fcodespaces-workspace-20261020).
   Verify the branch shown is `feature/codespaces-workspace-20261020`, not `main`.
   Use the smallest offered machine. GitHub may require enabling Codespaces,
   accepting repository access or a billing/usage choice in your own account.
3. Wait for dependency and Chromium installation. The versioned dev container
   provides Node 24 on Debian Bookworm, Git and a non-root `node` user.
   The existing lockfile controls application dependencies.
4. Run `npm run dev`. Open the forwarded **8776** port from **Ports** and keep
   **Port Visibility: Private**. The console also provides a localhost link.
5. Use `/` for the public shell and `/__admin-preview` for the existing synthetic
   admin workspace. The synthetic report selector exercises loading/error states.
   Real sign-in, database data, email, external media and map tiles are unavailable.
   The server substitutes backend configuration in memory, denies API routes and
   protects browser connections with CSP; it does not edit product source.

On another device, sign into the same GitHub account and resume the **same**
codespace from [Your codespaces](https://github.com/codespaces). Restart
`npm run dev` if necessary. Files persist in that codespace, but commit and push
work to preserve it independently of codespace retention or deletion. Stop the
codespace when finished; choose a short idle timeout in your GitHub settings.
This setup does not enable paid spending or change your account policies.

## Make a change safely

Before new work, inspect `git status`, fetch remotes and review current branches
and [open PRs](https://github.com/tbond24/special-adventure/pulls). The audited
development base is `codex/vacancy-branch-reconciliation-20261016`, starting at
`8e4b9ea379bcbd88f9789c255b9480fb507a2c25`. Draft PR #3 is still separate.

Until this setup PR is merged into development, branch from the prepared
workspace branch so you retain its safety configuration:

```sh
git switch -c codespaces/my-change
```

Commit only intended files, push that new branch, then open a **draft PR against
the current development branch**. Do not use the GitHub default base without
checking it; do not merge the 401-commit development history into `main` as part
of setup. Existing source, continuation, preview and rollback branches stay intact.

Both root and `app/vercel.json` disable automatic Git deployments for
`codespaces/*` and `feature/codespaces-*`. Other branch behavior is unchanged.
Use the private Codespaces preview for routine work. These rules prevent Git
auto-deployment; they do not prevent a deliberate CLI/API deployment. Do not run
`vercel --prod`, move aliases or deploy this raw source to the live project.

## Check your work

Stop the manually running server with Ctrl+C, then:

```sh
npm test
```

The command runs HTTP isolation tests and a separate Playwright configuration
that starts/stops its own loopback server. It covers desktop/mobile shell and
synthetic admin startup, CSP denial, report error/recovery and existing Create/
Edit language-preview controls. It never uses the legacy live-site base URL.
Port 8776 being occupied fails the check instead of reusing an unknown server.
The `Vacancy isolated workspace` GitHub workflow runs the same checks on Linux
for workspace branch pushes and relevant PR changes, with read-only repository
permissions and no secrets or deployment step.

The old `npm run test:e2e`, `npm run test:launch` and bare `npx playwright test`
can use the live site. Read the relevant test before running it. No full product,
real login, database or hosted acceptance is claimed by `npm test`.

For actual local Auth/database acceptance, the repository already has a
[disposable Linux CI suite](../tests/full-stack/README.md). It creates and cleans
up its own stack with Supabase CLI 2.121.0 and needs no hosted credentials. Use
the existing workflow with external-mail input **false**, on a deliberately
reviewed development ref; this workspace does not automatically run it or add
Docker/database services to every codespace. Hosted tests in
`tests/hosted-release/README.md` use separate expiring windows and remain opt-in.

## Local computer alternative

Use Node 24 and Git. Clone, fetch and select the prepared branch explicitly:

```sh
git clone https://github.com/tbond24/special-adventure.git vacancy
cd vacancy
git switch feature/codespaces-workspace-20261020
npm ci --ignore-scripts
npx playwright install chromium
# On Linux, use: npx playwright install --with-deps chromium
npm run dev
```

Open `http://localhost:8776`. Locally the server binds `127.0.0.1`; the container
sets `VACANCY_DEV_HOST=0.0.0.0` for port forwarding. Optional `VACANCY_DEV_PORT`
changes the development port; the test suite deliberately stays on 8776.
No Vercel login, project link, `.env.local` or Supabase key is needed.

## Secrets and connected environments

The default preview reads only the two nonsecret process settings documented in
`.env.example`. It does not load dotenv files or any Supabase/Vercel credentials.
Do not add secrets to the container image, Git, browser configuration or logs.
`.gitignore` excludes dotenv files and private key formats; this is an accidental
commit guard, not a substitute for reviewing your diff.

If a separately approved task needs a test secret, use
[Codespaces account secrets](https://github.com/settings/codespaces) with access
limited to this repository, restart the codespace, and read the value from the
process environment without printing it. Codespaces secrets, Actions secrets and
Vercel environment settings are separate stores. Never paste tokens in chat or
clone URLs; never put service-role/database/mail keys into browser code.

| Resource | Audited purpose | Development rule |
| --- | --- | --- |
| Vercel `vacancy` | Live project; Node 24; production deployment reports `1a03a32` | Preserve deployment, domains, settings and credentials |
| Vercel `vacancy-admin-recovery-lab-20261015` | Existing protected test lab | Preserve protection; hosted tests only under a fresh scoped window |
| Supabase `xtutkwiivqkgkqjpkxvj` | Production, healthy | Never link, migrate, seed or use for workspace tests |
| Supabase `raauicmfyjpcuhfzknak` | Separate healthy admin test project | Existing test archives and cleanup boundaries still apply |
| Codespaces port 8776 | New synthetic preview | No hosted backend; keep forwarding private |

Vercel metadata lists `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_WEBHOOK_SECRET`
for Preview in the live project, with `SUPABASE_URL` shared between Production
and Preview. Values were not decrypted. Their exact target/value equivalence is
unknown; a Vercel Preview label alone is **not proof of database isolation**.
Do not pull or reuse those variables in Codespaces. No provider variables were
changed by setup. The live project has no Development variables in the returned
inventory. A future hosted development environment needs an independently
verified test-only variable set and the existing guarded lab build adapter.

## Recover or troubleshoot

- Missing browser: rerun `npx playwright install --with-deps chromium` in the
  codespace (omit `--with-deps` on Windows/macOS).
- Port occupied during tests: stop `npm run dev`; tests intentionally refuse to
  reuse another process. Missing preview port: add 8776 in Ports and keep Private.
- Container setup failed: inspect its creation log, retry dependency installation,
  or rebuild the codespace after saving/pushing work. Do not reset the branch.
- GitHub permission prompt: complete it in GitHub. The connector can read/write
  this repository; your browser Codespaces entitlement was not accessible here.
  The local machine's `gh` login is expired; `gh auth login` is needed only if
  you choose to use that machine's CLI, not for browser Codespaces.
- Undo this setup: close the draft setup PR or revert its scoped commit after
  reviewing later work. There is no database rollback or production deployment
  to reverse. Preserve any work inside a codespace before deleting it.

References: [dev container configuration](https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/adding-a-dev-container-configuration/introduction-to-dev-containers),
[forwarded ports](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace),
[Codespaces secrets](https://docs.github.com/en/codespaces/managing-your-codespaces/managing-your-account-specific-secrets-for-github-codespaces),
[Vercel branch deployment rules](https://vercel.com/docs/project-configuration/git-configuration),
[Supabase environments](https://supabase.com/docs/guides/deployment/managing-environments).
