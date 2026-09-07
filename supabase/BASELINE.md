# Vacancy Supabase production baseline

Captured from production project `xtutkwiivqkgkqjpkxvj` on 2026-09-07.

This is a **live contract baseline**, not a rewritten migration history. Existing production migrations remain authoritative. Future schema changes must be additive migrations and must pass `verify_baseline.sql` plus stage-specific tests.

## Production migration ledger

1. `20260906125127_init_vacancy_core`
2. `20260906125146_lock_down_auth_trigger_function`
3. `20260906125231_harden_and_optimize_rls`
4. `20260906125325_protect_precise_property_location`
5. `20260906125338_create_room_media_storage`
6. `20260906130205_create_listing_rpc`
7. `20260906131857_secure_messaging_and_structured_enquiries`
8. `20260906132134_fix_blocked_conversation_enforcement`
9. `20260906132422_move_privileged_messaging_helpers_private`
10. `20260906132736_operations_analytics_and_expiry`
11. `20260906132903_allow_admin_moderation_updates`
12. `20260906140137_hide_inactive_listing_metadata`
13. `20260906142431_remove_vacancy_rls_recursion`
14. `20260906145608_allow_rls_helper_execution`
15. `20260906151733_add_fit_filters_and_listing_edit`
16. `20260906152847_add_pets_considered_and_listing_preferences`
17. `20260906161330_property_room_inheritance_defaults`
18. `20260906161514_create_listing_with_property_smoking_default`
19. `20260906163345_kenya_market_localisation`
20. `20260906163439_kenya_listing_edit_rpc`
21. `20260906183144_add_public_search_coordinates`
22. `20260906183613_generalise_market_and_rent_terms`
23. `20260906183759_lock_down_global_listing_rpcs`
24. `20260906184003_owner_set_public_map_pin`

## Public tables

- `profiles`
- `properties`
- `property_private_locations`
- `rooms`
- `vacancies`
- `media`
- `saved_vacancies`
- `conversations`
- `conversation_members`
- `messages`
- `reports`
- `blocks`
- `admin_users`
- `analytics_events`
- `client_errors`

## Current domain contract

### `properties`
Parent entity owned by a profile.

Important fields:
- `id uuid` PK
- `owner_id uuid` FK -> profiles
- `title text`
- `country text`
- `state text` (market UI may label this region/county/state)
- `city text`
- `suburb text` (market UI may label this locality/estate/suburb)
- `postcode text`
- `property_type text`
- `parking_spaces integer`
- `household_summary text`
- `pets_considered boolean`
- `smoking_allowed boolean`
- `landmark text`
- `water_available boolean`
- `electricity_available boolean`
- `security_available boolean`
- `internet_available boolean`
- `public_latitude numeric`
- `public_longitude numeric`
- `market_code text` constrained to two uppercase letters when non-null

Public coordinates are approximate search coordinates. They are deliberately separate from the exact address.

### `property_private_locations`
Owner-only exact location record.

Important fields:
- `property_id uuid` PK/FK -> properties
- `address_line text`
- `latitude double precision`
- `longitude double precision`

**Invariant:** anonymous users must not be able to read this table.

### `rooms`
Child unit under a property.

Important fields:
- `id uuid` PK
- `property_id uuid` FK -> properties
- `name text`
- `room_type text` legacy/core classification
- `unit_type text` market-facing unit label
- `furnished boolean`
- `ensuite boolean`
- `description text`
- `max_occupants integer` constrained 1..4 in DB
- `smoking_allowed_override boolean nullable`
- `pets_considered_override boolean nullable`

Null overrides mean inherit the parent property default.

### `vacancies`
Current availability/commercial record for a unit.

Important fields:
- `id uuid` PK
- `room_id uuid` FK -> rooms
- `status text`: draft | active | paused | expired | filled | removed
- `available_from date`
- `available_until date nullable`
- `minimum_stay_weeks integer nullable`
- `confirmed_at timestamptz`
- `expires_at timestamptz`
- `published_at timestamptz`
- `rent_amount numeric nullable`
- `rent_currency text nullable`, ISO-like 3 uppercase letters
- `rent_period text nullable`: night | week | month
- `deposit numeric nullable`
- `bills_included boolean`

Backward compatibility fields deliberately retained:
- `weekly_rent numeric NOT NULL`
- `bond numeric nullable`
- `monthly_rent numeric nullable`

Do **not** drop compatibility fields in a feature migration without a dedicated migration/rollback plan and production evidence.

### Enquiries / messaging
`conversations` contains `vacancy_id`, requested move-in, stay weeks and renter intro. Membership is in `conversation_members`; message bodies and `read_at` live in `messages`.

### Media
`media` belongs to exactly one property or room and contains owner, storage path, MIME type, sort order and status (`active|hidden|removed`). Public read is allowed only for active media attached to a room with a public vacancy; owners retain access to their own media.

## Current frontend-dependent RPCs

- `create_vacancy_listing_v2(...) -> uuid`
- `update_vacancy_listing_v2(...) -> uuid`
- `create_unit_vacancy_for_property_v2(...) -> uuid`
- `set_vacancy_public_location(uuid,numeric,numeric) -> uuid`
- `update_room_overrides(uuid,boolean,boolean) -> uuid`
- `update_property_defaults_ke(...) -> uuid` (legacy name still used for shared property defaults)
- `reconfirm_vacancy(uuid) -> void`
- `start_enquiry(uuid,date,integer,text,text) -> uuid`
- `send_message(uuid,text) -> uuid`
- `track_event(text,uuid,text) -> void`
- `record_client_error(text,text) -> void`
- `admin_overview() -> jsonb`
- `admin_deactivate_vacancy(uuid) -> void`

## Security/RLS invariants

- Public users may read only active/non-expired vacancy metadata (plus an owner's own records).
- Exact property locations are owner-only.
- Property/room/media writes require ownership.
- Vacancy create/update/delete requires authenticated ownership of the parent room/property.
- `create_vacancy_listing_v2`, `update_vacancy_listing_v2`, `create_unit_vacancy_for_property_v2`, and `set_vacancy_public_location` must not be executable by `anon`.
- Conversations/messages are visible only to conversation members.
- Report creation is self-attributed; admin read is admin-only.
- Admin moderation updates require admin membership.

## Storage assumption

Public listing media is stored in Supabase Storage bucket `room-media`. Browser code may use the public publishable Supabase key; **never commit a service-role key**.

## How to use this baseline

Before any DB feature:
1. run `supabase/verify_baseline.sql` against the target environment;
2. create a new named migration instead of editing old production migrations;
3. test ownership/RLS as anon and authenticated users;
4. preserve compatibility columns unless the migration explicitly owns their removal;
5. preview + E2E before production merge.
