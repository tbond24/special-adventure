# Stage 30 — Final interface audit and icon recommendations

## Aim and acceptance

Verify every functional page at desktop, common-phone and narrow-phone widths in both dark and light themes. Acceptance requires no document or child overflow, no invisible or effectively same-colour interactive controls, and successful full regression. Keep recommended property-feature symbols documented but unapplied.

## Options and ranking

1. Automated route/theme/viewport audit plus visual review — repeatable evidence with low product risk. **Rank 1.**
2. Screenshot-only review — visually useful but weak for hidden overflow and every route. **Rank 2.**
3. Rewrite into a new component system before auditing — high risk and unrelated to acceptance. **Rank 3.**

Option 1 is the smallest safe approach.

## Property symbol set — recommendation only

Use the same 2px rounded SVG language as navigation when these are introduced:

- Unit/bedroom: bed outline.
- Occupancy: two-person outline.
- Ensuite: shower head with droplets.
- Furnished: armchair.
- Parking: car front.
- Pets considered: paw.
- Water: droplet.
- Electricity: lightning bolt.
- Security: shield with check.
- Internet: Wi-Fi arcs.
- Available date: calendar with check.
- Bills included: receipt with check.
- Smoking rule: cigarette with a diagonal slash when prohibited.

Icons should always retain a short text label in detail and filter contexts. They are not applied in this stage, matching the product decision to validate the information hierarchy first.

## Admin organisation decision

The current MVP admin dashboard already covers the essential operational loop: user/message totals, active and expiring listings, reports, status filters, refresh, and confirmed deactivation. The next highest-value additions after real usage are email-delivery failures, unresolved-report age, and listing creation/enquiry conversion. Role complexity, automated scoring and advanced analytics remain deferred until evidence justifies them.
