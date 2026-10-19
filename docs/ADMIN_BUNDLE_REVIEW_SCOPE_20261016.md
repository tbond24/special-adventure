# Vacancy thirteen-candidate compatibility review — scope

Continuation from clean `4f22d8098978c25306a2b218888407b81d3fe8f8` on `codex/vacancy-admin-continuation-20261015`. This is the next recorded compatibility/recovery gap after the completed Stage 4 development slice. Full admin remains PARTIAL; release and renter activation remain HOLD.

## Boundary recorded before changes

Only review documentation, a reusable SELECT-only catalog packet and sanitized metadata evidence may change. Inspect all thirteen ordered candidate migration sources, their current callers and the relevant production catalog through the existing authorized Supabase connector. No application code, migration, dependency or customer file changes are planned. Preserve historical six-file evidence and all previous acceptance records.

The packet may read relevant function definitions/security/search paths/effective ACLs, relation columns/constraints/indexes/RLS/policies/triggers, default/schema ACLs, migration names and database settings. It must not query customer/account/settings contents, invoke business RPCs, bootstrap, mutate SQL or collect credentials. Configuration adoption values will remain UNVERIFIED when catalog metadata alone cannot establish them. Backups and recovery readiness require actual provider evidence; documentation about available features does not prove a project checkpoint.

## Acceptance and recovery

Produce an object-level classification covering the original six candidates and the seven additions, exact source fingerprints, current dependency/drift evidence, cached-client and ordered-application implications, and concrete unresolved recovery/release prerequisites. Clearly distinguish genuine disposable results already recorded from checks executed in this review. If access fails, retain the bounded packet and report the specific access limit. No release approval is requested or implied.

Review additions can be reverted as a scoped documentation commit; this task changes no runtime or data. Private original conversations, mockup, execution brief and companion attachment package remain unavailable. Repository summaries and existing artifacts are evidence only for their recorded claims.

## Evidence-driven correction boundary

Source review found that the new `admin_renter_journeys` RPC checks `private.is_admin` only. The fixed capability contract in the handoff and foundation gives approved analytics reading to assigned Owner/Operator roles through `private.admin_can('analytics_read')`. An active unassigned AAL2 member would pass the narrower membership check. Existing reports retain their historical membership contract; only the new renter endpoint needs correction.

Extend this slice with one CLI-generated additive migration replacing that endpoint with the same signature, bounded query, settings and grants, changing only its server capability guard. Preserve all thirteen earlier migration files byte-for-byte. Add genuine disposable checks before Operator assignment, after Owner-mediated revocation using the same still-valid AAL2 token, and after regrant. Use `tests/full-stack/run-recovery.mjs` insertion anchors and `tests/full-stack/stage4-analytics.mjs`; the frozen original runner stays untouched. No frontend or policy/collection/retention changes are needed.

Acceptance requires real permission denial (`42501`, HTTP 401/403), assigned Owner/Operator success, revocation effective without token renewal, regrant recovery, complete existing isolated acceptance and cleanup. This will raise the reviewed bundle to fourteen candidates / 83 source migrations. Keep the source/live comparison at its exact original checkpoint and explicitly review the additive correction as a delta. Recovery keeps collection off and the capability guard intact; do not recover by restoring the weaker endpoint. Production SQL and roles remain untouched.
