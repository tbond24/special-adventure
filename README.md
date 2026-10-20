# Vacancy

Development source for Vacancy is in `app/`. This repository is named
`tbond24/special-adventure`. Its default `main` branch is older than current
development; read [status](docs/STATUS.md) before choosing a base.

[Open your existing Vacancy workspace](https://vacancy-development-7v5vpv5w7vwpcx9rq.github.dev)
from any device signed into your GitHub account.
[Private preview](https://vacancy-development-7v5vpv5w7vwpcx9rq-8776.app.github.dev).
The preview starts automatically when you open or resume the workspace.
For a manual recovery start in Codespaces:

```sh
bash .devcontainer/start-preview.sh
```

Open port **8776** from the Ports panel; keep its visibility **Private**.
The public shell is at `/`; the existing synthetic admin is at
`/__admin-preview`. No credentials are required. Real sign-in, database writes,
email and external maps are disabled in this preview.

```sh
# In Codespaces, stop the background preview before tests.
pkill -f '^node scripts/dev-server.mjs$' || true
npm test
bash .devcontainer/start-preview.sh
```

See [development and device switching](docs/DEVELOPMENT.md),
[agent instructions](AGENTS.md) and [decisions](docs/DECISIONS.md).
Create a [fresh Codespace on the prepared branch](https://github.com/codespaces/new?repo=1316662153&ref=feature%2Fcodespaces-workspace-20261020)
only when you need a separate workspace; routine device switching reuses the
existing one. The configured machine is 2 cores with a 10-minute idle timeout.
Production release remains a separate, explicitly authorized process.
