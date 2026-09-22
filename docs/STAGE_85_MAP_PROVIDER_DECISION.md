# Stage 85 — basemap decision

## Options and decision

1. **Retain standard OpenStreetMap raster tiles for the current low-volume MVP** — no key or new cost, browser caching works, and the present Leaflet bundle stays small.
2. CARTO light/vector basemap — visually quieter and a free allowance, but now requires an account/API key, acceptance of separate terms, dual attribution and usage monitoring.
3. MapTiler custom vector style — strongest style control, but the free plan is described for testing/personal or non-commercial use and can pause at its limit; the commercial plan adds monthly cost and a larger renderer migration.

Option 1 ranks first today. A cosmetic provider migration does not justify new credentials, vendor limits and regression risk before inventory or traffic demonstrates a problem. The choice must be revisited before sustained commercial traffic because OSM's community tile service is best effort and has no SLA.

The implementation removes duplicated hard-coded URLs behind one provider configuration and corrects attribution on detail maps. It does not hide attribution, prefetch tiles or add zoom controls. Runtime acceptance checks the configured URL, visible attribution and reduced controls. Scores: performance 9/10 for the current scale, compliance 9/10, cost 10/10, custom styling 6/10. The weighted result still favors retention for this stage.
