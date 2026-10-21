# Traffic cards: live connection candidate

Status: prepared; NOT installed or deployed. Codespaces remains isolated synthetic.

## Reviewed scope

First card counts visits (distinct browser/session pairs) and unique browser IDs
in the same local hourly/daily intervals. Period headline deduplicates across
intervals. Repeat means at least two sessions observed within the selected period;
registered means a currently linked non-anonymous Auth account. Logged-out owners
cannot be recognized. Deleted/missing accounts remain explicitly unknown.
These are browser estimates, not counts of people. Only connected-journey v2
records are used, avoiding duplicate namespaces from older instrumentation.

New migration: `20261021150000_admin_traffic_metrics.sql`, one aggregate-only,
admin/MFA guarded read function plus one partial covering index. No collector,
Auth, retention, role membership or visitor-record mutation. Grants allow only
existing authenticated admins through the existing private.is_admin guard.

Before hosted activation, obtain scoped approval for the report/index installation
and a protected admin deployment. Preserve the current deployment and rollback
reference; test the SQL in the disposable hosted integration environment first.
Inspect the actual is_admin/MFA definition and an indexed query plan before
production use. Do not apply all pending historical migrations as a shortcut.
For other existing cards, audit dependencies separately: the local-day and exact
comparison reports are also currently absent. This migration alone enables only
the two traffic cards. Custom element collection stays off.

Keep Codespaces CSP/API protections intact. Do not pull privileged Vercel preview
variables or deploy raw repository source to the live project. Package and review
the protected admin artifact separately, with explicit backend identity checks.
Validate anonymous/non-admin/MFA rejection, valid authenticated aggregate reads,
local timezone/DST windows, zero results, stale source timestamp, and shared card
refresh in the hosted environment. Rollback removes the new function/index and
restores the preserved protected deployment; never delete analytics history.

## Read-only production audit

On 21 October 2026, a bounded rolling 30-day aggregate of existing canonical v2
activity, excluding admin users, returned 231 sessions, 131 unique browser IDs,
and 15 repeating browsers (3 registered, 12 non-registered, 0 unknown).
Latest recorded canonical activity: 20 October 2026 12:05:19.879692 UTC.
The rolling audit is not the UI's local calendar period. No raw visitor records
were exported and none of these live totals were copied into synthetic fixtures.
The new traffic, local-day, comparison and element-report functions are absent
from the live database. Fresh collection and live UI connection remain unverified.
