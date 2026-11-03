# Remove automatic listing expiry — 3 November 2026

Status: **LIVE and publicly verified on 3 November 2026**. Owner requested removal after production reads
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

## Preparation checkpoint and rollback

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

## Published completion receipt

The authorized rule removal is LIVE. Product source
`8610a753729c0854caccd386aa6003f43099f792`, production READY
`dpl_5xMoEuTRDC1AmyakHTJ6PB7k6hSZ`, serves https://getvacancy.site.
Staged `dpl_5eesCVir6wJyLk8Q1TeX6ZvaQXZk` and production were verified before
the canonical alias moved. Both 124-file provider source trees match, and all
116 public asset hashes match stage, production and canonical live. The exact
appended Vercel feedback script is normalized for HTML checks; raw/normalized
hashes are retained. Six assets differ from the prior manifest, including cache
versions; unrelated curated operations handlers remain unchanged.

Native migration `20261103095022` / `remove_automatic_listing_expiry` corresponds
to local `20261103093051_remove_automatic_listing_expiry.sql`, applied once through
the native migration tool. SQL SHA-256:
`85ced4debe39cb30c96702ff2b438be4f76b50f97a859036db87c9993018836a`.
Do not replay a second migration because local and provider timestamps differ.

- PASS: the seven still-active records now have NULL expiry. Public anonymous
  feed returns exactly seven; all seven generated listing pages return HTTP 200
  with valid article/canonical metadata and one retained Google tag. The actual
  live browse client loads all seven through its public API with no writes.
- PASS: status counts remain 7 active / 10 paused / 3 draft / 2 archived. Native
  non-expiry-field and inactive-row fingerprints match exactly. Confirmation,
  publication dates, ownership, photos and other fields were not rewritten.
- PASS: all original function definitions/ACLs and public/private policies retain
  their fingerprints. Seven private checkpoint rows preserve the old expiries;
  RLS is enabled and anonymous/member reads are denied. Trigger body matches the
  tested rollback guard.
- PASS: all 254 original activity records, 176 preceding hourly snapshots and
  172 prior change observations retain exact prefix hashes. A real new capacity
  observation at activation records 7 live listings. The seven expiry updates
  legitimately add update audit entries, without new publication/status events.
- PASS: exact-source SQL CI [41613525360](https://github.com/tbond24/special-adventure/actions/runs/41613525360).
  Exact-source workspace CI [41613525348](https://github.com/tbond24/special-adventure/actions/runs/41613525348),
  job 125841137671, passes six Node checks plus chart checks and **162 browser
  cases / 22 intentional skips**. This supersedes the local harness failures
  disclosed above; the final product/test source was not weakened.
- PASS: actual Google library loads HTTP 200 once per checked app/recovery
  document; excluded browsers have zero collection attempts and page errors.
  Private preview CSP/API/tag-sanitization and both deployment guards remain.
- Security: no new WARN/ERROR advisor. One intentional INFO reports RLS without
  policies on the private rollback checkpoint, whose client privileges are
  revoked. Original 78 findings remain; unrelated security settings were not changed.

The actual release is now in Site changes: one Code release entry plus Listing
availability, Overview cards and Admin operations sections, all tied to the real
commit/deployment. The existing recorder ran under a locked true-coverage guard;
engagement enabled/start time remain unchanged. Admin audit is independent of
visitor analytics exclusion. Earlier Google-tag feed omissions are not backdated
or silently described as fixed. No history/audit entries were deleted.

Rollback remains the tested SQL file above, followed by restoring preceding
frontend `dpl_9p7ERYZZx1beVEhrLPMEZwNSNVg7`. It restores saved expiries, keeps
later product/status edits and all history/checkpoints, and fails closed on a
changed trigger/function. Rollback was retained, not executed. No production test
listing, enquiry/message, Auth, mail, role, credential, environment or DNS changes
were made. Genuine signed-in owner/Admin/MFA/provider acceptance and Google
Tag Assistant/Realtime receipt remain UNVERIFIED.

Evidence: [live verification](evidence/listing-expiry-live-20261103.json),
[before fingerprints](evidence/listing-expiry-before-20261103.json),
[exact frontend manifest](LISTING_EXPIRY_RELEASE_MANIFEST_20261103.json).
Draft [PR60](https://github.com/tbond24/special-adventure/pull/60) remains unmerged.
