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
