# Vacancy mobile grid, version 2

Mobile remains the product design scope until the owner explicitly says it is
finished. Wider-screen checks preserve existing behavior; they do not start a
desktop redesign.

## Starting point and constraints

This is the first migration of the existing Find page. It uses the actual
renderer, existing cards, colors, type, controls and map. At 390px the previous
layout had two 180px cards, 10px outer gutters and a 10px gap. Several generations
of selectors could set the same region's geometry.

The first grid checkpoint used 12px results gutters. Version 2 aligns the header,
map controls and results to a shared 16px inset, standardizes control sizes and
adds explicit card-interior spacing.

The results region has four equal alignment tracks. The toolbar spans all
four; each card normally spans the equivalent of two. This retains the current
two-card design while giving it explicit constraints.

| Rule | Value / behavior | Owner |
| --- | --- | --- |
| Mobile range | Existing breakpoint, up to 820 CSS px | `app/src/mobile-grid.css` |
| Spacing unit | 4px | `--vg-unit` |
| Shared content inset | 4 units = 16px each side | `--vg-gutter` |
| Track and card gap | 3 units = 12px | `--vg-gap` |
| Toolbar control gap | 2 units = 8px | `--vg-control-gap` |
| Minimum action target | 44px in each dimension | `--vg-control-size` |
| Field minimum height | 48px; text inputs and selects | `--vg-field-size` |
| Card interior | 12px padding, 4px gap | `--vg-card-padding`, `--vg-unit` |
| Shape roles | Circular icon actions, capsule actions/search, existing 9px field corners | `--vg-radius-*` |
| Card minimum | 8.5rem (136px at a 16px root) | `--vg-card-min` |
| Card columns | At most two; one when two minimums and the gap cannot fit | `#cards.card-view` |
| One result | Keep a half-width card while two columns fit | `auto-fill`, not `auto-fit` |
| Empty result | Span the complete content width | `#cards > .empty` |
| List view | One outer column; image/body split only while each fits | `#cards.list-view` |
| Text | Tracks may shrink; card body may wrap; existing explicit ellipsis remains | `minmax(0,1fr)`, `min-width:0` |
| Height | Content determines row height; spare region height does not stretch rows | `align-content:start` |

For viewport width **W**, the results content width is **W − 32px**. When two
cards fit, each is **(W − 44px) / 2**. At 390px this produces two 173px cards.
The number of results does not determine card width. A larger root font raises
the minimum readable card width, so narrow screens reflow to one card without
adding device-specific breakpoints. At 320px the two cards remain 138px wide,
above the existing 136px minimum. A 20px inset would leave only 134px per card
and would require one column; 16px is the chosen compact-phone inset.

The map remains full width. Header frames, map controls, results and the filter
panel use the shared inset. The header reserves 44px actions with 8px vertical
padding plus the top safe area. Expanded search has a 48px field, bottom-aligned
with the 44px map actions; type choices yield space while search is expanded.

Save actions sit at the top of each photo and gallery arrows at the bottom.
Their 44px targets stay separate even on a 320px phone. The filter panel scrolls
within the available viewport, with 48px fields and 44px switch labels/More filters.
Card interiors use 12px padding and 4px gaps. Rent, rent period and deposit values
wrap when needed; monetary text must remain visible on narrow cards.
The floating bottom navigation retains its existing placement at this checkpoint.
The earlier playground's 48px actions/52px fields remain a separate proposal; this
checkpoint uses the owner-accepted 44px actions and 48px fields.

## Ownership and editing rules

`app/src/mobile-grid.css` owns mobile Find header/control sizing and alignment, results,
toolbar, card rail, card interiors and filter sizing/layout. Change its tokens or
declared region rules when changing these constraints. Do not append another
mobile override to `styles.css`, add inline geometry, or use `!important` to beat
an earlier rule.

79 legacy rules had their affected geometry separated from appearance. Their
geometry remains available to desktop and to other mobile pages, using a
specificity-zero `:where(body:not(:has(.map-first-shell)))` guard for the latter.
It no longer participates in mobile Find. Colors, borders and other appearance declarations remain shared. Version 2
centralizes the circle/capsule/field radius roles alongside control sizing. This is an explicit incremental migration,
not a claim that the entire legacy stylesheet has been replaced. The selector
inventory is in `evidence/mobile-grid-migration-20261104.json`. Version 2 migrates
the affected size, spacing and shape declarations from another 125 rules; see
`evidence/mobile-alignment-migration-20261104.json`. Desktop and non-Find geometry
remain available with the same specificity and cascade order.

The grid stylesheet loads after existing product styles. The curated candidate
builder includes both the migration and the new stylesheet/link atomically, with
updated cache versions. Do not publish the migrated legacy stylesheet alone.
Development fixture assets remain outside `app/` and outside that candidate.

Before migrating another mobile region, identify its existing geometry owners,
move that geometry into the shared system and test the actual renderer. The
current icon/capsule/field roles reserve their geometry through disabled, loading
and selected states; migrate remaining mobile pages through the same process.
A grid alone does not fix repeated loading, authentication timing or every source
of flicker.

## Device review and checks

Open the private workspace's `/__find-preview#home`. This serves `app/index.html`
and the real Find renderer with the existing synthetic listing contract, shared
with the refresh-stability suite. No duplicate Find screen is maintained.

Dotted guides are visible by default from the top to the bottom of the mobile
viewport, aligned with the results track edges. They stay fixed while scrolling
and cover the header, map and bottom navigation. Faint horizontal dotted guides
repeat every 8px, with stronger guides every 32px. These are review guides;
content heights remain flexible. The Preview menu can hide/show
them and offers two/one/long/empty content cases. The guides do not affect layout
or clicks. Sample records are memory-only. Hosted APIs, sign-in, map tiles and publication remain
disabled. The map can show local sample markers over an empty background.

The workspace suite checks 320/360/390/430/768/820px containment and alignment,
filter fields, 200% root-text reflow on narrow widths, empty/single/long content,
view preference after reload, unchanged-inventory node/focus/gallery retention,
and stylesheet ownership. It also checks the prior desktop geometry as a
preservation measure. A reduced-height viewport checks focus/input retention;
it is not a physical-phone keyboard test.

These are bounded Chromium checks. Physical phone/Safari acceptance, pinch zoom,
all translated strings and a complete accessibility audit are not established.
Root-font scaling does not prove every inherited pixel-sized label scales.

The track minimum policy follows the CSS Grid distinction between automatic
content minimums and explicit shrinkable tracks. Reflow at 320 CSS px and text
resize to 200% are useful acceptance cases, not a claim of full WCAG compliance.
References: [CSS Grid sizing](https://www.w3.org/TR/css-grid-2/),
[W3C reflow guidance](https://www.w3.org/WAI/WCAG21/Understanding/reflow),
[W3C text resizing guidance](https://www.w3.org/WAI/WCAG21/Understanding/resize-text).
