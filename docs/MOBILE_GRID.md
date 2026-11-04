# Vacancy mobile grid, version 1

Mobile remains the product design scope until the owner explicitly says it is
finished. Wider-screen checks preserve existing behavior; they do not start a
desktop redesign.

## Starting point and constraints

This is the first migration of the existing Find page. It uses the actual
renderer, existing cards, colors, type, controls and map. At 390px the previous
layout had two 180px cards, 10px outer gutters and a 10px gap. Several generations
of selectors could set the same region's geometry.

The results region now has four equal alignment tracks. The toolbar spans all
four; each card normally spans the equivalent of two. This retains the current
two-card design while giving it explicit constraints.

| Rule | Value / behavior | Owner |
| --- | --- | --- |
| Mobile range | Existing breakpoint, up to 820 CSS px | `app/src/mobile-grid.css` |
| Spacing unit | 4px | `--vg-unit` |
| Results outer gutter | 3 units = 12px each side | `--vg-gutter` |
| Track and card gap | 3 units = 12px | `--vg-gap` |
| Toolbar control gap | 2 units = 8px | `--vg-control-gap` |
| View control track | Existing 44px control | `--vg-control-size` |
| Card minimum | 8.5rem (136px at a 16px root) | `--vg-card-min` |
| Card columns | At most two; one when two minimums and the gap cannot fit | `#cards.card-view` |
| One result | Keep a half-width card while two columns fit | `auto-fill`, not `auto-fit` |
| Empty result | Span the complete content width | `#cards > .empty` |
| List view | One outer column; image/body split only while each fits | `#cards.list-view` |
| Text | Tracks may shrink; card body may wrap; existing explicit ellipsis remains | `minmax(0,1fr)`, `min-width:0` |
| Height | Content determines row height; spare region height does not stretch rows | `align-content:start` |

For viewport width **W**, the results content width is **W − 24px**. When two
cards fit, each is **(W − 36px) / 2**. At 390px this produces two 177px cards.
The number of results does not determine card width. A larger root font raises
the minimum readable card width, so narrow screens reflow to one card without
adding device-specific breakpoints.

The map deliberately remains full width. Map controls, header, navigation and
card interiors retain their current layout rules in this step. They are not
claimed as migrated. The earlier `/__mobile-design` playground is a separate
proposal; its 48px/52px component sizes are not silently adopted here.

## Ownership and editing rules

`app/src/mobile-grid.css` owns Find's main results region, toolbar, card rail,
outer cards and basic filter-field grid at mobile widths. Change its tokens or
declared region rules when changing these constraints. Do not append another
mobile override to `styles.css`, add inline geometry, or use `!important` to beat
an earlier rule.

79 legacy rules had their affected geometry separated from appearance. Their
geometry remains available to desktop and to other mobile pages, using a
specificity-zero `:where(body:not(:has(.map-first-shell)))` guard for the latter.
It no longer participates in mobile Find. Colors, borders, radii and other
appearance declarations remain shared. This is an explicit incremental migration,
not a claim that the entire legacy stylesheet has been replaced. The selector
inventory is in `evidence/mobile-grid-migration-20261104.json`.

The grid stylesheet loads after existing product styles. The curated candidate
builder includes both the migration and the new stylesheet/link atomically, with
updated cache versions. Do not publish the migrated legacy stylesheet alone.
Development fixture assets remain outside `app/` and outside that candidate.

Before migrating another mobile region, identify its existing geometry owners,
move that geometry into the shared system and test the actual renderer. Components
such as buttons still need separate size, shape and state contracts. A grid alone
does not fix repeated loading, authentication timing or every source of flicker.

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
or clicks. Sample
records are memory-only. Hosted APIs, sign-in, map tiles and publication remain
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
