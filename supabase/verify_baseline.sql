-- Vacancy production schema contract verification.
-- Read-only: safe to run before a migration.

with checks(name, ok) as (
  values
    ('latest migration owner_set_public_map_pin', exists(
      select 1 from supabase_migrations.schema_migrations
      where version='20260906184003' and name='owner_set_public_map_pin'
    )),
    ('properties.market_code exists', exists(
      select 1 from information_schema.columns where table_schema='public' and table_name='properties' and column_name='market_code'
    )),
    ('properties public coordinates exist',
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='properties' and column_name='public_latitude') and
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='properties' and column_name='public_longitude')
    ),
    ('vacancies generic rent terms exist',
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='vacancies' and column_name='rent_amount') and
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='vacancies' and column_name='rent_currency') and
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='vacancies' and column_name='rent_period')
    ),
    ('legacy rent compatibility retained',
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='vacancies' and column_name='weekly_rent') and
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='vacancies' and column_name='monthly_rent') and
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='vacancies' and column_name='bond')
    ),
    ('property private locations exists', exists(
      select 1 from information_schema.tables where table_schema='public' and table_name='property_private_locations'
    )),
    ('room inheritance overrides exist',
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='rooms' and column_name='smoking_allowed_override') and
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='rooms' and column_name='pets_considered_override')
    ),
    ('v2 create rpc exists', exists(
      select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='create_vacancy_listing_v2'
    )),
    ('v2 update rpc exists', exists(
      select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='update_vacancy_listing_v2'
    )),
    ('v2 child-unit rpc exists', exists(
      select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='create_unit_vacancy_for_property_v2'
    )),
    ('public map pin rpc exists', exists(
      select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='set_vacancy_public_location'
    )),
    ('private location owner read policy exists', exists(
      select 1 from pg_policies where schemaname='public' and tablename='property_private_locations' and policyname='property_private_location_owner_read'
    )),
    ('public active vacancy read policy exists', exists(
      select 1 from pg_policies where schemaname='public' and tablename='vacancies' and policyname='vacancies_public_active_read'
    )),
    ('message membership read policy exists', exists(
      select 1 from pg_policies where schemaname='public' and tablename='messages' and policyname='messages_member_read'
    ))
)
select name, ok from checks order by name;
