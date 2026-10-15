# Password-reset status proposal — separate from the admin release

This proposal branch starts from admin candidate `3b40bb9889c25a26ce68006d19a5923a6cc82ac3`. It does not change committed application files, production services or the admin release branch. The patch is applied ONLY in a disposable CI workspace; applying it to the release candidate requires review. No production deployment, database migration, Auth setting, secret or live account is touched.

## Verified baseline and existing defect

The original password-reset function passes the real normal path in [run 38695917689](https://github.com/tbond24/special-adventure/actions/runs/38695917689). Its downloaded evidence has 229 recorded PASS milestones with genuine local GoTrue, local SMTP, the original Edge Runtime handler, live Pwned Passwords range queries on synthetic passwords, new-password login and old refresh-token rejection. SMTP capture is not external inbox delivery.

A separate exact-handler offline test reproduces a pre-existing failure: GoTrue accepts the new password, then the sign-out fetch throws. The outer catch returns HTTP 503 saying the safety check or connection failed, although the password changed. An HTTP error from logout is currently not inspected either. This is not introduced by the admin editor.

## Minimal proposed change

After a successful password update, treat global sign-out as a second outcome. Return the existing success message with a boolean `sessionsRevoked`. A logout transport error or non-success HTTP response sets it to false; the recovery page then shows its existing incomplete-sign-out warning while preserving password success and clearing the form. Authentication, password-strength checks, padded SHA-1-prefix breach lookup and normal password update remain unchanged.

The flag confirms the logout endpoint outcome, not immediate invalidation of every issued access token. Supabase documents that access tokens can remain valid until expiry even after refresh tokens are revoked: https://supabase.com/docs/guides/auth/signout . This proposal does not introduce an access-token revocation mechanism or promise to resolve every lost-response ambiguity.

## What CI will test

`tests/recovery/status-proposal.patch` is checked against pinned source hashes, applied locally, syntax-checked, then tested with the existing offline fault suite plus logout transport/HTTP failures and success. These tests use explicit stubs.

The full disposable stack then tests the proposed source with real Auth, Storage, local SMTP capture, Edge Runtime and real breach lookup, retaining all existing editor/customer acceptance. One response field is deliberately changed at the browser boundary (`sessionsRevoked:false`) AFTER an actual successful reset so the existing UI warning is exercised. Evidence explicitly records this injection; it is not a claim that the real local logout failed. The independent offline tests exercise the handler's actual failure branches.

No user input or real credentials are needed. The target remains a reviewable proposal, not a release. The expected original Edge blob is `b6c89f37cd5ca6b6681308c0f55f1c1f748925cc`; the proposed Edge blob is `923b1582ad411348ebe2e26373047383a0e3da2f`.
