# Isolated hosted verification environment — 5 October 2026

The owner approved temporarily taking charity offline to free a project slot, then explicitly selected tbond24's Org for the test project. Supabase quoted and confirmed $0/month before creation. No Windows software was installed and no paid plan was activated.

## Verified targets

- Production Vacancy: `xtutkwiivqkgkqjpkxvj` — not modified.
- Charity: `sdhfefhaasvttvykgxbe`, `charity-student-fund-beta`, eu-west-1 — pause succeeded; subsequent status INACTIVE. Its backend is temporarily unavailable. No charity data was queried, copied or deleted.
- Disposable test: `raauicmfyjpcuhfzknak`, `vacancy-admin-test`, ap-southeast-2 — created ACTIVE_HEALTHY. Its public schema was verified empty before setup.
- Organisation: `cpzvufabsbwpvawgpcyw`, tbond24's Org, Free.

The test project uses minimal synthetic report dependency tables, the existing repository admin/AAL2 predicate, and the final combined reporting migrations. Supabase's actual auth schema/functions were retained. Migration `synthetic_admin_report_verification` exists ONLY in this disposable project. This is not yet a complete application-schema replica.

Two preconfirmed synthetic identities using example.invalid addresses were created in the test project; no emails were sent. Passwords were randomly generated and kept outside the app in the sibling marketing-checkpoint-artifacts/hosted folder. No service-role key or production credential was used.

## Executed results

`node qa/marketing-db/hosted-auth.cjs`: exit 0; **25 assertions passed** through real hosted Auth and PostgREST:

- Anonymous RPC denial and invalid-token rejection.
- Password login for synthetic admin and non-admin.
- Report denial at AAL1 for each identity.
- Actual TOTP enrollment, challenge, verification and signed AAL2 tokens for both identities.
- Admin AAL2 report access and authenticated non-admin AAL2 denial.
- Dynamic server report timestamps and genuine empty-dataset counts.
- Session refresh, synthetic factor removal and accepted logout for both identities.

Machine-readable evidence: `../marketing-checkpoint-artifacts/hosted/auth-results.json`. The runner strictly allowlists the disposable project's host and ID, and does not print tokens/passwords/TOTP secrets. Publishable configuration and private test credentials remain outside the deployable app. Temporary MFA factors were removed by the successful run.

## Remaining verification

These are real hosted HTTP checks, not simulated SQL claims. They do not establish full browser login/MFA behavior, email delivery, Google OAuth, bad/expired TOTP handling, access-token expiry, membership removal, or the new connected journey aggregation. Preconfirmation is not email-delivery verification. Logout acceptance is not proof of immediate revocation of already issued access tokens. The connected-admin implementation and its production release remain incomplete.

No production migration, deployment, tracking activation or data deletion was performed. The earlier local SQL correctness and recovery evidence remains separate and preserved.

## Restoration and cost control

Keep this test project active only while needed for the remaining admin work. To restore charity within the two-active-free-project limit:

1. Save test evidence and source/migration recovery records locally.
2. Pause **only** `raauicmfyjpcuhfzknak` and verify it is inactive.
3. Restore **only** `sdhfefhaasvttvykgxbe`, then verify ACTIVE_HEALTHY and the charity app's actual operation.
4. Leave Vacancy production untouched. No project deletion is required.

The owner authorized temporary charity downtime, not its deletion or permanent retirement. Record restoration results when performed; this document does not claim charity has already been restored.
