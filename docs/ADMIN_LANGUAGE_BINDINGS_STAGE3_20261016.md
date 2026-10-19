# Stage 3 — separate Create/Edit language-selector styling

**Historical feature-branch report preserved during PR #3 conflict resolution.** Its source, APIs, tests and counts describe that pinned branch, not the current canonical release. See the [current combined review packet](./ADMIN_FINAL_REVIEW_PACKET_20261019.md) and [reconciliation acceptance](./ADMIN_ANALYTICS_RECONCILIATION_ACCEPTANCE_20261017.md). Original: [feature source](https://github.com/tbond24/special-adventure/blob/0a5d4d826277a60131e9a5e301bb9cff7633f722/docs/ADMIN_LANGUAGE_BINDINGS_STAGE3_20261016.md).

Status: verified bounded functional integration; final visual acceptance PARTIAL; production HOLD. Starting checkpoint 47015c2 has the verified 285-milestone icon slice.

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

## Verified result and provenance

Tested source **acb862d9bb56189a259ae097d9427c363a354866** passed [run 38805930487](https://github.com/tbond24/special-adventure/actions/runs/38805930487): **296 integration milestones, six unit tests, all 79 migration files, full disposable cleanup**. Auth users were provisioned with supported GoTrue Admin API confirmation using disposable credentials in memory, then password sign-in and real TOTP enrollment/challenge/verification produced genuine AAL2 sessions. No fabricated JWTs or production identities were used. The original full integration runner retains its pinned blob guard; language acceptance runs after the unchanged bounded Save-style performance checks.

The exact sanitized artifact is 12007070116, 1,691,513 bytes, SHA256 **38f735ad95c2682bc271b93135b312b608867384a5eb4dc39813e8d0698627ae**. Downloaded ZIP hash/size independently match GitHub; all 79 source hashes match the tested Git commit. The four documented replay adaptations remain historical-account omission plus display/favicon/icon synthetic fixtures; the new language migration replays unchanged. See [machine evidence](https://github.com/tbond24/special-adventure/blob/0a5d4d826277a60131e9a5e301bb9cff7633f722/docs/evidence/admin-language-bindings-20261016.json).

| Check | Observed result |
| --- | --- |
| Genuine denied actors | Anonymous, fresh AAL1 Owner, real AAL2 nonadmin and suspended users denied on both keys; 40 RPC denials |
| Operator and direct writes | Separate private Operator Create draft; Owner publish/restore restriction; 12 direct current/draft/history PATCH denials |
| Validation | 32 malformed or out-of-range language style snapshots rejected without state effects |
| Draft and audit | Per-user/per-form isolation; forced draft and publish audit failure rolls back all editor state |
| Navigation | Save, Stay, Discard and failed Save-and-leave retain the correct selected key and acknowledged draft |
| Publication | Actual committed-response loss retries the same request ID; exactly one revision/audit; changed retry payload and stale Operator base conflict |
| Stale reads | Delayed genuine Create response cannot replace the selected Edit fields |
| Actual public forms | Create desktop radius/width/padding and Edit mobile radius/width/padding render independently; opposite scopes retain compiled radius |
| Customer protection | All four choices and shared French local preference persist; full listing/room snapshot unchanged |
| Recovery | Create baseline restore; Edit baseline and positive-history restore; final separate compiled baselines C2/E4; no-op publish has no effects |
| Public/private boundary | Anonymous projection has only key/config/revision for published Save/Create/Edit styles; no shared-settings snapshots, actors or private drafts |
| Regressions | Existing Save, legacy-admin fail-closed paths, public listings, customer Create/Edit/photos and genuine password-recovery flows pass |
| Advisors | Local database security advisors return zero findings |

Fresh-page propagation is the contract tested here. Already-open tabs retain the existing cached published styles until reload; no polling was added. The first run failed because hash navigation reused that cache. The corrected genuine full run passed, then screenshot review prompted the bounded tree-highlight and badge-placement fixes. Final source above passed again. Historical failures remain recorded; no guard or assertion was weakened.

## Schema and live boundary

Compared with the nine-candidate icon checkpoint: functions 116 -> 117; the sole addition is private.validate_listing_language_style, invoker, empty search_path, no anon/authenticated EXECUTE. Four existing functions change body only: validator dispatcher, history, restore_draft and public projection. Three existing key-check constraints widen. All existing function signatures, ACLs and configuration remain identical. No item is removed; 33 relations, 289 columns, 80 indexes, 98 policies, 16 noninternal triggers and 145 constraints are retained.

The tenth candidate is **20261015202947_admin_listing_language_style_bindings.sql**, after the nine listed in [the icon review](https://github.com/tbond24/special-adventure/blob/0a5d4d826277a60131e9a5e301bb9cff7633f722/docs/ADMIN_ICON_LIBRARY_STAGE3_20261016.md). The recovered historical activity migration is already recorded live. Never blanket-push historical source migrations to production.

Final read-only reconciliation at **2026-10-15 21:02:58 UTC**: catalog MD5 f6eb8aa60b5fb1c72004674939765b8c, 69 live migrations, zero candidate timestamps applied. getvacancy.site remains READY at dpl_558VydjBz3tjnsNok5wgGQsoKZRz, source 1a03a32592892a05ee0bdebbc33b75e409d7392e; latest project deployment remains the previous lab dpl_6FMUHmBws5eT5HriaRtmEmS9cFXm. Production and charity ACTIVE_HEALTHY; hosted admin test INACTIVE. No production mutation, deploy, merge, role assignment, purge or charity pause occurred.

## Screenshot review and remaining gates

Final actual desktop screenshot confirms only Create is selected and the badge is clear of the actual component. Actual customer Create desktop and Edit mobile screenshots were inspected. Component previews remain scaled views of the real picker, not a complete private-form preview.

The admin mobile resize screenshot is **PARTIAL**: it catches the existing animated sidebar partway across the screen. The passing stacked-layout/no-document-overflow assertions do not establish settled visual acceptance. This was not independently reproduced against the prior checkpoint, so it is not labelled a proved baseline failure. Stable mobile shell acceptance, header wrapping, native 200% zoom and the remaining agreed inspector/coverage work remain explicit gates. Do not describe this slice as an all-pages editor or final visual approval.

Next independent development is bounded Stage 4 analytics/renter funnel work, preserving existing reports and honest coverage definitions. Wider visual acceptance, external inbox/hosted workload, approved backup/project-specific recovery, legal review of the already recorded working retention target and separate live SQL/Owner/frontend/Edge permissions remain release gates. Private Owner/Operator selections and the working 12-month target remain recorded; no new grant or purge is implied. **Release verdict: HOLD.**
