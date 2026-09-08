# Stage 32 — Live filters, listing essentials and saved response

The frosted map popover ranked above a full-screen sheet and below-map controls. It keeps the map visible, applies every change immediately, and closes on outside tap. Radius is first and disabled until a map point exists. Rent and planned stay accept week/month/year preferences. Move-in visibly starts at today but only constrains results after the viewer changes it. Utilities use direct toggles.

Cards now omit availability date and prioritize unit type, locality, green price/cadence and distance when a point exists. Saved hearts update optimistically without rerendering the page or map, rolling back on backend failure.

Failure 1 was a removed-label startup assumption; a guarded legacy assignment ranked above restoring redundant markup or redesigning currency coupling. Failure 2 was a test clicking under the filter overlay; clicking the genuinely exposed map ranked above forced or synthetic clicks.

Runtime evidence: **32 passed, 4 intentional skips, 0 failed** across feature and responsive suites. Production unchanged.
