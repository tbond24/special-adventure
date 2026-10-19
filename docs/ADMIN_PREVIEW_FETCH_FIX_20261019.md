# Protected test-lab composed preview repair

The human walkthrough found a saved Edit-language draft with an unavailable
composed preview and disabled Review & publish. A saved draft alone cannot pass
the existing publication gate: its validated preview must also be available.

The composed-preview fetch explicitly omitted credentials, including the
same-origin hosting access cookie required by the protected lab. A loopback
browser regression requiring a synthetic HttpOnly cookie reproduced the failure
before the repair. The fetch now uses `credentials: 'same-origin'`. The editor
module cache reference is refreshed. No Supabase account token is added to the
static-file request; the fixed assets still contain only synthetic examples.
This refines the earlier anonymous-asset wording for hosting protection, without
introducing an application login requirement for the public static assets.

The new browser case checks both Create and Edit: the protected composed asset
loads, a Desktop-only 200px width saves privately, and Review & publish enables.
It also checks that no publication occurs. All eighteen focused desktop browser
cases in `admin-language-controls.spec.js` and `admin-editor-completion.spec.js`
pass, including the existing unavailable-preview publication denial. These are
local synthetic results, not a claim that the user's hosted draft was published.

Scope: frontend preview loading and regression coverage only. Preserve private
drafts, all validation/publication gates, inert preview sandbox, both original
branches, PR #2 and draft PR #3. No Auth/MFA/role/settings change, database write,
production deployment, purchase or backup investigation is part of this repair.
The backup investigation remains paused. Any hosted delivery is restricted to
the existing isolated test-lab project and must be verified separately.

## Isolated delivery

Source `4c0c2a16a452792d8f8afc886c180a3bd13395ae` is READY on existing lab project
`prj_gVMPc0rvkw2iLTqOCJQ5cVjGHJwS`, preview deployment
`dpl_8CpQAc6qUJmeheJXZMRRNmxCdpHo`:

https://vacancy-admin-recovery-lab-20261015-rm150imoj-tbond24s-projects.vercel.app/#admin

The existing guarded build adapter completed with 117 static files and the
listing-page function, substituting only the test backend and rejecting remaining
production backend references. The deployment is a preview (`target: null`).
No production promotion or domain change was performed. Existing hosting
protection is retained; no new share link, bypass or Auth callback setting was
created. The older immutable deployment URL continues to serve the older code.

The authenticated hosting API confirms READY and the exact source SHA. Its
source-file-tree endpoint returned 404 for this Git deployment; no delivered-file
hash or hosted browser/account acceptance is claimed from that endpoint. The
user must open the updated protected preview, sign in normally if prompted,
and confirm that their existing saved draft has a visible preview and enabled
review. Local browser acceptance above demonstrates the cookie boundary and
publication gate; it does not publish or modify the user's hosted draft.

PR #3 remains open and draft with auto-merge unset. PR #2 remains open and draft
at preserved continuation source `3411cc26630c8b2927023297af3aa82a75b0e1d8`;
the original feature branch remains `0a5d4d826277a60131e9a5e301bb9cff7633f722`.

Recovery: revert this scoped frontend/test checkpoint after reviewing later
changes. No database or account rollback is needed.
