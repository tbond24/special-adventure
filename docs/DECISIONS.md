# Development environment decisions

2026-10-20 (Australia/Perth).

- **Base on inspected development, not the default branch.** The reconciliation
  tip `8e4b9ea` contains 401 commits beyond `main` and 226 beyond the deployment
  source `1a03a32`. It preserves the two admin histories. Setup gets its own
  feature branch and draft PR against reconciliation; existing PRs stay draft.
- **Codespaces with one versioned Node 24 image and the existing lockfile.**
  This matches the connected projects' Node major without introducing a new
  package manager, app framework, dependency upgrade or container database.
  Image updates are deliberate reviewed changes. Browser installation follows
  the locked Playwright version.
  The image manifest was resolved directly from Microsoft Container Registry and
  pinned to digest `16eb68aa0d17eedaaf2566b180854fe4e506478e35aadf790fb02aa089024f13`.
  Actual Codespaces verification showed the base image lacks an SSH service.
  Add official `sshd` feature 1.1.0 for GitHub CLI verification and remote access;
  do not forward its port publicly or set a password. GitHub manages access.
- **Synthetic by default; reuse existing fixtures.** A small development server
  serves `app/` with in-memory backend substitution, same-origin CSP and disabled
  API routes. Real backend acceptance already has a disposable Linux CI harness.
  Starting a paid hosted branch or replaying shared test data would add risk
  without helping routine edits. Synthetic results never imply real persistence.
- **Prevent automatic deployment of workspace branches.** The live Vercel
  project's Preview variables include privileged credentials. Branch-specific
  rules in both possible configuration roots cover `codespaces/*` and
  `feature/codespaces-*`; they preserve all other branches and existing rewrites.
  Codespaces port forwarding supplies the routine preview. Explicit hosted lab
  testing remains separate and protected.
- **Zero required secrets and no provider mutation.** Existing production/test
  projects remain as found. No new resources, billing, credentials, migration,
  Auth callback, public share/bypass or domain changes are required for startup.
  Codespaces account creation/permission/usage confirmation belongs to the user.
- **Keep legacy release records, correct the entrypoint.** The old laptop guide
  points to a September source. It now identifies itself as historical and links
  to the current development guide. Product HTML/CSS/JS remains untouched.
