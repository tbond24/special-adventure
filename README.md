# Vacancy

Development source for Vacancy is in `app/`. This repository is named
`tbond24/special-adventure`. Its default `main` branch is older than current
development; read [status](docs/STATUS.md) before choosing a base.

[Open your existing Vacancy workspace](https://vacancy-development-7v5vpv5w7vwpcx9rq.github.dev)
from any device signed into your GitHub account.
[Private preview](https://vacancy-development-7v5vpv5w7vwpcx9rq-8776.app.github.dev).
The preview was started and verified during setup. After stopping/resuming the
codespace, start it again if needed:

```sh
npm run dev
```

Open port **8776** from the Ports panel; keep its visibility **Private**.
The public shell is at `/`; the existing synthetic admin is at
`/__admin-preview`. No credentials are required. Real sign-in, database writes,
email and external maps are disabled in this preview.

```sh
# Stop the preview with Ctrl+C before tests.
npm test
```

See [development and device switching](docs/DEVELOPMENT.md),
[agent instructions](AGENTS.md) and [decisions](docs/DECISIONS.md).
Create a [fresh Codespace on the prepared branch](https://github.com/codespaces/new?repo=1316662153&ref=feature%2Fcodespaces-workspace-20261020)
only when you need a separate workspace; routine device switching reuses the
existing one. The configured machine is 2 cores with a 10-minute idle timeout.
Production release remains a separate, explicitly authorized process.
