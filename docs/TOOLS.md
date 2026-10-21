# Vacancy tools quickstart

Prepared 2026-10-21 (Australia/Perth) for `tbond24/special-adventure`.
Branch: `codespaces/tools-smoke-analytics-20261021`.
Base and rollback: `c6e526e603ebd3ab629fa5392b65b3a2d5726758` (latest admin
card-size branch, draft PR #7). `main` is an older baseline. Nothing was deployed.

## Get this setup

In a clean, separate clone, fetch and select the tools branch:

```sh
git fetch origin
git switch codespaces/tools-smoke-analytics-20261021
npm ci --ignore-scripts
npx playwright install chromium
```

Use Node 24. On Linux, use `npx playwright install --with-deps chromium`.
If your current workspace has edits, preserve them and use a separate checkout
instead of switching it. The existing Codespace was not switched by this task.

## Ask the agent for better reviews

Vercel's official `web-design-guidelines` skill is installed in
`.agents/skills/web-design-guidelines/SKILL.md`. Start a new Codex turn from this
repository so the project skill is available. Example prompt:

> Use $web-design-guidelines to review app/src/listings.js and its styles for
> mobile accessibility. Apply the Vacancy Method. Report findings before fixes.

The skill retrieves Vercel's current interface guidelines when reviewing. It
does not redesign or deploy the app. Source revision and installation details
are in `.agents/skills/SOURCES.md`. React/Next.js skills were excluded because
Vacancy uses plain HTML, CSS and JavaScript.

## Run mobile smoke checks

Stop a foreground preview with Ctrl+C first. In Codespaces, stop/restart the
automatic preview using the existing procedure in `DEVELOPMENT.md`.

```sh
npm run test:smoke
npm run test:smoke:ui
npm test
```

- `test:smoke`: three quick checks on Chromium with Pixel 7 emulation at
  390 x 844: guest List -> Residential -> Room -> New property, invalid-email
  validation without an auth submission, and PostHog inactivity/isolation.
- `test:smoke:ui`: opens the same checks in Playwright's interactive viewer on
  a computer with a graphical browser. Use the VS Code Playwright extension or
  headless command in a browser-only Codespace. Interactive UI was not verified.
- `npm test`: existing isolated HTTP/admin/language checks plus smoke and real
  SDK privacy checks. All start their own localhost server on port 8776.

The smoke file fixes its viewport to 390 x 844 in both browser profiles; the
existing admin suite still checks desktop and mobile. Chromium mobile emulation
is not an actual phone or Safari check. Real login, save/publish, email and map
services need the existing disposable integration suite, not this preview.

Do not use bare `npx playwright test` or the legacy `test:e2e` / `test:launch`
commands: their separate legacy configuration can target the live site.
To add a check, edit `tests/workspace-smoke.spec.js`, use visible roles/labels,
and run the explicit safe command above. Failed screenshots are in ignored
`test-results/`; this setup keeps traces off to avoid sensitive capture.

The preview deliberately lacks inventory data on startup. The guest smoke test
first boots on Sign in, then clicks the real mobile List navigation. It does not
prove direct guest deep-link startup against a hosted inventory service.

## PostHog: prepared, disabled

**Follow-up:** [Vacancy Test is now connected and verified locally](POSTHOG_TEST.md).
The earlier missing-account steps below describe the original setup; production
and the normal isolated preview remain disabled.

Installed pinned `posthog-js` 1.438.13 with an unmodified local no-external
browser bundle and license. `npm run assets:posthog` refreshes that vendored
asset from the exact installed package; it never enables analytics.

`app/src/posthog-analytics.js` is loaded by the existing page but does nothing
until its separate, in-memory development consent API is called. It does not
reuse renter consent, hook product actions, or forward existing telemetry.
Even after that choice it needs an enabled configuration from
`/api/posthog-config`. Configuration is read from process environment:

| Variable | Default / purpose |
| --- | --- |
| `POSTHOG_ENABLED` | `false`; explicit development switch |
| `POSTHOG_PROJECT_TOKEN` | Empty; browser-public `phc_...` project token |
| `POSTHOG_HOST` | Empty; exact US or EU ingestion URL for that project |
| `VERCEL_ENV` | Supplied by Vercel; only `development` / `preview` accepted |

Missing/invalid settings and `VERCEL_ENV=production` return only
`{"enabled":false}`. No private/personal API key belongs here. The public project
token is intentionally returned to the browser when enabled. Do not print or
commit private credentials. The isolated preview still denies all `/api` routes
and external connections, regardless of these settings; `.env` is not auto-loaded.

Enabled SDK configuration disables autocapture, pageviews/pageleaves, replay,
heatmaps, performance/error capture, surveys, remote flags and external extension
loading. It uses memory identity, no person profiles and no IP geolocation.
Do Not Track / Global Privacy Control and admin/auth routes block capture.
The final event filter replaces SDK properties with a strict allowlist and removes
URLs, query strings, referrers, names, emails and form contents. It allows only
`vacancy_smoke_completed` with `environment=development`, `source=manual_smoke`,
a transient random ID and required protocol/privacy fields.

### Remaining steps for a real development event

1. Create/select a separate **test** PostHog project. Choose its US/EU region and
   set project retention deliberately; no PostHog account settings were inspected
   or changed. Do not assume Vacancy's existing 30-day renter policy applies to it.
2. Explicitly approve a separate nonproduction runtime and any deployment needed
   to host it. Use independently verified test-only configuration. Never pull
   the live Vacancy project's privileged preview variables.
3. Supply the public project token and matching host privately in that runtime's
   environment and set `POSTHOG_ENABLED=true`. Keep production off. No credentials
   were requested or invented during this task, and no provider env was changed.
4. On that approved test page, after deliberate test consent, run in its browser
   console:

   ```js
   await VACANCY_POSTHOG.setConsent(true)
   VACANCY_POSTHOG.capture('vacancy_smoke_completed')
   await VACANCY_POSTHOG.setConsent(false)
   ```

5. Confirm that event in PostHog's live events, filter for `environment=development`,
   and inspect its properties. Reload requires a fresh choice. Withdrawal blocks
   subsequent captures; it cannot recall requests already sent. The normal SDK
   bot filter remains enabled; intercepted Playwright serialization tests disable
   it only inside their test harness.

There is no customer-facing PostHog consent UI or automatic product event wiring
in this slice. Production collection requires a separately reviewed consent/
notice/retention plan, an approved event schema, code changes to the production
gate, and explicit confirmation before activation/deployment.

## What changed and how to undo it

Changes are confined to the project skill/provenance, test commands and safe CI
path filters, three mobile smoke checks, PostHog SDK/adapter/config/privacy tests,
environment template and documentation. Existing Playwright 1.55.1 was reused;
no React framework or analytics forwarding was added. Existing preview CSP,
backend isolation, product layout, database and deployment rules are preserved.

Local rollback branch: `rollback/tools-setup-20261021` points to the base above.
For a read-only comparison, use `git diff c6e526e..HEAD`. Keep the draft PR unmerged
to defer adoption. If the tools commit is later adopted, revert **that scoped
commit** on a new development branch after reviewing later work. Do not reset
or force-push existing work or revert prerequisite admin/workspace history.
No database or production rollback is needed for this task.

Official references: [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills),
[Codex local skills](https://learn.chatgpt.com/docs/build-skills),
[Playwright](https://playwright.dev/docs/intro),
[PostHog configuration](https://posthog.com/docs/libraries/js/config).
