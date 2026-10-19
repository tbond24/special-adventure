# Private recovery prerequisite — concrete next action

The extra Free Supabase slot is already in use as `vacancy-admin-test` (`raauicmfyjpcuhfzknak`). It supplied the passing managed schema, customer/admin pilot, native zoom and real SMTP/reset tests. It is **a test destination, not a saved copy of the live database and photo objects**. Its original two Auth users and preserved legacy work must not be overwritten to simulate recovery.

Fresh production backup metadata returns `backups: null`, empty physical-backup details and PITR false. Connected Drive searches for Vacancy and Supabase backup returned zero results. Both connected mailboxes were searched for project-specific backup/recovery terms; the one match was a historical GitHub failed-run notification without attachments. These bounded searches do not prove no backup exists elsewhere. No customer database/object export or restore occurred.

## Free options and selected direction

| Option | Assessment |
| --- | --- |
| Use an existing authorized private database/photo recovery set | Best if supplied; no new live export needed. None has been identified through current access. A private location/link and recovery authority are still needed. |
| Create an encrypted coordinated checkpoint, then rehearse privately in existing free disposable Linux CI | Recommended next route if no recovery set exists. Requires explicit live-data export authority, an approved private destination/key-custody path and adequate existing quotas. No new Supabase slot or purchase is intrinsically required. |
| Reuse synthetic test data or the empty test database as the backup | Already useful procedure evidence; cannot recover actual live customer rows/photos and does not close this gate. |

The proposed destination is a new **private, unshared `Vacancy private recovery` folder in the connected Drive**, only after confirming its account/ownership/capacity. Keep all payloads encrypted before upload, with a separately protected owner recovery key; no key in chat, source control, public artifacts or the same backup folder. Owner key recovery must be verified before relying on the checkpoint. An existing owner-approved private destination/key pair can replace this proposal.

## Reviewable action boundary

1. Obtain explicit approval for **read-only export of live customer database data and photo objects from `xtutkwiivqkgkqjpkxvj`**. The existing [hosted scope](./ADMIN_HOSTED_RECONCILIATION_SCOPE_20261019.md) limits production to “metadata preservation checks only” and “No customer export”; this new data access is outside that boundary. A generic continuation does not select private custody or waive the boundary.
2. Verify the private destination, recipient encryption key/custody, existing secure read-only export credentials/operator and Free capacity. Do not create production roles, change passwords, use account-wide management authority in CI, buy capacity or pause projects. If the available tooling requires any additional permission/change, present the exact action first. This Windows host currently has no `pg_dump`, `psql` or Docker; the existing free Linux workflow supplies disposable restore tooling, not automatic production export authority.
3. Capture one consistent database checkpoint with schema/ACLs, Auth and Storage metadata, plus its coordinated photo/object manifest and bytes. [Database backups alone omit object bytes](https://supabase.com/docs/guides/platform/backups). Preserve original migration history and customer data; stop on capture inconsistency, missing objects, quota/rate limits or a required charge. Do not freeze/disable live writes, change SQL/Auth/SMTP, rotate keys or expose private paths/content under this request.
4. Encrypt before persistent upload. Verify ciphertext integrity, private access and recovery-key usability. Record only nonidentifying counts, timing and aggregate integrity results in the public review packet. No customer rows, messages, emails, media, object paths, tokens or dumps in GitHub artifacts/logs.
5. Restore to an isolated disposable environment with external email/webhooks/production network access disabled. Preserve the existing hosted test project and its archives. Verify original schema/ACLs/row digests, Auth consistency, complete photo referential integrity and measured restoration time. Exercise only new synthetic accounts after restoration. Remove decrypted transient restore files/stacks and retain the approved encrypted checkpoint privately.

One successful fresh checkpoint/drill does not establish ongoing backup protection. The free direction is coordinated encrypted offsite exports; an hourly cadence would target up to one hour of lost changes, with the previously proposed four-hour recovery objective. Feasibility and actual timings must be measured within existing quotas before adopting that policy; no ongoing schedule, protection guarantee or accepted loss window is inferred here.

## Status

**Prepared, not executed.** The managed SMTP/delivered-link and actual expired-JWT checks now pass separately. Actual private recovery still requires either an existing usable recovery set or the concrete export/custody authorization above. Human original-reference comparison/waiver, private access/fallback confirmation and exact live release approvals remain separate sign-off steps. PR #3 stays draft; both original branches and PR #2 are preserved; production is unchanged and nothing was purchased.
