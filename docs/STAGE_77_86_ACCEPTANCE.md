# Stages 77–86 acceptance record

## Exact artifact and evidence

- Source branch: `dev/stage40-you-find-agency`
- Preview: `https://vacancy-21unkwen2-tbond24s-projects.vercel.app`
- Vercel deployment: `dpl_8efdHdFCUiQvtvrpaFV3ULkeVaAb`
- New-feature browser gate: **22/22 passed** against the deployed preview on desktop Chromium and Pixel 7 emulation.
- Webhook signature unit gate: exact signature accepted; tampered body and replay-window violations rejected.
- Supabase migrations: all five additive migrations applied and present in remote migration history.
- Runtime database proof: four enquiry preference columns exist; email event table and operations RPC exist; ratings return disabled; anonymous operations-health access returns HTTP 401.
- Production alias was not changed.

## Stage scores and status

| Stage | Result | Security | Correctness | Usability | Complexity | Runtime proof |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 77 Admin MFA | Ready in preview | 9 | 9 | 8 | 8 | AAL2 admin gate passed on both browser profiles; remote `private.is_admin` replacement applied. |
| 78 Listing consolidation | Ready in preview | 8 | 9 | 9 | 8 | Create and edit use the same staged order; desktop/mobile test passed. |
| 79 Contact preferences | Ready in preview | 9 | 9 | 8 | 8 | Unverified routes stay disabled; public RPC returns route booleans without contact values. |
| 80 Legal identity | Technically complete; publication deferred by owner | 9 | 9 | 8 | 9 | Missing data fails closed and admin names every missing field; no identity was invented. |
| 81 Email monitoring | Ready in preview | 9 | 9 | 8 | 8 | Resend webhook is enabled, Vercel server secrets are configured, unsigned traffic is rejected, and a signed runtime probe was accepted and stored. |
| 82 Operations health | Ready in preview | 9 | 9 | 8 | 8 | AAL2 admin-only UI passed; anonymous live RPC call was denied with HTTP 401. |
| 83 Reusable media | Ready in preview | 9 | 9 | 9 | 8 | Owned media picker creates an independent destination copy on both profiles. |
| 84 International defaults | Ready in preview | 8 | 9 | 8 | 8 | Eighteen evidence-based market defaults and seventeen currencies pass without moving the map; unknown countries retain the safe current-market fallback. |
| 85 Basemap decision | Ready in preview | 8 | 9 | 8 | 9 | One centralized provider, visible attribution and no zoom controls passed on both profiles. OSM remains the low-volume MVP choice. |
| 86 Ratings safety gate | Ready in preview | 9 | 9 | 8 | 9 | Live RPC reports disabled and the database constraint prevents unsafe enablement. |

## Failure loop

The first reusable-media test attempted to select photos while its stage was closed. The product behaved correctly; the harness skipped the real user journey. Three fixes were ranked: force the hidden control, open the stage as a user, or weaken stage visibility. Opening the stage was the smallest valid fix. The affected test and the complete 22-test gate then passed.

The repository-wide historical run executed 476 checks: **240 passed, 184 failed, 42 skipped and 10 did not run**. Advancement was stopped and the failures were classified rather than hidden:

1. Retired demo-fixture assumptions expect three seeded cards even though demo inventory was intentionally removed.
2. Superseded listing tests expect the older Location-first four-step composer, old labels and now-hidden fields.
3. Genuine auth tests require isolated Supabase credentials that are not present in this workspace.
4. Live API checks were denied by the initial sandbox network policy; the focused rerun with network access verified the new remote database paths.
5. Older auth assertions still expect a visible `Create account` heading removed by the approved unboxed auth design.

Changing the product back to satisfy those assertions would reverse approved behavior. The current stage tests are the retained acceptance gate; obsolete suites should be migrated in a separate test-maintenance change rather than mixed into these ten features.

## Supabase advisor review

The post-migration security advisor reports no error-level finding. Its new SECURITY DEFINER warnings are intentional, bounded public RPCs: ratings exposes only readiness booleans, contact options exposes only verified-route booleans, and admin functions enforce `private.is_admin`, which now requires AAL2. Existing anonymous-sign-in policy warnings remain because guest enquiries are an approved product feature and permanent-account checks remain in write policies. The project also reports Supabase's optional platform leaked-password switch as disabled; Vacancy's existing signup path continues to use its fail-closed HIBP check.

Performance advisor findings are existing informational index/policy notices plus the expected zero-use state for the newly created email indexes before events arrive. No index was removed or added without workload evidence.

## Deferred owner input

The owner chose to defer public legal identity while the service remains in testing. Before actively attracting real users, provide:

1. Registered/legal operator name.
2. Business or service address suitable for the policies.
3. Governing jurisdiction.
4. Monitored privacy email.
5. Monitored legal/support email.
Email monitoring no longer needs owner input. `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` and `RESEND_WEBHOOK_SECRET` are configured for Preview and Production. The synthetic acceptance event was removed after database verification so it does not distort operational metrics.

The final deployed-preview gate remains **22/22 passed**, and the webhook signature unit gate remains **1/1 passed**. Production promotion remains a separate exact-artifact action.
