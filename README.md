# Vacancy

Development source for Vacancy is in `app/`. This repository is named
`tbond24/special-adventure`. Its default `main` branch is older than current
development; read [status](docs/STATUS.md) before choosing a base.

[Open the prepared Codespaces branch](https://github.com/codespaces/new?repo=1316662153&ref=feature%2Fcodespaces-workspace-20261020).
Choose the small default machine, create the codespace, then run:

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
Production release remains a separate, explicitly authorized process.
