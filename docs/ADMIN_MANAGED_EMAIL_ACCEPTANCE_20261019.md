# Managed SMTP, delivered callback and real token expiry

The remaining **isolated managed SMTP/emailed-link** and **actual expired-JWT** checks PASS. [Sanitized permanent evidence](./evidence/admin-managed-email-20261019.json) records the real request, independent Inbox receipt, exercised delivered link, negative assertions, restored test configuration and final preservation checks. These extend the already passing [hosted pilot/Linux acceptance](./ADMIN_HOSTED_PILOT_ACCEPTANCE_20261019.md); production release remains HOLD for actual recovery and human/operational approvals.

## Real managed delivery and callback

The existing deployed lab's visible forgot-password form sent one request to **managed Supabase Auth in `vacancy-admin-test`**. Native Auth delivered through the existing domain-restricted test-only Resend credential over SMTP. This was **not** local SMTP capture, a forwarded message or an admin-generated OTP for the delivered-link test.

- Request began **08:16:51.821 UTC**, 19 October; managed response HTTP **200** with the generic privacy-preserving acknowledgement.
- The approved inbox received the exact fresh synthetic-account message in **Inbox at 08:16:57 UTC**, about five seconds later, with **SPF, DKIM and DMARC passing**. A Gmail alias reached only the already approved inbox and avoided either existing test account. No address, account/message ID, raw mail, token or reset link is committed.
- Independent inspection matched the expected sender/recipient and only the fixed test project's `/auth/v1/verify` recovery link, with the **exact protected lab callback**, before following it. Email content supplied no instructions to the test runner. The link's SHA-256 is retained, not the link itself.
- That same delivered link traversed real managed verification and the allowed deployed callback, opened the existing reset form, scrubbed credentials from the URL and left no normal signed-in recovery session.
- The existing form completed the unchanged deployed `secure-password-reset` handler (frozen blob `923b1582ad411348ebe2e26373047383a0e3da2f`), live HIBP check and global session revocation. Old password, both previous normal refresh tokens and consumed-link reuse failed; new-password visible login succeeded.

Provider usage changed from **0 to 1** daily and **15 to 16** monthly emails, within the existing allowance of 100/day and 3,000/month. Exactly **one external email** was sent; later token tests sent none. No provider purchase, key creation/rotation, DNS/domain change or production SMTP/Auth change occurred. The isolated result does not certify unprobed production mail configuration; any production probe remains separately approved work.

## Secure configuration and preservation

The existing credential and approved recipient remained encrypted GitHub environment secrets. [Free restricted run 39220977726](https://github.com/tbond24/special-adventure/actions/runs/39220977726) at `1e95e367dda41d0f94f92bd6f221f86b45508794` sealed only those test values to a fresh local RSA-3072 OAEP/SHA-256 public key. Two synthetic tests verify roundtrip, wrong-recipient rejection, weak-key rejection and size limits. CI received no database password, Supabase service key or account management token; the local private recipient key never entered CI. No plaintext sender credential appeared in commands, files or logs.

The local operator decrypted it in memory for the installed CLI's fixed **test-project** target. A minimal declared-field diff reviewed only SMTP sender and exact site/callback settings; undeclared confirmation/MFA/database/security settings were left unchanged. CLI diagnostics redact the test credential and recipient. The one-hour actor broker accepted only a nonce-authenticated, fixed fresh account in the approved inbox, never arbitrary recipients, SQL or service-key retrieval.

After execution, the synthetic account and its sessions were removed. Test SMTP was disabled and original site URL, redirect list, token lifetime, confirmation and TOTP settings restored. A fresh full config pull matches every previously captured active setting path/value; secret values are provider-masked and not read back. The two original encrypted GitHub email secrets retain their original timestamps. The ciphertext transfer artifact was removed after use; its run outcome/source and ciphertext digest are retained. Temporary local private key/credential-bearing files are removed after evidence verification. The broker now returns HTTP **410**, and the lab share link is revoked (fresh request redirects to Vercel SSO without an access cookie).

## Actual token expiry

A separate no-mail test temporarily set **only the isolated project's JWT lifetime to 60 seconds**, created a fresh tagged customer and exchanged a genuine admin-generated recovery OTP. Its **unmodified provider-signed JWT** was accepted by Auth and reached weak-password validation in the frozen reset service before expiry. Two seconds after its actual `exp`, Auth returned **HTTP 403 with an expired-token reason**, and the frozen Edge returned **HTTP 401**. No password change, timestamp manipulation, forged token or production Auth setting was used. The account/sessions were removed and original **3600-second** setting restored.

The first probe remains **FAIL**: its assertion required Auth HTTP 401 rather than accepting the provider's HTTP 403 denial. The second probe records actual statuses and an explicit expired reason; this was a harness correction, not a change to the frozen handler. No general clock-skew or network-timeout guarantee is claimed. [Supabase's current Auth source](https://github.com/supabase/auth/blob/master/internal/api/auth.go) returns a forbidden error for invalid JWT claims.

## Final state and next gate

Independent verification confirms exactly the two original Auth users; zero managed-mail or earlier hosted actors, profiles/admin memberships/roles, properties, drafts, Storage objects or changed presentation values. Original rows/OIDs/sequences/Auth/receipt checks and all 20 archived function OIDs/bodies pass. Actual source/provider receipts remain **86 / 45**. Renter collection stays false, its target 30 days and event count zero. Product, all canonical SQL/candidates, dependencies and frozen handler bytes remain unchanged.

Both projects remain ACTIVE_HEALTHY. Production still serves `dpl_558VydjBz3tjnsNok5wgGQsoKZRz`. PR #3 stays OPEN DRAFT/MERGEABLE, auto-merge unset; both original branch tips and PR #2 remain unchanged. No purchase, new project, project pause/resume, customer-data export, production SQL/setting/deployment or merge occurred.

**Actual recovery is still blocked by the absence of an identified live database/photo recovery set**, not by lack of a test slot. Fresh backup metadata and bounded Drive/mailbox searches found none; the one mailbox match was an old CI notification. The [concrete free private-recovery request](./ADMIN_PRIVATE_RECOVERY_REQUEST_20261019.md) explains the test-slot distinction and the exact extra data/custody authority needed to create a checkpoint. Original conversations/attachments not present in mirrored sources remain inaccessible. Original-reference waiver/comparison, private access/fallback confirmation, human review and exact production-operation approvals remain separate; they cannot be self-approved by this test run.
