# Stage 101 — listing creation journey

The listing form now presents one stage at a time: Location, Media, Property details, Space details, Pricing, Review. This changes presentation and stage validation while retaining the existing property/unit records, media pool, draft storage, and publish handler. The mobile List action is centred in the lower navigation. Room, studio, and apartment presets share one top-level residential choice; their existing property and unit types are preserved in the saved payload.

The implementation deliberately uses controlled stages in one form rather than six routes. Separate routes would require new cross-route draft state and more recovery paths without improving the initial listing task. Existing-property listings keep their chosen property; new-property listings require a public map point or a resolvable manual address.

Validation: 126/126 local launch browser checks passed across desktop and mobile. The focused listing journey passed 10/10 on preview and 8/8 on getvacancy.site. The publish browser check uses a simulated backend and asserts one create request; it does not claim a real listing was written to production.

Release: commit `1b21f76` on GitHub branch `preview/listing-journey-stage101`; preview `dpl_EgFfzs1jfapktzG7W1yE5XLhCWdr`; live production `dpl_9Xgz1tGjMr9ieB8n8or29pf7w5ED`. Previous production `dpl_HgVP1S4KSHHXZekYsoRj4FUQ4wWa` is the rollback target for `getvacancy.site`.

Not included: new conditional bedroom, bathroom, wardrobe, or floor-area fields. Their meaning and database representation were discussed as a later design question, not specified as a confirmed form requirement. The current unit-type and feature controls remain available.
