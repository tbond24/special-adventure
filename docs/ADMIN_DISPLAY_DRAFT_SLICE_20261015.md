# Stage 3 — service-icon display publication slice

15 October 2026 (Australia/Perth). **Development only; production release HOLD.** Follows the recovered activity-log dependency acceptance. Original editor, customer data and prior commits remain.

## Scope before implementation

Migrate the existing **card-services** switch, which controls optional service-icon pills on listing result cards, from immediate mutation to private draft → diff/review → deliberate Owner publication → public confirmation → history/restore. Reuse the already-tested appearance draft/revision/audit RPCs and tables. Keep this a shared presentation setting across cards and viewports, distinct from page-specific Save-button overrides. No public component is invented.

Only this switch is included. Other existing listing-detail display toggles, icon artwork/catalogue and favicon paths remain functional and explicitly unfinished Stage 3 work. No change to price, contact, consent/security/validation information, customer records, listing creation/edit drafts, language bindings, analytics ingestion or framework.

Files/contracts:

- One CLI-generated additive candidate migration: allow `listing-display/card-services` alongside the existing Save-button key; extend the bounded validator for `{all:{enabled:boolean}}` (or explicit code defaults `{}`); adopt the current legacy enabled value at revision 0 without changing public display or fabricating a historical publication; publish to the existing display table in the same transaction as current/revision/audit; expose only published public config; reject the old immediate RPC for this slot while preserving its other slots.
- `app/src/admin-display-draft.js`: component mounted in the existing Appearance → Listing display panel. Real server state, private saves, review/reason, Owner-only publish/restore, bounded history, optimistic conflicts, acknowledgement/propagation distinction, unsaved Save/Discard/Stay and cleanup on route/account/unmount.
- `app/src/listing-display-options.js`: bind only the existing card-services row to this component. Keep public renderer/resolver and other controls.
- `app/src/backend.js`: explicitly anonymous fresh reads for publication confirmation through existing public contracts; no caller credential in preview.
- `app/index.html`: asset cache version only. Existing styles reused; small component-scoped CSS only if necessary for the current panel.
- `tests/admin-display-draft.spec.js`: local synthetic UI success/Operator denial, save failure, conflicts, restore, propagation failure, dirty navigation, stale account responses, mobile reachability.
- `tests/full-stack/display-draft.mjs`, safety tests and the reviewed wrapper: genuine disposable Owner/Operator/Auth, private draft/public separation, invalid config/scope/key denial, direct legacy bypass denial, idempotency/conflicts, atomic public projection rollback on audit failure, new history-preserving restore, existing other display-slot compatibility and actual anonymous card rendering.

Acceptance: meaningful local browser/safety tests, then complete disposable source replay and existing admin/customer/recovery regressions plus this real workflow. Preserve the pinned original runner/hash and existing clean-stack guard/cleanup. Do not weaken failed checks or label a synthetic backend as genuine integration.

Additional adoption acceptance, scoped before editing its workflow: extend the existing ephemeral PostgreSQL QA workflow with `tests/sql/card_services_legacy_fixture.sql`, the generated migration and `tests/sql/admin_card_services_test.sql`. Seed the legacy display value **false** before applying the actual migration, proving adoption preserves existing visibility without a publication/audit. Keep this simulated-claims SQL check distinct from the full-stack genuine Auth/browser run. No hosted secret, project or deployment is used.

Recovery: revert the scoped development frontend/test commit after reviewing subsequent changes. Any applied isolated SQL is destroyed with its disposable stack. Future live publication is recovered through a new audited revision, not table/history deletion. This migration expands the candidate release review beyond the original six; it does not approve applying seven migrations to production.

The initial activity dependency CI attempt passed 75-migration replay, log schema/trigger/rollback checks, but its empty-object PATCH denial assertion encountered PostgREST's no-op response. The test now uses valid nonempty mutations against an existing synthetic row and checks the full log fingerprint; the corrected run is pending. This does not authorize a grant change.
