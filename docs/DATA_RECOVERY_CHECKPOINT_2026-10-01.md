# Vacancy data recovery checkpoint — 1 October 2026

This is a recovery inventory and drill plan, not a claim that a restore has succeeded. Do not restore into the live project to test a backup.

## Verified live inventory

Supabase project `xtutkwiivqkgkqjpkxvj` was `ACTIVE_HEALTHY` on 1 October 2026. Read-only counts were 14 profiles, 10 properties, 10 units, 10 listings, and 10 messages. Storage contained 42 `room-media` objects, 1 `profile-avatars` object, and 0 `conversation-media` objects. The last bucket is private. Counts are a point-in-time comparison aid, not a backup.

The `listing_activity_log` migration added an admin-only record of property, unit, and listing creation, changes, and deletion. It records actor ID, entity ID, action, status transition, and time; it deliberately does not copy listing descriptions, messages, or photos. It starts at migration time and cannot reconstruct older edits. Source changes remain in Git; deployed versions and rollbacks remain in Vercel.

## Recovery drill to complete before claiming recoverability

1. Confirm the Supabase plan, backup schedule, retention, and the timestamp of the latest restorable database backup in the project Backups page. Record those facts here.
2. Export the three Storage buckets separately to an access-controlled location. A database backup contains Storage metadata but not the photo/message object bytes. Preserve the private status of `conversation-media` during restore.
3. Restore the latest database backup into a separate project or local instance. Never point Vacancy's production domain or API keys at the drill target.
4. Copy Storage objects and bucket policies to that target. Reconfigure Auth email/redirect settings and Edge Functions for the isolated target. Use disposable credentials.
5. Compare profile, property, unit, listing, message, and per-bucket object counts with a snapshot captured immediately before the backup. Open a sample listing photo and private conversation attachment with appropriate test accounts; verify private media is denied to strangers.
6. Exercise one disposable listing create/edit/archive and one two-account message exchange on the isolated target. Document the backup timestamp, restore duration, missing objects, and any failed permissions. Delete the drill target only after preserving the report.

The actual backup timestamp, retention, object export, and restore result have **not yet been verified**. Do not use this checkpoint as proof of recoverability until steps 1–6 are recorded. Supabase's restore-to-new-project flow can require a paid plan; confirm cost before starting it.
