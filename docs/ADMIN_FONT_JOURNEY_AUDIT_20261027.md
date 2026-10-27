# Admin fonts and journey refresh — detection only
27 October 2026, Perth. Status: CONFIRMED OBSERVATIONS; no product repair made.

The owner requested inspection before changes. Observed the genuine authenticator-verified Admin at https://getvacancy.site/#admin, approximately 12:55–13:00 Perth. No application, stylesheet, database, Auth, deployment or live configuration changes. Only normal read-only controls were exercised: scrolling, expanding transition counts, exploring Find, and refreshing the map.

## Row identification
At the inspected 1,363 CSS-pixel desktop viewport, row 3 is File storage used / Live listings and row 6 is Recorded activity. Row numbers can differ with viewport and saved card arrangement. Mobile was not inspected in this audit.

## Confirmed font/rendering issues
All sampled graph labels use the same system family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; weight 400. The problem is the scaling of the SVG text, rather than evidence of another font loading.

| Graph | SVG coordinate size | Rendered size | Horizontal scale | Vertical scale |
| --- | --- | --- | --- | --- |
| Row 1 comparison: Visits | 320 × 144 | 300.45 × 140 | 0.939 | 0.972 |
| Row 3: File storage used | 320 × 144 | 483.66 × 140 | 1.511 | 0.972 |
| Row 3: Live listings | 320 × 144 | 483.67 × 140 | 1.511 | 0.972 |
| Row 6: Recorded activity | 800 × 280 | 1,025.34 × 340 | 1.282 | 1.214 |

1. Row 3 graph labels stretch horizontally: their horizontal scale is approximately 55% greater than their vertical scale. Both wider metric cards show this.
2. Row 6 labels grow with the entire graph and are also slightly wider than their original proportions. They are styled at 11px yet the first label renders about 18.5px high, versus about 15.3px in the compact cards styled at 12px. Apparent typography is inconsistent despite the same font family.
3. Main metric values retain the existing 42px / weight-600 style; no mismatch was found there.

Source confirms that app/src/admin-chart.js applies preserveAspectRatio="none" to the entire SVG including text. CSS fixes compact charts at 140px high with flexible width; the wide activity chart reaches 340px high. The graph and glyphs therefore scale together, sometimes unequally. No font replacement or scaling repair has been selected.

## Confirmed journey refresh issues
### Graph disappears and following rows move
With transition counts expanded, manually clicked Refresh map:

| State | Time, Perth | Map height | Following feeds' document top | Nodes |
| --- | --- | --- | --- | --- |
| Before | 12:56:51.270 | 986.45px | 2,179.77px | 5 |
| Loading | 12:56:51.985 | 133.28px | 1,326.59px | 0 |
| After | 12:57:02.578 | 556.33px | 1,749.64px | 5 |

The feeds moved upward by 853.17px during this expanded-table refresh, then down again. The initial larger map included the expanded table. Page scroll also changed from 1,230px to 746px during the sequence; the separate contributions of browser anchoring and normal click scrolling were not isolated. The map/feed geometry changes independently establish the layout movement.

### Expanded transition table closes
The transition-count table was open before the manual refresh and closed afterward.

### Automatic refresh resets exploration
At 12:57:22.538, Find was selected: centre "8 Find", All pages visible, three outgoing branches. After the normal shared refresh at approximately 12:57:25, the observation at 12:57:46.607 showed centre "8 Visitors", All pages hidden and the original five overview branches. No reset or filter action occurred between those observations.

Source confirms that the historical refresh() in app/src/admin-journey-map.js clears data, removes canvas children and resets focus before awaiting the report. paint() rebuilds the graph and details. That path handles manual refresh and the shared approximately one-minute Overview refresh. The separate approximately ten-second presence update normally retains nodes when the node set is unchanged; its intended live-user pulse is distinct from the reproduced historical repaint.

## Evidence and boundary
Measurements were taken from the rendered DOM and computed styles, with before/during/after observations. The sixth-row screenshot and raw measurements were also captured in the workspace before that environment became unavailable. Existing third-row visual reference: [verified live cards](evidence/admin-storage-listings-live-20261027.jpg).

This report is a detection record, not an implementation or release receipt. The live storage/listings release remains unchanged. Journey-map backlog item I1 is now reproduced. A future repair should check graph text proportions, stable loaded content during refresh, expanded-table retention and branch retention separately.
