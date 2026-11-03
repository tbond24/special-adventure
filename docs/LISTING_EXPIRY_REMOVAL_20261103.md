# Remove automatic listing expiry — 3 November 2026

Status: **PREPARED, NOT LIVE**. Owner requested removal after production reads
found seven active-status listings hidden by the existing 21-day rule. Branch
`codespaces/remove-listing-expiry-20261103` follows audited latest development
`ed3aaf2` (PR59). Existing branches, drafts and rollback deployments are preserved.

The seven records' expiries elapsed between 22–29 October (Perth). Ten paused,
three draft and two archived records also remain stored. Expiry is a visibility
condition, not deletion or a status write. The owner chose removal rather than
reconfirmation. Use the existing supported `expires_at = NULL` meaning no expiry.
A private BEFORE trigger normalizes every active insert/update, covering legacy
create/edit/reconfirm RPCs. Activation clears only current active expiry fields,
preserving status, confirmation/publication dates and other fields. All original
RPC definitions, grants, RLS, photo/enquiry guards and historical observations stay
unchanged. Inactive statuses remain hidden.

The private RLS-protected checkpoint retains original dates and dates assigned
by subsequent legacy writers. Ordinary clients cannot access it or call the
trigger function. Guarded rollback removes the new trigger/function and restores
expiry only for matching record incarnations still carrying NULL. It preserves
later product edits, manual statuses, history and the checkpoint. No customer
identifiers or record exports are committed.

Admin copy no longer describes active listings as expiring. NULL expiry does not
falsely put confirmed records in Needs attention. The curated builder patches
only those two expressions in its preserved operations renderer; unrelated
handlers stay intact. Release version: `20261103-no-listing-expiry`.

## Admin change logging

Site changes audits real code/appearance releases; listing activity audits writes.
Clock-only expiry makes no listing write, so it creates no listing-edit entry.
Capacity history separately observes the live inventory decrease. Inspected
Site changes last stored a release on 28 October: recent Google-tag releases have
Git receipts but missing database feed entries. This omission was disclosed.
Clearing expiry legitimately records seven listing updates, not new publications.
Existing history and audit entries must be preserved.

## Verification before activation

- PASS: Node 24.21.0 and committed-lock `npm ci --ignore-scripts`.
- PASS: disposable PGlite 0.5.12 regression covers active-only restoration, future
  insert/edit/reconfirm, original function/ACL/policy equality, owner isolation,
  private checkpoint denial, photo failure/success, enquiry availability,
  publication idempotence, transaction rollback and guarded exact expiry rollback.
- PASS: actual curated composition/stability and four Google-tag checks, retaining
  G-H059DTQC6T and existing privacy/preview protections.
- Browser run: 160 existing passes / 22 intended skips; two new tests initially
  failed because eval-based test setup violated existing CSP. Normal same-origin
  script loading fixes the harness; focused desktop/mobile checks pass. CSP and
  assertions were not weakened. Committed-revision CI is pending; no clean full
  162-case run is yet claimed.
- SQL fixture corrections: existing bucket's 26-hour limit, totals after adding a
  positive publication case, and Date identity versus timestamp value. Corrected
  setup/assertions retain the actual behavior/rollback requirements.

## Activation and rollback

NOT LIVE at preparation checkpoint. No hosted writes made during preparation.
The requested removal restores the seven still-active listings; paused/draft/
archived remain hidden. Production test listings/messages/Auth/mail are unnecessary.

Migration: `supabase/migrations/20261103093051_remove_automatic_listing_expiry.sql`.
Tested rollback: `supabase/rollback/automatic_listing_expiry_20261103.sql`.
Frontend rollback: `dpl_9p7ERYZZx1beVEhrLPMEZwNSNVg7`,
https://vacancy-8sef8eosc-tbond24s-projects.vercel.app, product source `bbc582a`.
Native activation identity, source/asset checks, public counts, preservation
fingerprints and real release receipt follow after activation. Genuine signed-in
owner/MFA/provider acceptance remains UNVERIFIED.
