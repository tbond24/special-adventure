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

Restore the requested prior shell from exact chat file-change hunks, rather than
redesigning from the discussion. Consolidate the existing report into Overview and
append the existing snapshot after report content. Keep the new grid module and
v1 preferences intact. Include the prior header/Site status corrections so the
restored layout behaves as previously reviewed. Leave later graph-card work out.

## Desktop shell constraints — 2026-10-21

Use six equal outer columns at >=1280px: one for navigation, five for content.
Keep the navigation fixed and independently scrollable, with its width derived
from the same six-column shell. The content region has 24px inner insets, so
navigation is exactly viewport/6 (240px at 1440px), rather than treating the
navigation/content boundary as an extra gutter. The shell establishes placement;
existing cards retain their current layout until the requested card-sizing pass.
Apply only at the agreed desktop minimum; retain existing narrower-screen rules
without a new mobile design. Continue from the latest card-grid branch to retain
the restored navy shell and isolated workspace, targeting reconciliation in draft.

## Desktop data card sizes — 2026-10-21

Replace auto-fit desktop metric widths with five equal tracks in each existing
card region. Compact spans one and wide spans two; preserve row order rather than
packing gaps densely, so reading and keyboard order remain consistent. Retain
panel containment and full-width report/information surfaces. Use a minimum
144px card height with natural growth, rather than clipping long labels or
arrangement controls to a fixed height. Keep existing saved small/wide preferences
and all narrower viewport rules. No new card-size picker or storage migration.

## Developer tools and prospective PostHog — 2026-10-21

Continue from latest remote admin card sizes `c6e526e` on a fresh protected-prefix
branch, preserving all unmerged workspace/admin history. Reuse Playwright 1.55.1
and the isolated configuration, rather than adding a competing test setup or
upgrading unrelated packages. Install only Vercel's framework-neutral web design
guidelines skill; React/Next.js-specific skills do not fit this app.

Keep PostHog separate from existing first-party connected/renter telemetry and its
consent. No existing notice authorizes a new recipient. Prefer a pinned local SDK
bundle over a remote CDN and an explicit, development-only manual event over
automatic product collection. Default config is off, production is hard-disabled,
and the synthetic server's API/CSP boundaries remain intact. Allowlist the complete
event envelope/properties after SDK enrichment. Reuse the existing safe CI workflow
for the privacy tests. Actual project token, region, retention, nonproduction
hosting and deliberate real event delivery remain unverified until provided and
separately authorized. No new customer consent UI or production activation here.
