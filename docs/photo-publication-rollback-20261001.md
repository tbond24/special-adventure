# Photo publication repair rollback

Current release: source commit `fd043ad`, deployment `dpl_4Jp5rhuChFrWnRSjE3DVEoNhrKJM`.
Previous live release: source commit `6c2ce1e`, deployment `dpl_Gey9J9YQtue6uWJKPzeqkcxYAp33`.

The frontend and database change must be rolled back together. First restore the previous definitions of `create_vacancy_listing_v4`, `create_unit_vacancy_for_property_v3`, and `reconfirm_vacancy` from the migration history (`20260909042422_atomic_listing_map_location.sql`, `20260910015301_add_optional_unit_fact_state.sql`, and `20260906132736_operations_analytics_and_expiry.sql`). Preserve the current authenticated-only grant on `reconfirm_vacancy` unless there is a reason to restore its earlier access. Then point `getvacancy.site` back to deployment `dpl_Gey9J9YQtue6uWJKPzeqkcxYAp33` and verify the domain. Never roll back only the frontend: its older publish flow does not activate draft listings after photo upload.

No existing listing rows were changed by these migrations. Drafts created during a failed upload should remain private for manual review; do not activate them in bulk.
