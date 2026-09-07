# Stage 15 — launch operations dashboard

## Aim and acceptance

Give an authorised operator a concise view of what needs attention: expiring/stale vacancies, open reports, inventory status and core activity totals. Preserve the existing secured admin boundary and confirmed deactivation action. Avoid speculative analytics and paid monitoring.

## Options considered

| Rank | Option | Cost | Value | Complexity / risk |
| --- | --- | --- | --- | --- |
| 1 | Extend the existing admin RPC/data with a client-side attention queue and filters | Free | Immediate operational value from data already collected | Limited historical trends |
| 2 | Add new analytics tables and aggregation RPCs | Infrastructure only | Enables funnels and trends | Premature schema and privacy scope before traffic exists |
| 3 | Add a third-party admin/analytics platform | Paid | Rich dashboards | New vendor, data sharing and ongoing cost |

Option 1 is the smallest safe choice. Trend analytics should be added only when enough real traffic exists to make the measurements useful.

## Build

- Added a top-level Needs attention count combining listings that expire within 48 hours and open reports.
- Added users, active vacancies, open reports and messages totals.
- Added All, Needs attention, Active, Paused and Removed inventory filters with counts.
- Listing rows show unit type, locality, city, status and confirmation warning.
- Reports show reason, status, vacancy reference and date.
- Added manual refresh.
- Deactivation retains a confirmation prompt, disables the action during the request and reloads verified server data afterward.
- Expanded the existing admin listing query only with fields required for these operational views.

## Failure diagnosis and proof

The initial test selector matched the subtitle containing “needs attention” rather than the dedicated numeric card. Ranked fixes were: (1) target the card's stable class, (2) alter product copy to satisfy an imprecise test, or (3) remove the subtitle. Option 1 fixed the harness without changing product behavior or weakening assertions.

Desktop and mobile browser tests then passed 2/2. They proved the combined attention count, attention-only filtering, correct stale row, confirmation before deactivation, the exact vacancy ID sent to the admin action, server-data refresh, and the resulting Removed count.

Score: operational focus 10/10; moderation safety 9/10; clarity 9/10; mobile usability 9/10; cost 10/10; evidence 9/10. Stage score: **9.3/10 — PASS**.

## Operator priorities after launch

1. Resolve open reports and deactivate clearly unsafe or false listings.
2. Chase or expire vacancies in Needs attention so renters do not see stale supply.
3. Watch signup, active inventory, messages and enquiries for sudden drops during release checks.
4. Use Vercel/Supabase health and error logs when the product totals indicate a break.
5. Add funnel/trend analytics only after real volume can support meaningful decisions.

Production remains unchanged. Return to checkpoint commit `f2a7a13` to remove this stage.
