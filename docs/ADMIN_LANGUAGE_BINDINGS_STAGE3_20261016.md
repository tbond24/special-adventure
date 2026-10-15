# Stage 3 — separate Create/Edit language-selector styling

Status: prepared for genuine disposable verification; production HOLD. Starting checkpoint 47015c2 has the verified 285-milestone icon slice.

Goal: register the existing language selector separately on Create and Edit in Design & Style, with private preview/draft, explicit Owner publication, audit, conflicts and recovery. This is styling, not translation or language-policy administration.

Choice: extend the existing registry/workspace and guarded appearance RPCs. Separate site settings or a second editor would duplicate working permission/publication behavior.

Boundary:
- CLI-created tenth candidate migration 20261015202947_admin_listing_language_style_bindings.sql, not applied hosted.
- Fixed keys listing-create/language-selector and listing-edit/language-selector, selectors bound to the actual host data-mode and picker. Compiled defaults remain until publication.
- Preserve the existing four languages, translations, local preference key and customer change handler. No default-language policy, content, visibility or customer data editing.
- Reuse existing bounded style rules; language-only widths auto/160/200/240px and four 0–24px padding values. Save-button rules remain unchanged.
- All/mobile/desktop style scopes remain separate from the preview viewport. Small-screen selector width is bounded to its container.
- The actual picker factory serves both customer forms and a script-disabled component preview. The preview is explicitly labelled as a component view, with surrounding form fields excluded. Do not claim a complete private form preview.
- Extend registry selection with stale-response protection and existing Save/Discard/Stay safeguards. Existing public Save preview/rendering remains.
- Reuse per-actor drafts, active membership/genuine AAL2 roles, idempotent Owner publication, atomic audit and immutable history. Initial compiled baseline is revision zero.
- Public appearance RPC exposes only published rows for the three style bindings; other shared/private keys remain excluded. Old clients select the Save key and remain compatible.
- No new dependencies, polling, production SQL, deployment, merge, real role grant or charity pause.

Acceptance: full disposable regressions plus genuine role/direct denial, malformed field/bounds, independent drafts/keys/scopes, audit rollback, stale versions and lost publication response. Exercise actual Create/Edit controls, local language choice and customer data preservation. Check selection/dirty navigation, component preview isolation, public propagation, initial/history restore, desktop/mobile and existing Save behavior. Run local security advisors and compare catalog metadata. No fabricated JWTs.

Recovery: revert unpublished source, or restore baseline/history into a reviewed private draft and new publication. Keep history/audit. Production release and project-specific recovery remain separate approvals.

Initial read-only reconciliation: local/remote head 47015c2d78d77cee9b3448d2721788e04bb06af8; live public/private catalog MD5 f6eb8aa60b5fb1c72004674939765b8c, 69 migrations and no candidate applied. getvacancy.site remains READY at dpl_558VydjBz3tjnsNok5wgGQsoKZRz / source 1a03a32592892a05ee0bdebbc33b75e409d7392e. Production/Charity ACTIVE_HEALTHY; hosted test INACTIVE; latest Vercel project deployment remains the old lab. Current official Supabase function guidance and changelog were checked.
