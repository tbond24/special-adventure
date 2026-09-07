# Vacancy laptop handoff

## Current production-green baseline

Live site: https://vacancy-nine.vercel.app

Production release branch: `vacancy-release`

Production release commit: `de6b9da8066f18ed7aa6d851a164df77d27115a1`

Rollback branch: `rollback/vacancy-g7-production-green`

The live frontend is stored under `release-v3/` on the `vacancy-release` branch.

## Clone the exact production-green source

```bash
git clone https://github.com/tbond24/special-adventure.git vacancy
cd vacancy
git checkout vacancy-release
```

Confirm you are on the expected release:

```bash
git rev-parse HEAD
```

Expected:

```text
de6b9da8066f18ed7aa6d851a164df77d27115a1
```

## Create a development branch before editing

Never build directly on `vacancy-release` or the rollback branch.

```bash
git checkout -b dev/next-stage
```

## Run the current frontend locally

The production frontend lives in `release-v3/`. It is a static HTML/CSS/JS application backed by the production Supabase project.

Serve the repo with any local static server. Example using Python:

```bash
python -m http.server 8080
```

Then open the release entrypoint you are working from in your browser. If using a generated local shell, keep the script order used by the current production deployment.

## Current product architecture

Core hierarchy:

```text
Market context
  -> Property
     -> Unit / Room
        -> Vacancy
```

Current implemented product features include:

- market selector and market defaults
- listing-level currency and rent period
- km / mile radius preferences
- location and radius search
- Explore map
- horizontal listing cards
- selected card <-> selected map pin sync
- Search this area behavior
- approximate public map location separate from exact private address
- Property -> Unit -> Vacancy inheritance
- reusable parent properties for additional units
- contextual property facts and filters
- Saved / Inbox / You mobile navigation
- listing create/edit/status/reconfirmation
- reporting/blocking/messaging
- Supabase RLS and owner-only write RPCs

## Production release testing method

For every feature or release:

```text
TEST
-> SCORE
-> identify failed acceptance item
-> diagnose root cause
-> rank fixes
-> choose smallest safe fix
-> implement
-> regression test
-> preview deploy
-> desktop/mobile E2E
-> production deploy only if green
-> production E2E
-> new rollback checkpoint
```

Do not treat source-code presence as runtime proof.

## Current GitHub E2E harness

The `main` branch contains the external Playwright harness.

Production release gate currently covers Desktop Chromium and Pixel-style mobile Chromium.

The latest production-green run passed:

- 18 general product/security checks
- 2 focused map pointer/keyboard synchronization checks

## Supabase

Production project ref:

```text
xtutkwiivqkgkqjpkxvj
```

The frontend uses the public Supabase client key only. Never put a service-role key in frontend code or GitHub.

Important privacy/security invariant:

- approximate public property coordinates may be public
- exact property addresses remain private
- anonymous users must not be able to call create/update/add-unit/map-pin RPCs

## Before changing database structure

The GitHub release branch is **not a complete archive of every historical local migration/document** produced during the earlier build sessions.

Before making schema changes from your laptop, first pull the current Supabase migration state or create a fresh schema baseline from the live Supabase project. Do not assume `release-v3/` is the canonical database migration history.

## Recommended cleanup / next infrastructure task

Create a dedicated private GitHub repository named `vacancy` and move the development source, migrations, docs, tests and release workflow there. Keep `special-adventure` only as the E2E harness if desired.

Until that is done, treat:

- `vacancy-release` = immutable production frontend source
- `rollback/vacancy-g7-production-green` = rollback pointer
- `main` = E2E harness
- your own `dev/*` branch = active laptop development

## Rule before production

Never overwrite `vacancy-release` while experimenting. Merge or copy into it only after your development branch passes local tests and a Vercel preview gate.
