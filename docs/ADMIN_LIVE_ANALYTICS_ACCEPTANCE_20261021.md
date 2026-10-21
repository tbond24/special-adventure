# Live analytics connection — 21 October 2026

User scope: connect the journey map and reusable stats cards to live data, following
confirmation that earlier development had not modified the live deployment/database.
This authorizes the reporting connection, not a general production frontend release.

## Changes actually made

Installed `20261021170000_live_analytics_reports.sql` on production
`xtutkwiivqkgkqjpkxvj` through the provider migration tool. This self-contained
activation bundle creates four previously absent reports and one partial index:
`admin_daily_metrics_local`, `admin_metric_comparison`, `admin_traffic_metrics`,
`admin_journey_map`, and `analytics_events_v2_session_time`. Earlier candidate
migrations were NOT individually replayed. Do not run the entire pending migration
history against production. Daily history now supports the 180 days requested by
the existing cards; reports have query deadlines and use the existing admin/MFA
guard. No collector, Auth setting, user, membership, source row or retention change.

The bundle was first installed in the existing isolated test database, verified
against its current records and existing guard, then removed with a narrowly
scoped cleanup migration. Original test counts were restored unchanged: Auth 4,
admin memberships 1, analytics 118, max event ID 124; guard hash unchanged and all
four new reports absent afterward. Provider install/cleanup receipts are retained.
No fixture accounts, email, test window controller, archives or roles were changed.

Public Vercel deployment remains `dpl_558VydjBz3tjnsNok5wgGQsoKZRz` at
`1a03a32592892a05ee0bdebbc33b75e409d7392e` before and after. No deployment,
production alias/domain, Vercel environment variable or protected lab changed.
Production Auth count 21, memberships 2 and analytics count 31,528 remained
unchanged across the reporting installation; existing guard hash unchanged.

## Viewer boundary

`scripts/live-analytics-server.mjs` serves a separate admin-only dashboard origin on
port 8780 with explicit `--live-production` opt-in. The default synthetic preview
on 8776 keeps its existing API denial, sanitization and external-connection CSP.
The live viewer serves only an exact static asset allowlist, denies API proxying
and non-GET/HEAD requests, uses no-store, and allows connections only to the fixed
production Supabase origin. It contains no synthetic report fallback. It has no
collector or product write controls; only supported traffic/service metrics appear.

Uses existing password sign-in and verified TOTP, active admin membership and the
server report guard. No account or MFA setup is performed. Google-only accounts
without an existing password cannot use this first viewer sign-in form; do not
paste tokens into chat or copy sessions to bypass that boundary. Credentials go
directly to Supabase; sessions are isolated in sessionStorage under a dedicated
key. Sign-out scope is local to this viewer session. Report authorization failures
clear charts. No credentials are logged, exported or stored in the workspace.

Start manually: `bash .devcontainer/start-live-analytics.sh`. Keep port 8780 Private.
It is deliberately not started by normal Codespaces lifecycle hooks. The helper
uses a separate lock, readiness header and detached process, preserving unrelated
servers. Stop its exact Node process when this optional viewer is no longer needed.
The devcontainer includes the private viewer's explicit forward-port label.

## Evidence and remaining limits

PASS: disposable bundle installation and 180-day histories for all five service
metrics. PASS: hosted test SQL reports, AAL1/non-admin rejection and anonymous
privileges. PASS: installed production reports executed against existing source
with the authenticated SQL role and transaction-local existing-admin AAL2 claims;
this validates SQL authorization, not genuine browser credentials. AAL1 and
non-admin SQL calls rejected; actual anonymous HTTP calls to all four endpoints
returned 401. Source range query uses the new index (representative execution
1.155 ms); this is not a capacity or end-to-end latency benchmark.

Actual Last 30 days on the Perth calendar: 231 visits, 131 unique browser IDs,
15 repeat browsers (3 registered, 12 non-registered). Journey report: 131 browsers,
10 grouped nodes, 23 observed edges. Latest canonical event: 20 October 2026,
8:05 pm Australia/Perth. No visitor IDs or source row exports were returned.

Browser verification uses explicitly synthetic intercepted Auth/report responses,
with the real client adapter: no report reads before MFA; both reusable modules
render; revoked sessions clear; sign-out is local; production write methods are
not exposed. Live browser login remains for the owner to complete using their own
credentials. No production test accounts or real-user credentials were requested.

Historical path coverage is partial. The public site's existing v2 collector is
unchanged; additional SPA render-completion tracking remains development source.
The map shows only already recorded transitions/linked creation steps. It does
not prove current presence or abandonment. Optional contact/text collection is
still off and intentionally unavailable in this viewer. The analytics speed-test
switch on the synthetic development origin does not change the public site's
browser preference; deploying that feature needs a separate frontend release.

Rollback: stop the viewer and review a scoped migration removing only these four
new reports and the named index, after checking no new dependencies were added.
Never delete analytics records or alter the unchanged public deployment. Restore
no Auth settings because none were changed.
