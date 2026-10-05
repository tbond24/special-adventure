# Resend authentication template integration — prepared, NOT deployed

## Goal
Use published Resend aliases vacancy-confirm-email and vacancy-reset-password for signup and recovery, including each event's new ACTION_URL and escaped DISPLAY_NAME. Resend remains the source of future published template changes.
The newer reset-your-password-template has no variables and a fixed old recovery URL; it is not selected or modified.

## Prepared source
supabase/functions/send-auth-email/index.ts + handler.mjs.
Pinned standardwebhooks 1.0.0 verifies signed raw webhook bodies and timestamps before email sending.
Invalid/expired signatures rejected. Retry keys deduplicate repeated hook events.
Other auth actions retain functional plain emails; email change supports both recipients and guest upgrades without an old address.
No secrets, authentication payloads or links are logged.
No public site changes or database migrations.

## Verification
10 local tests pass: template selection and dynamic URL, HTML escaping, email change mapping, guest first email, actual library signatures/expiry, unsupported/missing payload refusal, delivery failures, remaining action handling, existing signup validation.
Not verified: deployed endpoint, actual Supabase webhook, Gmail rendering, link completion through the new hook.

## Production gate
Automatic approval review rejected the combined credentials/deployment command. It requires explicit approval to persist VACANCY_AUTH_HOOK_SECRET and VACANCY_AUTH_RESEND_KEY, deploy send-auth-email with verify_jwt=false (signed webhook authentication instead), and activate the Supabase Send Email hook after verification.
No production secrets or function were changed by that rejected command.
A sending-only, Vacancy-domain-restricted Resend key was created, stored privately outside source.
Production SMTP remains active and unchanged.

## Completion sequence after approval
Generate hook secret privately. Store both secrets in Supabase.
Deploy function, verify missing/invalid signatures denied.
Exercise signed delivery for an approved recipient and confirm template variables.
Inspect exact auth config diff; apply only send_email hook enabled, uri and secrets. Preserve SMTP for rollback.
Test real recovery and confirmation via approved Gmail account/alias and follow actual links.
If any failure, disable hook immediately; Supabase uses preserved SMTP.
Do not claim Inbox placement from sender acceptance.

## Rollback
Source checkpoint rollback/before-resend-auth-templates-20261005 at 584af8a.
Production currently needs no rollback because hook is not deployed/activated.
After activation disable auth.hook.send_email.enabled to return to unchanged SMTP; no database rollback.
Private configuration snapshot ../auth-email-hook-private/config-before.toml and diff.log contain observed nonsecret SMTP settings. CLI intentionally does not export SMTP password. Do not overwrite SMTP.
