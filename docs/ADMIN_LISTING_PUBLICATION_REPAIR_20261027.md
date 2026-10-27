# New listings: successful first publication

27 October 2026, Australia/Perth. LIVE and verified at 10:51 PM. SQL-only repair, following the verified New registered accounts repair. Repeat visitors and later metric/public feature work are unchanged. This receipt supersedes the prepared checkpoint.

## Issue, options and choice

Overview's New listings branch currently counts vacancies.created_at. A saved creation row can still be a draft whose photo upload or final publication fails. The current create wrappers also call older create functions that insert active, then reset the row to draft in the same transaction. Therefore neither published_at nor an unqualified earliest active log entry proves the requested successful publish.

Inspected hosted create_vacancy_listing_v4, create_unit_vacancy_for_property_v3 and their underlying create functions; listing_draft_publish_action, ack_listing_draft_action, finish_listing_draft_publish_impl, reconfirm_vacancy, record_listing_activity, table defaults/privileges and source app/src/listings.js. The final per-unit action validates current photos, reconfirms active and acknowledges the draft in the same transaction. A failed acknowledgement rolls back the status and its log entry. Different units can succeed independently; later draft cleanup/refresh failure does not undo a committed listing.

Options considered: use creation/published_at or raw earliest active logs; read confirmed publication history while removing the intermediate creation event; add a separate first-publication recorder if existing history cannot support the rule. Chosen: the existing history reader, with no new table, index, collector, product writes or publisher changes.

Count the earliest qualifying publication per listing: draft→active, or a legacy created-active entry that is not followed by active→draft in the same creation transaction timestamp. The installed log default is now(), the transaction timestamp, and its unchanged trigger writes every status change. Match entity and later log ID as well as timestamp. Ignore ordinary active renewals and paused→active renewals as new first-publication evidence. Group before period filtering so later renewals cannot move the first count. Keep the Overview's existing Admin-owner exclusion.

Before: created drafts/unproven rows can count immediately, and an older draft published today can be dated earlier.

Now: a successful committed first publication counts on its recorded publication date, once per listing. Failed photos/acknowledgement, retries and intermediate active→draft creation do not count. Pause/archive/expiry does not subtract a previous publication. Two successfully published units contribute two, including partial success followed by retry. Live listings remains the separate current-stock card.

## History and scope limits

Use only available qualifying publication facts. Six existing non-Admin paused listings have no publication log evidence; they are not assigned invented first-publication dates or declared never published. Unknown historical rows remain unproven. This is not a reconstructed permanent audit of missing/deleted data. Hard deletion of a listing or administrative log changes can affect the row-linked report. The transaction-timestamp rule depends on the captured recording contract; migration fails closed if the reader, activity function or timestamp default changed.

Only the listings count branch of public.admin_card_series changes. Verified accounts, enquiries/messages/images branches, signatures, period validation, ACLs, Admin/AAL2/active-user guards, public publisher, RLS, saved card layout and notification transport stay unchanged. Other legacy/System/marketing reports are outside this repair. Existing vacancies notifications reread the listings group after the successful transaction; no new polling is needed.

## Checks and activation state

PASS: disposable PostgreSQL using captured activity trigger and reconfirm function covers temporary active creation/reset, failed photo validation, failed acknowledgement rollback, older draft success, repeated calls, pause/resume/archive, committed legacy creation, unproven history, independent multi-unit success/retry, boundaries, other metric equality, denied roles, exact ACL/guard equality, precondition failure and exact rollback preserving rows/history and the verified-account repair. The suite tests reporting/transaction semantics, not a new full product RLS/UI test.

PASS: native read-only EXPLAIN of the prepared Today aggregate: execution 0.646 ms (planning 9.599 ms) on current data. No additional index is justified. Expected Today = 0; old creation count is also 0. These empty current-period counts cannot themselves prove positive publication behaviour; disposable cases supply that evidence. No production listings or uploads were created.

PASS: exact SQL source 59def71466c67d9a4a19e654743deb2d238367c3 passed contract CI 40524361044 / job 122259717667. Hosted function exactly matches the prepared SQL; all ten captured ACLs and nine other captured definitions (publisher, acknowledgement, activity recorder, guards) are unchanged. Security advisors retain the same 32 findings with none added or removed.

PASS: genuine owner Admin Last 30 days changed from 15 created rows to 11 confirmed first publications, matching native aggregation. Today and Last 7 days are 0 in native aggregation. Restored the original Today selection and all eight card choices. Real SQL-release receipt supabase:20261027145011 recorded as a code entry with the actual migration source, deployment_id null and unchanged engagement coverage; private site_feed notification received. No fabricated Vercel deployment/UI release or production test listing was created.

PASS: full browser CI 40525679414 / job 122264474764 on receipt commit 4b108553ac7f52852486aa07a6dc82435177322a completed 152 passes / 22 intentional skips, including both desktop/mobile snapshot-cutoff cases. SQL CI 40525687628 / 122264502743 also passed on that commit. Git comparison against released SQL source 59def714 shows only seven docs/evidence paths; application, SQL, test and configuration files are identical. Later record-only commits do not invalidate those implementation checks. No frontend source changed: actual asset source 2fb6c486719b179e6989a6beb37c77bc91d67682 remains live on dpl_8EqEmyMnooZ5qsBPdwfcvSW84AwB.

Record the earlier result accurately: run 40524349700 attempt 1 / job 122259675669 had 151 passes, 22 skips and one five-second timeout in the unchanged mobile mock test for shared native/legacy journey snapshot cutoffs. The same test passed in both projects on the identical implementation above; no product/test source was changed or weakened. Root cause of the intermittent assertion remains unconfirmed. One job retry was requested (122265725703; pending at this record), but the completed receipt-commit run supplies the full passing suite. A focused local attempt produced an incomplete log and is PARTIAL, not a claimed pass. Activation used the already-completed exact-source SQL contract, native catalogue checks and genuine Admin acceptance; the browser fixture does not execute hosted SQL.

Live evidence and test states: [evidence/admin-listing-publication-live-20261027.json](evidence/admin-listing-publication-live-20261027.json). Browser before/after and preferences: [evidence/admin-new-listings-ui-20261027.json](evidence/admin-new-listings-ui-20261027.json), [screenshot](evidence/admin-new-listings-live-20261027.jpg). The screenshot shows the temporary Last 30 days acceptance view; Today was restored afterward.

## Migration, record and rollback

Forward: supabase/migrations/20261027143848_admin_listing_first_publication.sql, created with the supported telemetry-disabled/offline CLI. Hosted 20261027145011 / admin_listing_first_publication was applied once. These timestamps identify the same change, not a replay. Actual SQL application source 59def71466c67d9a4a19e654743deb2d238367c3; later receipt-only commits do not change the released SQL. Fixture: tests/fixtures/admin-listing-publication-baseline.json, code/ACL only, no customer records. Draft PR54 remains unmerged; no default merge or force-push.

Rollback: supabase/rollback/admin_listing_first_publication_20261027.sql restores the exact immediately preceding reader, including verified accounts, preserving all listing/account/activity data and existing grants. No frontend rollback is needed for this SQL-only change. No rollback has run. STATUS/DECISIONS and live evidence record the completed repair. Next: settle the agreed first-enquiry boundary (per listing or visitor–lister relationship) before implementation; no later repair has begun.
