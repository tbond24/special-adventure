# Complete cards and feeds — production activation

User explicitly approved the database update, tracking activation, publication and live checks. Applied only `20261021162009_admin_engagement_and_activity_feeds.sql` through the provider migration tool; historical migrations were not replayed. Existing Auth, memberships, customer records and environment variables were unchanged.

Published curated source `465686485ec491576ce89e1ea56752ddfff4aa50`, 121 files, to READY deployment `dpl_AWnS1xJBLe65HFbjskuxJsvG6cKt` (`vacancy-qnieqisbn-tbond24s-projects.vercel.app`) and https://getvacancy.site. Ten files differ from the previous release. Verified 17 changed non-HTML client assets against their hashes on staged and live releases. The context API was verified at runtime separately. Exact artifact: `ADMIN_COMPLETE_CARDS_FEEDS_RELEASE_MANIFEST_20261022.json`.

After public asset verification, executed the generated service-only release receipt. Tracking coverage began **2026-10-22 01:17:56 Australia/Perth** (2026-10-21 17:17:56 UTC). The site feed contains the real code receipt and four affected UI sections. Earlier engagement periods remain unknown; comparisons require sufficient new coverage.

## Checks

- PASS: production report functions execute using authenticated SQL role with transaction-local existing-admin AAL2 claims. This does not constitute owner browser authentication.
- PASS: contact and text recording, event-ID deduplication, both card aggregates and both click types in the visitor feed, tested in a single transaction that was rolled back. No test analytics remained. No customer, signup, listing, contact or message was created.
- PASS: an existing admin identity records zero events and leaves counts unchanged; AAL1 report access rejected. Native live admin sign-in causes zero analytics POSTs, both with the browser opt-out set and without it. Both runs had zero page errors.
- PASS: actual anonymous HTTP recording endpoint accepts an empty batch with zero writes; feed and engagement report endpoints reject anonymous requests with 401. Browser roles cannot execute the release activation function.
- PASS: actual production site feed returned five release groups; visitor feed returned 13 genuine recent activity groups. Contact and text totals were zero after rollback; no genuine new clicks had arrived at the last check. Active presence was zero.
- PASS: `/api/visitor-context` returns 200, private/no-store and only country/city/approximate fields; no IP or coordinates.
- REVIEWED: security advisor flags the intended private RLS tables without client policies and explicitly granted security-definer APIs. New collector has allowlisted bounded inputs, idempotency, per-browser limits and admin rejection; reports retain active-admin/AAL2 guards and no anonymous grants. Existing unrelated notices were not changed. Advisor reference: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable .

PARTIAL end-to-end acceptance: no owner-authenticated browser session was accessed and no genuine new Contact/Text click was observed. Production database execution and rollback tests prove the installed backend paths; local trusted-click/browser and curated-composition tests cover the client paths. Do not represent these as an observed real visitor clicking through the live owner dashboard. Registration location remains approximate and unavailable when no nearby context exists.

Admin visitor activity is excluded. Published admin UI changes intentionally remain in the site audit feed. Previously stored anonymous activity cannot retrospectively be identified as belonging to an admin.

## Preservation

Previous deployment `dpl_BUTFDuWyh36viYBR5kniLn3Fog3v` remains the frontend rollback. Existing presence definition is preserved in `ADMIN_COMPLETE_PRESENCE_ROLLBACK_20261022.sql`. Return the alias if needed; revoke new recording execution to stop cached collectors if required. Keep all real history; do not drop the new tables. No retention scheduler or cleanup execution was introduced. Draft PR #37 remains unmerged.
