# Preserve-data rollback / disable plan

No rollback was executed. These are review notes for the authorized deployer.

## Preferred rollback

1. Stop the new account-draft publishing UI through the reviewed app deployment/feature control. Keep the original listing UI and old untagged upload behavior available.
2. Preserve both draft tables, every manifest/head, `listing-draft-media`, public and private Storage objects, durable request mappings and all existing listings.
3. Preserve the narrowly scoped public-upload policy and final-write trigger while any new tagged-path clients may remain open. Removing them could reopen the stale upload race. They return ordinary untagged behavior unchanged.
4. If a DB-side emergency stop is required, deny new tagged-path uploads in both the preflight helper and actual INSERT trigger, and revoke authenticated execute access to the new mutating draft RPCs and their private implementations. Leave owner SELECT/read access and private-photo reads available where safe. Such changes must be separately reviewed/applied by the parent; no emergency-stop SQL is automatically executed here.
5. Do not forcibly alter active tokens, discard snapshots, reset UUIDs, or rewrite durable mappings. Preserve them for explicit recovery after repair. A later restored feature reads the authoritative head/revision and requires an explicit user decision before resuming publication.

## Never use destructive rollback

- Do not DROP either table or the private bucket.
- Do not DELETE draft manifests, Storage objects or staged vacancy records.
- Do not restore a previous schema by recreating existing public listing/photo/auth policies.
- Do not empty `created_units` or `published_units`; these are the stable creation/publication identities that prevent duplicates.
- Do not automatically republish pending content when restoring functionality.

## Recovery after a fixed deployment

Re-run the local owner/RLS/CAS suites, independently review the complete bundle, verify hosted grants/advisors, and perform only authorized hosted checks. A recovered account reads its last complete immutable snapshot. If it was publishing, an explicit current-token CAS finish creates the remaining editable snapshot; completed IDs stay durable. Then the user may edit, save or press Publish again.

The old untagged publishing APIs and pre-existing policy definitions were never changed by this candidate. The application rollback therefore does not need to remove existing security guards or delete newly saved user data.
