# New listings: successful first publication

27 October 2026, Australia/Perth. PREPARED, not installed. Follows the verified New registered accounts repair; Repeat visitors and later metric/public feature work are unchanged.

## Issue, options and choice

Overview's New listings branch currently counts vacancies.created_at. A saved creation row can still be a draft whose photo upload or final publication fails. The current create wrappers also call older create functions that insert active, then reset the row to draft in the same transaction. Therefore neither published_at nor an unqualified earliest active log entry proves the requested successful publish.

Inspected hosted create_vacancy_listing_v4, create_unit_vacancy_for_property_v3 and their underlying create functions; listing_draft_publish_action, ack_listing_draft_action, finish_listing_draft_publish_impl, reconfirm_vacancy, record_listing_activity, table defaults/privileges and source app/src/listings.js. The final per-unit action validates current photos, reconfirms active and acknowledges the draft in the same transaction. A failed acknowledgement rolls back the status and its log entry. Different units can succeed independently; later draft cleanup/refresh failure does not undo a committed listing.

Options considered: use creation/published_at or raw earliest active logs; read confirmed publication history while removing the intermediate creation event; add a separate first-publication recorder if existing history cannot support the rule. Chosen: the existing history reader, with no new table, index, collector, product writes or publisher changes.

Count the earliest qualifying publication per listing: draft→active, or a legacy created-active entry that is not followed by active→draft in the same creation transaction timestamp. The installed log default is now(), the transaction timestamp, and its unchanged trigger writes every status change. Match entity and later log ID as well as timestamp. Ignore ordinary active renewals and paused→active renewals as new first-publication evidence. Group before period filtering so later renewals cannot move the first count. Keep the Overview's existing Admin-owner exclusion.

Before: created drafts/unproven rows can count immediately, and an older draft published today can be dated earlier.

Prepared now: a successful committed first publication counts on its recorded publication date, once per listing. Failed photos/acknowledgement, retries and intermediate active→draft creation do not count. Pause/archive/expiry does not subtract a previous publication. Two successfully published units contribute two, including partial success followed by retry. Live listings remains the separate current-stock card.

## History and scope limits

Use only available qualifying publication facts. Six existing non-Admin paused listings have no publication log evidence; they are not assigned invented first-publication dates or declared never published. Unknown historical rows remain unproven. This is not a reconstructed permanent audit of missing/deleted data. Hard deletion of a listing or administrative log changes can affect the row-linked report. The transaction-timestamp rule depends on the captured recording contract; migration fails closed if the reader, activity function or timestamp default changed.

Only the listings count branch of public.admin_card_series changes. Verified accounts, enquiries/messages/images branches, signatures, period validation, ACLs, Admin/AAL2/active-user guards, public publisher, RLS, saved card layout and notification transport stay unchanged. Other legacy/System/marketing reports are outside this repair. Existing vacancies notifications reread the listings group after the successful transaction; no new polling is needed.

## Checks and activation state

PASS: disposable PostgreSQL using captured activity trigger and reconfirm function covers temporary active creation/reset, failed photo validation, failed acknowledgement rollback, older draft success, repeated calls, pause/resume/archive, committed legacy creation, unproven history, independent multi-unit success/retry, boundaries, other metric equality, denied roles, exact ACL/guard equality, precondition failure and exact rollback preserving rows/history and the verified-account repair. The suite tests reporting/transaction semantics, not a new full product RLS/UI test.

PASS: native read-only EXPLAIN of the prepared Today aggregate: execution 0.646 ms (planning 9.599 ms) on current data. No additional index is justified. Expected Today = 0; old creation count is also 0. These empty current-period counts cannot themselves prove positive publication behaviour; disposable cases supply that evidence. No production listings or uploads were created.

Exact-source CI and genuine live reader acceptance remain pending. This is a SQL-only repair: current frontend source 2fb6c486719b179e6989a6beb37c77bc91d67682 and deployment dpl_8EqEmyMnooZ5qsBPdwfcvSW84AwB remain the matching UI. Do not create a redundant frontend deployment or claim a new UI release.

## Migration, record and rollback

Forward: supabase/migrations/20261027143848_admin_listing_first_publication.sql, created with the supported telemetry-disabled/offline CLI. Record the actual provider version after activation; differing filenames identify the same change, not a replay. Fixture: tests/fixtures/admin-listing-publication-baseline.json, code/ACL only, no customer records.

Rollback: supabase/rollback/admin_listing_first_publication_20261027.sql restores the exact immediately preceding reader, including verified accounts, preserving all listing/account/activity data and existing grants. No frontend rollback is needed for this SQL-only change. No rollback has run. Save exact source/CI/catalogue/advisor/live evidence and update STATUS/DECISIONS before advancing to the next metric.
