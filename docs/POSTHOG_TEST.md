# Vacancy Test connection

Verified 2026-10-21 (Australia/Perth). Organization **Trevvz**,
project **Vacancy Test**, ID `314158`, EU cloud.
[Open project settings](https://eu.posthog.com/project/314158/settings/project).

The user explicitly approved reusing the unused Default project, which had no
ingested events. It was renamed and optional capture features were disabled:
automatic interactions, errors, web vitals, console/performance capture, replay,
surveys, heatmaps and dead clicks. IP anonymization remains enabled. No extra
project, billing upgrade or production change was made.

## Use it locally

In this local checkout on `codespaces/posthog-test-20261021`:

```sh
npm ci --ignore-scripts
npm run posthog:test
```

Open **http://127.0.0.1:8891/** using that exact address on this computer.

1. The page starts with analytics **off**.
2. Select **Allow optional test analytics**. No automatic event is sent.
3. Select **Send one test event**. The button then disables. The page reports SDK
   handoff; check PostHog for stored receipt.
4. Select **Turn off test analytics**, or close the tab. Reload needs fresh consent.

Only `vacancy_smoke_completed` is allowed, with `environment=development` and
`source=manual_smoke`. The existing adapter strips URL/referrer/account/form data,
uses transient memory identity, and disables profiles and automatic collection.
Already submitted events cannot be recalled by withdrawing consent.

Stop the server with Ctrl+C. It binds only to loopback and refuses Vercel, CI and
production environments. It serves only this page and the existing adapter/SDK,
with Host/Origin checks, no query strings, no arbitrary files or product/backend
routes, and CSP allowing only itself and the verified ingestion host.

The configured `.env.posthog.local` is ignored by Git and contains only the test
project's browser-public token, EU host, numeric ID and local enable switch.
It is loaded **only** by `npm run posthog:test`. Normal `npm run dev` retains its
API/external-connection denial, and production configuration stays hard-disabled.

On another computer, create that ignored file with the public token from this
test project's settings; never use personal/admin keys or production variables:

```dotenv
POSTHOG_ENABLED=true
POSTHOG_PROJECT_TOKEN=YOUR_TEST_PROJECT_PUBLIC_TOKEN
POSTHOG_HOST=https://eu.i.posthog.com
POSTHOG_TEST_PROJECT_ID=314158
```

## Evidence and limits

**PASS:** six Node isolation/config checks and 42 browser cases; two existing
desktop-only checks skip on mobile. New cases cover production/hosting refusal,
Host/Origin checks, inaccessible private/product routes, consent, one deliberate
Send and withdrawal. Regression traffic is intercepted.

**PASS, real delivery:** exactly one synthetic event from the existing adapter
and pinned local SDK received HTTP 200 (`status: Ok`) and was subsequently read
back from this PostHog project:

- Event: `vacancy_smoke_completed`.
- UUID: `01a15d63-3c2c-775d-972b-088290cdcf41`.
- Recorded: `2026-10-21T07:35:52.728Z` (15:35:52 Australia/Perth).
- Recorded properties contain development/manual_smoke, a transient ID and
  protocol/privacy fields; no page URL, referrer, IP, account/listing/form data.

The automated test browser closed afterward. Its bot filter was bypassed only
inside that deliberate synthetic test instance; committed defaults keep it on.
Earlier diagnostic attempts were blocked before leaving the browser because the
verification filter expected a different endpoint. The pinned SDK uses `/e/`.
After correcting the filter, one event was sent. An assertion expected numeric
status 1 instead of Ok; no event was resent for that mismatch. Initial
pre-ingestion queries were empty; a later fresh query confirmed stored receipt.

This connects the **test adapter**, not automatic customer journeys. No production
deployment/capture, database/Auth/mail/domain change, customer consent UI or
existing Codespace branch switch was made. Existing first-party telemetry and
renter consent were not forwarded to PostHog.

Event retention is plan-defined and cannot be shortened as a project setting.
No 30-day event deletion guarantee was configured. The project's 30-day replay
retention is separate, and replay is off. Use synthetic data only. References:
[event retention](https://posthog.com/docs/data/events-retention),
[privacy controls](https://posthog.com/docs/product-analytics/privacy).

## Rollback

Checkpoint `rollback/pre-posthog-test-20261021` points to `edc6213` before this
slice. Stop the server and disable/remove the ignored local env file to stop
further local sends. Revert only this slice on a new branch after reviewing later
work; do not reset or force-push existing branches.

Code rollback does not undo hosted PostHog settings or delete submitted events.
Original project settings: name Default project; description null; anonymize IPs
true; replay false; autocapture/error/web-vitals/surveys/heatmaps opt-in fields
null; console/performance opt-in true; dead clicks false. Restoring settings or
deleting records is a separate deliberate operation. Keep the safer settings by
default. No production rollback is needed.
