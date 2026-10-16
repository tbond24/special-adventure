# Stage 4 - guarded existing analytics ingestion

Status: implementation and genuine isolated acceptance in progress; production HOLD.
Starting checkpoint: a9c6303d6a80cd93d8ca1566cc0d459fbe77a87a (296 integration milestones).

Goal: close direct analytics table writes while preserving the four existing tracking RPC signatures and actual old/new collectors and reports. Revoking INSERT alone breaks their current invoker inserts. Use small public invoker wrappers and a private, validated privileged gateway; private raw writers preserve original columns, event-ID deduplication and version-2 linkage.

Boundary: candidate migration 20261016083232_analytics_guarded_ingestion.sql only; existing analytics_events table, no new fields/event classes/customer collection/retention/purge. Revoke browser table writes and sequence privileges, retain protected admin reads. Gate known event/field/type/batch bounds, trusted current actor, public/owned vacancy references, bounded safe route categories and self-reported acquisition labels. Exclude current administrators and suspended/banned actors from newly ingested traffic. Do not rewrite old data or call client event claims authoritative business outcomes.

Use transaction try-lock and existing created_at index for short global and actor/anonymous budgets. Reject busy/over-budget requests with HTTP429, keep best-effort collectors bounded and capped at three retries. Global 1,200 and actor/shared-anonymous 240 events/minute are conservative pilot limits, not measured hosted capacity. Event-ID retries deduplicate; legacy unkeyed tracking cannot promise exactly-once delivery. Anonymous identifiers remain self-reported.

Files: migration; two existing collectors and index cache keys; targeted unit/failure/concurrency tests; genuine disposable extension through run-recovery.mjs, without editing/removing original runner guard. Verify real RPC/table permissions, batch atomicity, privacy fields, dedup/rate races, current actor changes, customer actions, cached deployed frontend and current reporting. Run full regressions/advisors, inspect retained safe screenshots and compare catalog metadata.

Recovery: source revert before release; keep existing analytics rows. A separately reviewed rollback would restore old invoker definitions/INSERT grants only if truly needed; a frontend-only rollback uses unchanged RPC ABI. No production operations authorized.

Remaining Stage 4: explicit privacy/notices and raw-analytics retention before new renter collection; bot/test coverage and ingestion-attempt accounting; bounded renter funnel, trusted outcomes and recent-activity aggregate/report lifecycle. The existing 12-month admin audit target does not choose analytics retention.
