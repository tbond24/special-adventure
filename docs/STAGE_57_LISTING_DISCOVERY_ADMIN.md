# Stage 57 — listing lifecycle, discovery stability and admin activity

## 1. Archived property lifecycle

**Aim:** A property must not remain in the Add Unit chooser when all its listings are archived or removed. A multi-unit property remains reusable while at least one unit is active, paused or filled.

**Options ranked:** (1) derive chooser eligibility from owned vacancy states; (2) delete the parent property when its final vacancy is archived; (3) hide stale rows with CSS. Option 1 is smallest and reversible. Option 2 could destroy shared property data, while option 3 leaves incorrect data in the interaction model.

**Result:** The chooser joins the existing property list to owned vacancy status before rendering. Archived records remain available in the management history and can be restored, but their otherwise-empty parent is absent from New Property.

## 2. Enquiry delivery

**Aim:** Enquire must create a private conversation visible to both the visitor and the listing owner.

**Options ranked:** (1) retain the current member-based inbox; (2) create a separate lead mailbox; (3) expose lister email/phone. Option 1 avoids duplicate state and protects contact details.

**Runtime proof:** A genuine temporary visitor sent an enquiry for active vacancy `cccccccc-cccc-4ccc-8ccc-ccccccccccc1`. Conversation `eeea86b6-ddea-471d-820a-ab827b1dd12a` contained one message and membership checks returned `lister_in_inbox=true` and `visitor_in_inbox=true`. The conversation and temporary Auth identity were deleted, and both removals were verified.

## 3. Stable Find controls and card rules

**Aim:** Result count growth must not move Filters or the view control. Search text must not collide with its arrow. Images must not expose loose space while swiping.

**Options ranked:** (1) fixed three-column toolbar, truncation and fixed media ratios; (2) dynamically shrink every control; (3) allow wrapping. Option 1 gives stable positions and predictable touch targets.

**Rules:**

- Search this area uses white 14px text.
- Mobile placeholder is 12px, one pixel larger; typed text remains 16px to prevent iPhone focus zoom.
- The search field reserves 42px for its internal arrow.
- The result count truncates inside a flexible first column; Filters and the 44px view control remain fixed.
- Tile images use a 4:3 frame, edge-to-edge `object-fit: cover`, and hard scroll snapping. List images retain the fixed row height.
- Public card addresses show at most two distinct levels: locality/suburb, then city. Duplicate values collapse. State/country is a fallback only when locality and city are absent. Exact addresses never appear.
- Updated date is blue text with no background.
- The compact currency control is visually reduced while preserving its 16px native text against iOS focus zoom.

## 4. Faster listing start

**Aim:** A lister with a phone can capture or choose photos immediately, then complete the existing guided draft.

**Options ranked:** (1) Add photos first shortcut into the same draft; (2) separate upload inbox; (3) rewrite the composer. Option 1 adds the requested quick start without duplicating uploads or changing the proven data model.

The existing three progressive sections, automatic title, defaults, hidden optional fields, draft saving, preview and automatic advancement remain. The new shortcut opens the unit section and native image picker while retaining all files in the same draft.

## 5. Admin activity monitoring

**Aim:** An authorised operator can switch a graph between permanent accounts created, listings added, images uploaded, enquiries started and messages sent over 7 or 30 days.

**Options ranked:** (1) a server-derived series in the existing admin dashboard; (2) an analytics warehouse/BI product; (3) client-only event totals. Option 1 has no new subscription, uses authoritative records and fits current scale. Option 2 adds cost and operations; option 3 is incomplete and easier to distort.

Migration `admin_daily_metrics` exposes one admin-checked function. Public and signed-out execution are revoked. The real seven-day accounts query returned a valid daily series and total. The Supabase security advisor reported zero errors; its SECURITY DEFINER warning is expected because the function reads protected operational tables and independently checks `private.is_admin(auth.uid())`.

Existing controls remain available for report resolution, listing pause/reactivation, member suspension/restoration, search and audit history. The graph adds visibility rather than irreversible bulk controls.

## Failures and fixes

1. Initial focused score 4/8: one market fixture mismatch and one CSS cascade issue. Ranked fixes favoured correcting the fixture and final constraint over weakening assertions. Corrected score: 8/8.
2. Broad score 66/70: an old fixture expected an empty property to remain reusable. The fixture received an active unit, preserving both requirements. Corrected score: 70/70.
3. Photo shortcut score 8/10: the picker opened, but the test used a DOM method on a Playwright locator. The assertion was corrected without changing product behavior. Corrected score: 10/10.

## Acceptance and score

- Property lifecycle correctness: **10/10**
- Enquiry delivery and privacy: **10/10**
- Find control stability and mobile containment: **10/10**
- Listing quick-start reduction: **9/10**
- Admin visibility and safe control: **9/10**

Hosted and live scores are added only after testing the exact deployment artifact.
