# Vacancy production auth email setup

This runbook resolves Stage 2A. It is provider-agnostic; Resend is the current first choice because it is simple for transactional email, but Supabase Auth must remain independent of the provider.

## Current state

- Supabase Auth project: `xtutkwiivqkgkqjpkxvj`
- Public signup goes through `secure-signup` -> HIBP password check -> Supabase `/auth/v1/signup`.
- Email confirmations must remain enabled for the production marketplace.
- Built-in Supabase email delivery has already produced `over_email_send_rate_limit` in runtime testing.
- Vacancy currently has no custom Vercel domain; only `vacancy-nine.vercel.app` and `vacancy-tbond24s-projects.vercel.app` are attached.
- Do not use a `vercel.app` hostname as if it were a DNS domain controlled for email sending.

## Chosen architecture

```text
Vacancy signup UI
  -> secure-signup Edge Function
     -> password/HIBP checks
     -> Supabase Auth
        -> custom SMTP
           -> transactional email provider
              -> renter/lister mailbox
```

Supabase owns identity/session state. The mail provider only transports Auth emails.

## Recommended provider: Resend

Equivalent providers such as Postmark, Amazon SES or SendGrid are acceptable if already preferred.

### Suggested sender layout

Acquire/use a domain controlled by Vacancy, then dedicate an Auth subdomain, for example:

```text
auth.<vacancy-domain>
```

Suggested From address:

```text
Vacancy <no-reply@auth.<vacancy-domain>>
```

Using a dedicated transactional subdomain isolates authentication reputation from future marketing mail.

## Resend setup

1. Create/connect a Resend account.
2. Add the Vacancy-controlled sending domain/subdomain.
3. Add the DNS records Resend provides and wait until domain verification is complete.
4. Create a scoped API key for Supabase Auth SMTP.
5. Do not commit that API key anywhere in GitHub or browser code.

Typical Resend SMTP values:

```text
Host: smtp.resend.com
Port: 465 (secure SMTP preferred)
Username: resend
Password: <Resend API key>
Sender email: no-reply@auth.<vacancy-domain>
Sender name: Vacancy
```

Always confirm current provider settings in provider documentation at setup time.

## Supabase dashboard configuration

In the Vacancy Supabase project, configure **Authentication -> Emails / SMTP Settings** (wording may vary over time):

- enable custom SMTP;
- set host;
- set secure port;
- set SMTP username;
- set SMTP password/API key;
- set sender name/address;
- keep email/password signup enabled;
- keep email confirmation enabled;
- ensure the Site URL and allowed redirect URLs point to the intended Vacancy production/preview URLs.

Do not raise email rate limits before the custom provider is verified and a basic abuse policy is in place.

## DNS/security baseline

For the sending domain/subdomain:

- SPF: use the record required by the provider;
- DKIM: add the provider-supplied DKIM records;
- DMARC: publish a DMARC policy appropriate for initial monitoring and tighten once delivery is understood;
- do not reuse unrelated store/business sending identities for Vacancy unless intentionally approved.

## Verification sequence

After SMTP is configured, resume the exact Stage 2A test sequence:

1. Generate a new unique real test email at a mailbox/domain we control for CI/testing.
2. Submit through the real `secure-signup` endpoint.
3. Assert no `email_address_invalid`, `email_address_not_authorized`, built-in SMTP restriction, or provider rate-limit error.
4. Retrieve the confirmation email through the controlled test mailbox.
5. Follow/verify confirmation.
6. Assert a usable session via `/auth/v1/user`.
7. Sign out.
8. Sign back in using email/password.
9. Self-delete using the existing `delete-account` Edge Function.
10. Query `auth.users` to prove the disposable account is gone.
11. Run Stage 1 20/20 regression unchanged.

Only then mark Stage 2A PASS.

## CI design after Stage 2A

Do not create random real-recipient email addresses for every build.

Preferred long-term options:

1. dedicated controlled test inbox/domain with plus-address/alias support and deterministic cleanup;
2. isolated Supabase branch/local Auth + Mailpit for most CI, plus periodic production smoke test;
3. provider test mailbox/API if it preserves the same confirmation/session semantics.

The production E2E should remain low-frequency to avoid spamming or exhausting provider quotas.

## Do not do these

- Do not disable email confirmation solely to make tests pass.
- Do not expose a service-role user-creation endpoint to the browser.
- Do not insert directly into `auth.users` as a substitute for testing signup.
- Do not commit SMTP/API credentials.
- Do not rely on Supabase's built-in SMTP as the launch email system.
- Do not use an unrelated project/domain without explicit approval.

## Stage 2A completion record

When complete, append:

```text
Provider:
Sending domain:
Sender:
Supabase config date:
Auth probe run:
Signup/confirm/signin/delete: PASS/FAIL
Stage 1 regression: PASS/FAIL
Checkpoint:
```
