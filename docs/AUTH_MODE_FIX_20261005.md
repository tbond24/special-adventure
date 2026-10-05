# Account-creation report follow-up — 2026-10-05

## Fixed and published
Release source: eedb15d. Production deployment: vacancy-jbsdccrbr-tbond24s-projects.vercel.app, explicitly aliased to getvacancy.site.

1. Switching Create account -> Sign in removes the password pattern attribute instead of assigning an empty pattern. Existing sign-in passwords are not subjected to new-account rules.
2. Signup displays its existing minimum length, uppercase/lowercase and number requirements. This helper text is the only new visible element; existing layout/styles are reused.
3. Whitespace-only names are rejected in the form and deployed secure-signup function; valid names are trimmed. Server name length matches the existing 80-character field. Existing password checks, endpoint authentication settings and response behavior are preserved.

No other production page, database schema or admin feature changed.

## Evidence
- Full application with scripts and CSS, isolated backend responses: original mode-switch case failed (0 backend calls); corrected case passed on desktop and mobile.
- Four new browser checks passed: mode switching, existing shorter password, repeated switching, blank names, weak signup password and valid Enter submission.
- Four neighboring password visibility/reset-feedback checks passed. Initial reset harness failures were caused by the dev server CSP blocking the mock endpoint; the test now isolates remote requests and removes only its local CSP. Password-reset production code was not changed.
- Three isolated server-function tests passed: invalid names produce no external calls; valid names trim and password rules remain; breached-password response parsing rejects a later-line match.
- Live secure-signup version 2 rejects a whitespace name with HTTP 400 invalid_name.
- Owner approved a separate Gmail test alias. Existing primary account was checked for existence only and left untouched.
- Real live browser path Find -> List -> Create account returned HTTP 200 at 07:54 UTC. The database independently confirmed a new unconfirmed account and confirmation issuance. This does not prove mailbox delivery or a usable confirmed account.

## Pending completion gate
Await the owner's receipt and use of the confirmation email. Then execute real sign-in after mode switching, refresh persistence, sign-out and signed-out refresh on desktop and mobile. Do not mark these as passed until executed.
Google login, real password-reset email flow, guest upgrade, actual duplicate-account behavior and physical-device compatibility remain unverified by this focused repair.

Private generated test credentials and the prepared login runner are outside the repository/app in ../auth-account-verification-20261005/. Credentials are not printed, committed or deployed. Do not rerun signup blindly; inspect the existing test account first. No confirmation links or codes need to be shared in chat.

## Recovery
Source checkpoint: rollback/before-auth-mode-fix-20261005 (c4c94f2). Restore previous deployment vacancy-mnjx5h8t9-tbond24s-projects.vercel.app and explicitly reassign getvacancy.site. If server recovery is needed, redeploy docs/rollback/secure-signup-before-name-validation.ts as secure-signup, preserving verify_jwt=false (its pre-existing public signup setting). A frontend rollback does not roll back the Edge Function. Preserve the test account until verification is complete; no existing account or customer data was deleted.
