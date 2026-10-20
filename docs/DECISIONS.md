# Development environment decisions

Automatic startup follow-up: run the same lightweight hook on container start
and editor attachment. A per-port lock serializes overlapping events; a successful
HTTP response with the isolated preview marker reuses the existing server. The
child detaches and releases the startup lock, so the hook finishes promptly.
No polling service, new dependency or production configuration is needed.

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
  After the user completed GitHub's browser authorization, setup created the
  smallest available Codespace with a 10-minute idle timeout. A failed first
  verification exposed missing SSH support; the unused instance was stopped and
  deleted only after its clean Git state was independently checked. The corrected
  workspace remains available. Private preview verification uses GitHub's own
  port tunnel, so no OAuth credential is sent to the application.
- **Keep legacy release records, correct the entrypoint.** The old laptop guide
  points to a September source. It now identifies itself as historical and links
  to the current development guide. Product HTML/CSS/JS remains untouched.

## Minimal card grid — 2026-10-20

Reuse existing Overview metrics, native CSS grid and browser-local preferences.
Small/wide sizes, drag or earlier/later buttons and hide/add-back provide a minimal
layout without a grid library, duplicate metric instances, invented history or
new backend tracking. Hiding changes layout only; values and permissions remain
those of existing reports. Preserve the v1 account-scoped key and tolerate missing,
corrupt or blocked storage. Newer local admin shell work is not in this checkout;
leave it outside this card-only patch rather than reconstructing it from chat.
