# Stage 4 - guarded existing analytics ingestion

Status: PASS for guarded existing ingestion; wider Stage 4 PARTIAL; production HOLD.
Starting checkpoint: a9c6303d6a80cd93d8ca1566cc0d459fbe77a87a (296 integration milestones).

Goal: close direct analytics table writes while preserving the four existing tracking RPC signatures and actual old/new collectors and reports. Revoking INSERT alone breaks their current invoker inserts. Use small public invoker wrappers and a private, validated privileged gateway; private raw writers preserve original columns, event-ID deduplication and version-2 linkage.

Boundary: candidate migration 20261016083232_analytics_guarded_ingestion.sql only; existing analytics_events table, no new fields/event classes/customer collection/retention/purge. Revoke browser table writes and sequence privileges, retain protected admin reads. Gate known event/field/type/batch bounds, trusted current actor, public/owned vacancy references, bounded safe route categories and self-reported acquisition labels. Exclude current administrators and suspended/banned actors from newly ingested traffic. Do not rewrite old data or call client event claims authoritative business outcomes.

Use transaction try-lock and existing created_at index for short global and actor/anonymous budgets. Reject busy/over-budget requests with HTTP429, keep best-effort collectors bounded and capped at three retries. Global 1,200 and actor/shared-anonymous 240 events/minute are conservative pilot limits, not measured hosted capacity. Event-ID retries deduplicate; legacy unkeyed tracking cannot promise exactly-once delivery. Anonymous identifiers remain self-reported.

Files: migration; two existing collectors and index cache keys; targeted unit/failure/concurrency tests; genuine disposable extension through run-recovery.mjs, without editing/removing original runner guard. Verify real RPC/table permissions, batch atomicity, privacy fields, dedup/rate races, current actor changes, customer actions, cached deployed frontend and current reporting. Run full regressions/advisors, inspect retained safe screenshots and compare catalog metadata.

Recovery: source revert before release; keep existing analytics rows. A separately reviewed rollback would restore old invoker definitions/INSERT grants only if truly needed; a frontend-only rollback uses unchanged RPC ABI. No production operations authorized.

Remaining Stage 4: explicit privacy/notices and raw-analytics retention before new renter collection; bot/test coverage and ingestion-attempt accounting; bounded renter funnel, trusted outcomes and recent-activity aggregate/report lifecycle. The existing 12-month admin audit target does not choose analytics retention.

## Verified result

