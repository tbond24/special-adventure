# Next listing and administration iterations

## Shared method

Each stage runs independently through: aim and acceptance, at least three options, ranked trade-offs, smallest safe implementation, runtime tests on an isolated environment, scoring, failure diagnosis and ranked fixes, full relevant regression, checkpoint, and documentation. Production promotion happens only after the exact preview artifact passes.

## Stage 12 — map-led address entry

### Aim

Let a lister search for or select a place on the map, convert that position into structured location fields, review and edit every suggested value, and deliberately choose a separate approximate public pin. Never publish the exact private address.

### Ranked options

1. **Geoapify behind a small server-side proxy — chosen.** Free tier is currently 3,000 credits/day with no card, commercial use is allowed with attribution, and reverse geocoding returns structured address parts. The proxy protects the key, applies a strict origin check, throttles requests, and makes the provider replaceable.
2. **Google Maps Places and Geocoding.** Best address coverage and familiar UX, but billing and a payment-enabled Google Cloud project are required.
3. **Public OpenStreetMap Nominatim.** No account cost, but autocomplete is forbidden, public capacity is limited to one request per second per application, and its privacy/availability terms are unsuitable for Vacancy's long-term production path.

### Smallest safe interaction

1. Lister enters an address or taps **Pick on map**.
2. Search returns a short result list; choosing a result moves the pin.
3. Tapping or dragging the pin runs one debounced reverse-geocode request.
4. Vacancy proposes country, region, city, locality, postcode, landmark/street and formatted address.
5. A clear **Use this location** action fills the form. Every field stays editable.
6. Exact address remains private. A second approximate public pin defaults nearby and can be moved before publishing.
7. If geocoding fails, manual entry and map placement remain fully usable.

### Acceptance

- Search and map click both produce editable suggestions on desktop and mobile.
- User edits are not silently overwritten.
- Provider failure leaves manual entry working.
- Exact address never appears in anonymous API responses or public UI.
- API key is absent from browser source and network requests.
- Kenya, Australia, United States, United Kingdom, Uganda and Tanzania field mapping is tested.

## Stage 13 — separate location from display currency

### Aim

Changing currency must never change the country, inventory, map centre, distance units, location labels or listing form defaults.

### Ranked options

1. **Independent location and display-currency state — chosen.** Keep listing location/country as property data and add a separate display currency preference. Preserve original rent currency in storage.
2. **Currency filter only.** Cheap and honest, but does not meet the request to view prices in another currency.
3. **Continue treating currency as market.** Rejected because it changes unrelated product context.

### Smallest safe model

- `locationMarket`: controls map centre, location labels, distance units and visible inventory.
- `displayCurrency`: controls price presentation only.
- `rentCurrency`: immutable listing input currency stored with each vacancy.
- Converted prices must show **Approx.** and the rate date. Original rent remains visible on detail and enquiry surfaces.
- Rates are cached server-side daily. If rates are unavailable or stale beyond the agreed limit, show original currencies rather than inventing a value.

### Acceptance

- Switching currency does not change result count, listing IDs, map centre or location labels.
- Switching location does not rewrite saved display currency.
- Original amount/currency survive create, edit and display conversion.
- Unsupported/stale rates fail visibly to original currency.

## Stage 14 — one property, one-or-more units

### Aim

Create a property with one unit by default and let the lister add more unit cards with a clear **+ Add another unit** action before review and publication.

The database already separates properties, rooms and vacancies and supports sibling units. This stage reuses that model.

### Ranked options

1. **Inline unit-card builder with one default card — chosen.** Property fields appear once; each unit owns rent, availability, type, occupancy, furnishing, ensuite, utilities override, rules override, description and photos.
2. **Publish the first unit, then offer Add another.** Smallest engineering change, but creates repetitive work and hides the property hierarchy.
3. **Spreadsheet/grid entry.** Fast for large portfolios but too dense for an MVP and weak on mobile.

### Interaction and data rules

- Start with **Unit 1** expanded.
- **+ Add another unit** appends Unit 2, Unit 3, and so on.
- Property-level facts are shown once and inherited by every unit.
- Unit-specific overrides explicitly say **Same as property** until changed.
- A unit can be duplicated, reordered or removed; the last remaining unit cannot be removed.
- Review shows one property summary followed by every unit and its final rent/status.
- Publish uses one atomic database operation so partial property/unit creation cannot occur.

### Acceptance

- One unit remains the default and shortest path.
- Two or more units publish under exactly one property.
- Each unit preserves independent details and photos.
- Property edits propagate only inherited values; explicit overrides survive.
- A failed unit validation blocks the whole atomic publish and focuses the failing card.
- Existing single-unit and add-sibling journeys remain green.

## Stage 15 — operational admin dashboard

### MVP controls, ranked

1. **Operational overview and actionable queues — first.** Current active/paused/filled listings, stale listings due for reconfirmation, new users, open reports, messaging failures and email delivery failures.
2. **Search and entity inspection — second.** Find a user, property, unit, vacancy or conversation; see ownership, status, timestamps and relevant reports without exposing private message content by default.
3. **Audited moderation actions — third.** Deactivate/reactivate listing, resolve/dismiss report, suspend/restore user, revoke sessions and record actor, reason and timestamp.
4. **Trend analytics — later.** Signup-to-confirmation, listing completion, search-to-enquiry and fill rate after enough real usage exists.

### Dashboard layout

- Top health strip: site, database, Auth email, rate-limit pressure and latest successful checks.
- Work queues: reports, stale vacancies, failed email/auth events and suspicious repeat activity.
- Inventory tree: property → units → vacancy state with quick inspection and safe moderation.
- User view: confirmation status, listing count, reports, blocks and session-revocation control.
- Audit log: every admin mutation with reason and rollback context.

### Guardrails

- Separate admin authorization remains server-enforced.
- Destructive actions require a reason and confirmation.
- Admin UI never receives service-role credentials.
- Private addresses and message bodies are revealed only when the specific support/moderation task justifies it.
- Every admin action is logged and regression-tested against non-admin denial.

## Recommended execution order

1. Map-led address entry.
2. Location/currency separation.
3. Multi-unit creation flow.
4. Admin operational controls.

Currency separation comes before multi-unit work because it removes the current global coupling before the listing form becomes more complex. The map stage remains first because it delivers the requested listing improvement without changing stored property/unit relationships.
