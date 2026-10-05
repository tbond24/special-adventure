# Email deliverability repair — 5 October 2026

## Applied
- Live Vercel DNS: _dmarc.getvacancy.site TXT "v=DMARC1; p=none".
- Record ID rec_fa66c2dae37f551490df117c. Previously no DMARC record.
- SPF/DKIM, sending identity, templates, public app and mailbox labels unchanged.
- Retired stage2-auth-probe.spec.js, which sent real signups to invented deployment-domain addresses.
- Its manual workflow now runs isolated server validation tests with mocked external I/O.
- Removed live leaked-password signup request from vacancy.spec.js. Browser validation aborts any signup attempt and asserts zero signup requests.
- Synthetic persona/session account creation now refuses hosted APIs and local APIs with email confirmation enabled.

## Evidence
- Authoritative DNS and Cloudflare public resolver return new policy.
- Gmail reset received 2026-10-05 08:33:29 UTC: SPF PASS, DKIM PASS, DMARC PASS; labels still SPAM.
- Inbox placement remains unresolved. No claim that DNS alone fixes reputation.
- Three server validation tests passed.
- Two browser weak-password tests passed (desktop and Pixel 7 emulation); zero signup requests.
- Six guard scenarios passed with mocked API: hosted blocked with zero calls, local mail-confirmation-on blocked before signup, local auto-confirm permitted, for both suites.
- Earlier browser runs failed on obsolete selectors; updated final tests passed.
- Syntax and diff whitespace checks passed.

## Remaining
- Google Postmaster Tools not connected: requires an authenticated Google Postmaster session and its domain-verification token. Gmail connector access alone does not provide Postmaster administration. Low volume may leave reports empty.
- No DMARC report recipient configured because no designated reporting mailbox/service exists. p=none establishes policy, not automatic report collection.
- Repeat inbox placement with additional consenting recipients; do not manufacture traffic or send to fake addresses.
- Historical 34 sends / 4 bounces (11.76%), 0 reported complaints; small sample, not proof of Gmail's reason.
- No live tests of local Supabase scenario flows in this change; only their sending guards exercised.

## Rollback
Source checkpoint: rollback/before-email-deliverability-20261005 at 17479ee9821584305dd6af8c615b10fbb49e9e87.
Revert this scoped source commit to recover test files; do not rerun the unsafe old live probe.
DNS recovery is separate: remove ONLY record rec_fa66c2dae37f551490df117c with Vercel DNS management. A source revert does not undo DNS. No database migrations or app deployment required.
