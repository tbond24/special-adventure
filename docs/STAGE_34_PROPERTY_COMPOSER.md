# Stage 34 — Property composer and listing preview

Progressive enhancement ranked above a full wizard rewrite and premature schema changes. The new-property path now starts with the map, uses reverse-geocoded but editable address fields, requires and stores a deliberate property name, retains property-level details and multi-unit inheritance, and provides an on-page listing preview before publish. Existing properties continue to be presented first and add sibling units through the proven property RPC.

The first regression had three causes duplicated across browser profiles: required property names missing from old fixtures, and two superseded currency/search assertions. Updating genuine scenarios ranked above weakening the required name or inventing one. Final relevant regression: **22/22 passed**.

Private manager nickname and verified-member enforcement require private schema/RLS and are intentionally held for the next database stage. Production unchanged.
