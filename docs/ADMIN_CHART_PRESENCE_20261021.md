# Admin charts, navigation and active presence

Branch: `codespaces/admin-graphs-presence-20261021`, continuing the preserved
published admin branch. Open drafts and reconciliation base audited; no merge.

## Behavior

Reusable card charts use blue selected-period lines and a lighter dashed previous
period, grey horizontal count grid, local-time ticks, no plot enclosure, and a
small legend. Bucket values span intervals; future selected-period time is blank.
Visitor cards retain visits/unique and repeat registered/non-registered series.
Previous-period graphs show the full preceding period; percentages compare the
same elapsed portion. A zero baseline is “New”, or 0% when both counts are zero.
Counts are not smoothed into fractional or negative visitors.

Overview heading/divider removed. Right-aligned Last refreshed label and icon
refresh data without navigating/reloading. Add card has a thin border; pointer
focus has no orange ring and keyboard focus remains visible in neutral grey.
Five desktop columns, unique choices, removal, ordering and saved layouts remain.

Navigation records completed renders, ignores superseded renders and records
Create before the initial Location event. Later steps retain previous event links.
The curated production builder now includes this corrected collector plus its
bounded queue; it no longer silently restores the old initial-load-only tracker.

## Exclusion and presence

Opening admin or verifying admin membership marks the browser excluded in local
storage, persisting through sign-out. Admin browser exclusion is shown locked.
Telemetry waits for membership verification for authenticated sessions, fails
closed on verification failure, and drops an account change during that check.
Presence writes also reject admin membership server-side regardless of MFA level;
aggregate reads exclude admin accounts. New card series exclude admin-created
accounts, messages/media, admin-owned listings and conversations involving admins.
Unidentified historical logged-out activity cannot be retroactively attributed.

Presence uses one private latest-state row per browser/tab, server timestamps,
30-second best-effort updates, visible pages and user interaction within 60 seconds.
Hidden/idle/closing pages send an inactive update. Lost updates expire after 45
seconds; this is bounded presence, not a guarantee of instantaneous disconnect.
Repeated same-page writes are rate limited per tab. Expired rows are excluded from
reads immediately and up to 100 old rows are physically cleaned on subsequent
writes. No new analytics history, full URL, form content, text, coordinates or
service key is sent. Presence is separate from visit/stat counts. As with existing
first-party browser analytics, this is client-reported activity, not bot-proof proof
of a person. Admin reads require the existing verified admin guard and return only
aggregate counts. Private table has RLS and no browser table grants.

Map checks presence every 10 seconds only while visible, clears stale/failing
responses, and expires pulse snapshots locally within 10 seconds. Historical node
counts never trigger pulses. Focused centre pulses only for that focused page.
Reduced-motion preference disables pulse animation while retaining active styling.

## Activation and rollback

Only `20261021081508_admin_chart_presence.sql` is the new scoped candidate. Do not
replay pending historical migrations. No Auth, role, membership, email, domain or
customer data changes are part of schema installation. Preserve current deployment
`dpl_BKoctvt9tPJRxMrDPeCp2AZW4Kkh` and older rollback checkpoints. Frontend rollback
can leave private presence state/functions inert; do not delete unrelated data.

Verification and publication outcome are recorded in STATUS.md when completed.

## Published acceptance

Published source `cd61eee` in production `dpl_CcL6DQj3S66x5EudxKPhM81pEwju`
(`vacancy-9y9wnw8va-tbond24s-projects.vercel.app`), READY; `getvacancy.site`
explicitly assigned after production hash/sign-in checks. Preserved rollback
`dpl_BKoctvt9tPJRxMrDPeCp2AZW4Kkh`. Prior preview
`dpl_9hNcErHywBuTtrYwuZSb8jpbqLJe` verified the chart composition; the final
chooser guard was checked separately (12 browser checks) before public alias move.
The intermediate production build `dpl_4FBRnhLQyhBZirnevvfGYnKEugJo` is preserved;
it was not assigned the custom live domain. Exact final 118-file manifest is
ADMIN_CHART_PRESENCE_RELEASE_MANIFEST_20261021.json.

Production migration receipt: `admin_chart_presence_20261021`, applied only the new
scoped file, no historical migrations. Native Auth users 21/admin memberships 2
and existing admin guard hash `20b4d0d920e36a5a83bcc395e7f71f32` unchanged.
Anonymous report EXECUTE and authenticated private table SELECT both denied.
Provider advisor notices on the new objects were reviewed: private RLS with no
policy intentionally denies browser access; SECURITY DEFINER execution is the
explicit delegation for the anonymous bounded collector and guarded aggregate
reports, with empty search paths, fixed enum/table allowlists and revoked PUBLIC
execution. They are not represented as a clean advisory scan. References:
[private deny policy notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
[anonymous execution notice](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
[authenticated execution notice](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

PASS: workspace 72 tests/16 intentional skips; disposable presence/report SQL;
final production composition; subsequent 14 presence/navigation browser checks
and 12 chooser-order checks after the final two scoped fixes. Fifteen changed
non-HTML live asset hashes match the exact final manifest. Native admin entry
requires sign-in, with no page errors or telemetry in the excluded test browser.

PASS: bounded actual live UI runs used a fresh unauthenticated browser, selected
Studio/New property, resolved Nairobi through the normal location UI, continued
to Details and then Review with three temporary local test images and a rent.
All non-analytics writes were blocked; none were attempted. No Auth accounts,
listings, uploaded media or publication were created. Canonical collection 200,
presence 204; zero page errors. Actual report edges observed Find→Create,
Create→Location, Location→Details and Details→Review. Traffic report includes
fresh visits. Aggregate counts include other activity and are not asserted to be
exclusively test visits. No test visitor UUIDs/customer records are committed.

PASS: actual live presence read showed one active Find browser while the bounded
test browser was open. After closure, that test browser's active count was zero.
This verifies collector→private state→guarded aggregate; CSS pulse binding and
local expiry/failure handling were verified separately in isolated browsers.
Genuine owner login/MFA and visual rendering inside the owner's live authenticated
admin session remain UNVERIFIED; no sessions or credentials were exported.
