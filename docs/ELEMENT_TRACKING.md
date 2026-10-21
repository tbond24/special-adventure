# Reusable element and page tracking

Development implementation; collection is disabled by default. The synthetic
admin preview uses fabricated reports. No hosted migration, collection setting
or retention scheduler has been changed.

## Current points

- `contact_button_pressed`: the listing enquiry action, including “Is this available?”
- `text_button_pressed`: Send message activation; this counts a press, not delivery
- `location_started`, `listing_details_started`, `listing_previewed`: visible
  creation steps, including revisits; edits are excluded
- `listing_submitted`: successful reconfirm/publication operation, not the Publish
  click. Multi-unit publication can produce one event per successful unit operation.

Select a point in a top-row card's Data selector, then Total events or Distinct
browsers and a period. A point cannot occupy two cards even with different periods
or counting methods. Browser counts are anonymous browser IDs, not people. A
creation attempt has a temporary form-lifetime journey ID; a page reload starts
a separate attempt. Counts cover consenting, eligible browsers only.

Tracking cards use hourly buckets for single days and local calendar-day buckets
for longer periods. Empty covered buckets are zero, future time is blank, and the
current bucket ends at the report request cutoff. Repeated activity is retained;
transport event IDs deduplicate retries. Period-wide distinct counts are computed
from the whole range, never by adding daily distinct counts. Percentage comparison
uses the same local elapsed period in the preceding range. Missing earlier
coverage means comparison unavailable. A collection restart resets coverage.

## Add another point

1. Add a stable name, label and kind to `VACANCY_TRACKING.catalog` in
   `app/src/element-tracking.js`, plus a matching registry row in a new migration
   for `private.element_tracking_points`. Never edit an applied migration.
2. For an activation, add `data-track="your_registered_name"` to its button/link.
   One delegated listener handles nested icons and keyboard activations. Disabled
   controls, script-generated clicks, unknown points and non-press tags are ignored.
3. For a page/milestone, call `VACANCY_TRACKING.track(name, journeyId)` from its
   actual visible/successful transition. Creation steps use `page(form,index)`,
   which suppresses repeated rendering of the same step but counts returns.
4. The point appears automatically in the reusable-card catalog. Verify eligibility,
   repeats, success/failure and missing coverage with the isolated fixture.

No text matching, page scraping, input values, URLs, listing IDs, account IDs,
contact details, coordinates or message contents enter this event contract.

## Cost and collection boundaries

One delegated listener, explicit step hooks, no DOM-wide observer or background
collection polling. Existing queue bounds: 100 queued events, 20 per batch,
30 KB payload, three bounded attempts and a 15-second transport deadline. Queue
lives in memory; closing a tab may lose events. Anonymous tracking deliberately
does not bind queued events to account changes, so guest sign-in does not erase
a Send message press. Other analytics queues keep their existing actor binding.

Client and server enablement gates, versioned optional consent, 30-day browser ID
rotation, 30-minute idle sessions, admin/bot exclusions and browser privacy signals
apply. Privacy offers withdrawal. Declining never blocks product actions. The
existing analytics systems keep their own separate collection policies.

Migration `20261021120000_element_tracking.sql` adds private RLS-protected tables,
strict event fields, the existing ingestion budget, an idempotent collector,
an MFA-admin report and a bounded prune function. Records expire logically after
30 days and reports exclude expired data. Physical cleanup requires an authorized
scheduler invoking `private.prune_element_tracking()` in batches until caught up.
Activation must include retention enforcement and notice review. No scheduler is
installed here. Disabled gaps and history older than retention are unavailable.

First version reads at most 5001 rows per shared period; reaching that sentinel
fails closed. Reports share a cache across cards and refresh every minute only
while Overview is visible. Long-term rollups are deferred: 90-day history is not
claimed from a 30-day event store. No additional paid analytics service is needed.

## Local verification

`npm test` uses the isolated workspace server. `node --test
tests/analytics-queue.test.cjs` checks shared queue guarantees. The optional
`tests/element-tracking-sql.check.cjs` runs the new migration in PGlite using
`VACANCY_PGLITE_MODULE` to select an already installed local module. It has no
hosted connection and does not replay the repository's full migration history.
