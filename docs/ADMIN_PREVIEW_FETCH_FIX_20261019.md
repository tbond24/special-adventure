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

Recovery: revert this scoped frontend/test checkpoint after reviewing later
changes. No database or account rollback is needed.
