# Stage 50 — interface, media and contact decisions

Each request was evaluated independently using Aim → three options → ranking → smallest safe choice → runtime acceptance.

| Request | Ranked options | Decision and acceptance |
|---|---|---|
| Transparent full-height map header | transparent; low-blur glass; opaque | Transparent, with text contrast retained and safe-area coverage. |
| Search controls | arrow inside field; adjacent button; keyboard only | Arrow inside field. Gear remains the separate tools action. Enter and arrow must both search. |
| Search-area placement | centred above search; map centre; right aligned | Centre above the search row for visual alignment without covering the map centre. |
| Placeholder size | reduce 2px; retain; responsive clamp | Reduce from 13px to 11px as explicitly requested; reject if readability fails. |
| Map attribution | hide; compact; move outside map | Compact visible attribution. Hiding is rejected because OSM and Leaflet require attribution. |
| Saved heart | reduce 2px; retain; adaptive | Reduce both card and detail controls by 2px while preserving a 38–40px target. |
| Footer | organised site footer; large sitemap; bottom nav only | Add the logo to the existing legal footer and ground it through the existing flex layout. |
| Inbox footer | fixed overlay; flex-grounded; content minimum height | Flex-grounded with conversation minimum height so it never covers messages. |
| Loading mark | wordmark only; `v` tile; spinner | Keep the existing branded `v` tile and remove its orange dot. |
| Detail description | full content width; modal; fixed narrow column | Use the available summary width with a readable 72-character line length on wide screens. |
| Enquiry channels | in-app only; verified selectable channels; expose raw details | Keep in-app as the safe current default. Add verified selectable channels only with consent, verification state, anti-scraping controls and schema support in a separate stage. Raw contact exposure is rejected. |
| Rent/bond/stay inputs | compound inline controls; sentence-like contenteditable; existing stacked fields | Compound inline controls rank first. Implement after isolating shared new/edit form markup so validation is not duplicated. |
| Owner inventory view | one cycling button; two buttons; automatic only | One cycling button, matching Find while retaining the existing saved preference. |
| Back navigation | browser history button; fixed route links; both | Add contextual browser-history back controls with deterministic route fallback in the next navigation stage. |
| Duplicate utility labels | repair enhancer; hide with CSS; remove source labels | Repair the enhancer so the accessible label appears once. |
| Image optimisation | client resize before upload; server transform; original-only | Client resize is cheapest, but needs orientation, quality and failure tests before changing user photos. Originals must not silently degrade. |
| Main thumbnail | make-main action; drag only; automatic first | Make-main plus existing reorder. It works on touch and clearly defines the first photo as the thumbnail. |
| Reuse prior images | reusable owned media library; copy URLs; duplicate uploads | Owned media library ranks first but requires private ownership policies and reference lifecycle rules. URL copying and duplicate storage are rejected. |

## Larger isolated stages

Verified contact preferences, client image resizing and reusable media are data/security features rather than visual polish. They remain blocked from implementation until their database ownership, deletion and verification tests exist. This prevents exposing contact details, orphaning shared images or irreversibly degrading uploads.

## Build and test loop

Implemented the transparent safe-area header, centred Search this area action, compact search field with an internal arrow submit action, gear tools action, smaller hearts, organised branded footer, grounded Inbox layout, dot-free loading tile, wider description, single owner view toggle, duplicate utility-label repair, contextual back control, and touch-friendly Main thumbnail selection.

The first six-worker run reported 67 passes, 11 applicability skips and 14 failures. Ten failures were stale expectations for controls intentionally changed here. Four legal-route failures were caused by those tests depending on an unrelated live inventory request. Assertions were updated to target the approved controls, and legal pages were isolated from inventory without weakening their content, navigation, theme or overflow checks.

The serial regression then reported 80 passes, 11 applicability skips and one failure. That failure proved the later iPhone focus guard correctly kept map-search input text at 16px, overriding an unsafe 11px change. Ranked fixes were: reduce only placeholder text; lower all input text and risk Safari zoom; or retain the old placeholder. The first option was selected. The focused mobile rerun passed and proves 16px entered text, an 11px placeholder, centred map action, internal arrow, visible attribution and working tools.

Current score: visual hierarchy 9/10; mobile containment 10/10; search usability 9/10; accessibility/licensing 10/10; listing-form clarity 9/10; regression safety 10/10. Accepted Stage 50 interface score: **9.5/10**.