Source **2be95d2e069c9fec6791a591b21cb707ce6553b9** passed [run 38878011456](https://github.com/tbond24/special-adventure/actions/runs/38878011456): **306 integration milestones + 17 unit tests**, all **80 migrations** and complete disposable cleanup. The original full runner retains blob guard 894fdf9a7cfab4386e71a9f44acf2f9acbedccf1. The extension runs after prior editor/language checks. All earlier genuine Auth/TOTP, role/access, audit, publication/restore, customer Create/Edit/photos, enquiries/Saved and password-recovery paths remain covered.

Artifact **12036611596**, **1,827,976 bytes**, SHA256 **fba87fd21f0282ca643f91093f392ac48223426bd0a6da95e0fe0da33870a066**. Independent download hash/size match GitHub. All 80 source hashes match the tested Git commit. The same four documented historical-account/display/favicon/icon replay adaptations remain; the new analytics migration replays unchanged. Local security advisors return zero findings. [Machine evidence](./evidence/admin-analytics-ingestion-20261016.json) records metadata and historical failures.

| Acceptance | Demonstrated |
| --- | --- |
| Direct table bypass | Anonymous, genuine customer AAL1, Owner/Operator/nonadmin/suspended AAL2: 18 REST INSERT/PATCH/DELETE denials with no effects |
| Privileged surface | Browser sequence, TRUNCATE and TRIGGER privileges removed; private gateway absent from public RPC |
| Compatible RPCs | Anonymous/customer v1 and v2 inserts; server-derived actor and version; duplicate event IDs add zero rows and preserve first write; basic/open ABI retained |
| Validation/atomicity | Unknown fields/events, invalid types/IDs/timings, oversized batches and invalid second items fail without changing the table snapshot |
| Privacy normalization | Categorical routes/landing paths; no query/fragment credentials or full referrer URL; email/URL-like acquisition labels discarded; valid campaign label preserved |
| Current identity | Admin/suspended events excluded; one genuine JWT observes suspend/restore immediately; customer raw reads remain empty and active AAL2 admin reads work |
| Actual browsers | Current signed-in customer and pinned deployed guest Create pages send accepted v2 events through real RPCs and retain their visible language controls |
| Contention | Genuinely held transaction lock produces HTTP429 and no table effects |
| Budgets/races | Real concurrent requests admit exactly one final event at account 240/minute and global 1,200/minute; whole over-budget batches roll back; event-ID retry adds zero at quota |
| Collectors | Actual v1/v2 scripts: 100 queued + at most 20 in flight; <=20 events / <30 KB per batch; three attempts, backoff, oversize recovery, no in-flight acknowledgement discarding unsent events |
| Product isolation | Blocked storage/failed analytics preserve original product results/errors in unit checks; full genuine customer product flows still pass |
| Existing reports | Actual protected connected/legacy RPCs and Marketing screen still render; report reads do not write events |

Both currently loaded and pinned deployed frontends use the v2 collector. The historical v1 script is covered by its actual-code unit tests and genuine v1 RPC checks; it was not newly added to the current page. No duplicate collector is installed.

Screenshot review: the existing desktop Marketing report renders recorded sessions separately from creation journeys, keeps linkage unknown explicit and leaves the publication rate unavailable. All counts/screenshots are disposable synthetic evidence, not production business metrics. The three-binding Design workspace was inspected and retained. This is existing reporting compatibility, not a newly completed renter funnel or final visual approval.

## Exact schema boundary

Compared with the prior language candidate: private functions +5 (117 -> 122), policies -2 (98 -> 96), with only analytics_insert_anon/auth removed. Existing analytics table grants narrow to authenticated SELECT; protected admin-read RLS remains. Four public tracking bodies change; track_event also gets empty search_path and explicit execution grants, track_listing_open changes implementation language to PL/pgSQL. Parameter names/types/defaults and return contracts remain unchanged.

No other relation, column, index, trigger, constraint or function changes: 33 relations, 289 columns, 80 indexes, 16 noninternal triggers, 145 constraints. Two raw private writer bodies exactly preserve the original normalized insert/dedup logic, and have no browser EXECUTE. The private gateway alone grants narrow anon/authenticated execution for invoker wrappers; every privileged helper uses empty search_path. Existing private-schema USAGE is retained, not expanded.

Sequence grants are explicitly tested as closed. Global-budget rejection precedes actor-count scanning, bounding that scan to a non-saturated recent window; the existing created_at and event-ID indexes remain available. No new infrastructure, table, column, dependency, report destination or visitor class is introduced.

**Eleven** candidate migrations now await separate release approval: the ten listed through [language bindings](./ADMIN_LANGUAGE_BINDINGS_STAGE3_20261016.md), followed by **20261016083232_analytics_guarded_ingestion.sql**. The recovered historical activity migration is already recorded live; never blanket-replay source history in production.

## Live reconciliation, limits and next work

Final read-only observation **2026-10-16 09:12:33 UTC**: production catalog MD5 f6eb8aa60b5fb1c72004674939765b8c, 69 recorded migrations, zero candidate timestamps applied. getvacancy.site remains READY at dpl_558VydjBz3tjnsNok5wgGQsoKZRz, source 1a03a32592892a05ee0bdebbc33b75e409d7392e. The latest Vercel project deployment remains the previous lab dpl_6FMUHmBws5eT5HriaRtmEmS9cFXm. Production/Charity ACTIVE_HEALTHY; hosted admin test INACTIVE. No production deployment/SQL/role assignment, merge, customer mutation, purge or charity pause occurred.

This candidate limits accepted persisted events, not invalid-request CPU or hosted capacity/cost. Pilot constants require hosted workload review before release. Transaction contention may reject best-effort events; legacy unkeyed basic/open RPCs cannot provide exactly-once acknowledgement. Identifiers/acquisition remain self-reported. No complete funnel rate, exact people-online claim, bot/test exclusion completeness or new collection coverage is asserted.

The initial SQL CASE syntax failure was corrected. Two subsequent test-harness errors were corrected to check the visible Create chooser and own the isolated deployed server lifecycle. Neither test-harness correction changed product behavior or weakened the original runner guard or permission/race assertions. All failed stacks were removed and their sanitized evidence remains historical.

Next: settle raw-analytics retention and notices/privacy basis before new renter collection; implement the minimal prospective renter funnel and authoritative outcomes, explicit exclusions/coverage, and the shared bounded recent-activity/report lifecycle. The 12-month admin audit target is separate. The user preference question remains pending; no retention default, purge or production collection was enabled.

Remaining agreed editor coverage, stable mobile shell/header/native zoom, external inbox/hosted load, approved project-specific backup/recovery and separate live SQL/Owner/frontend/Edge approvals remain release gates. **Release HOLD.**
