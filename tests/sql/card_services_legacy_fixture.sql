-- Disposable PostgreSQL QA only, following admin_appearance_local_bootstrap.sql.
-- Match the existing display contract with its optional service group hidden.
create table public.listing_display_options(
  slot text primary key,label text not null,enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.listing_display_options(slot,label,enabled) values
  ('card-services','Card and list service icons',false),('listing-water','Water in listing details',true);
alter table public.listing_display_options enable row level security;
revoke all on public.listing_display_options from public,anon,authenticated;
grant select on public.listing_display_options to anon,authenticated;
create policy listing_display_public_read on public.listing_display_options
  for select to anon,authenticated using(true);
