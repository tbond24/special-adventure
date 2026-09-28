-- Comparison price is an optional former rent in the listing's own currency and period.
alter table public.vacancies add column if not exists compare_price numeric;
alter table public.vacancies add column if not exists show_compare_price boolean not null default false;
alter table public.vacancies add constraint vacancies_compare_price_valid
  check (not show_compare_price or (rent_amount is not null and compare_price > rent_amount));

-- A small fixed set of existing visual elements, controlled by MFA-verified admins.
create table public.listing_display_options (
  slot text primary key,
  label text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.listing_display_options(slot,label) values
  ('card-services','Card and list service icons'),
  ('listing-wifi','Wi-Fi in listing details'),
  ('listing-parking','Parking in listing details'),
  ('listing-furnished','Furnished in listing details'),
  ('listing-ensuite','Private ensuite in listing details'),
  ('listing-bills','Utilities included in listing details'),
  ('listing-security','Security in listing details'),
  ('listing-custom','Lister-added features in listing details'),
  ('listing-water','Water in listing details'),
  ('listing-electricity','Electricity in listing details');
alter table public.listing_display_options enable row level security;
revoke all on public.listing_display_options from anon,authenticated;
grant select on public.listing_display_options to anon,authenticated;
create policy listing_display_public_read on public.listing_display_options
  for select to anon,authenticated using (true);

create or replace function public.admin_set_listing_display_option(p_slot text,p_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin((select auth.uid())) then
    raise exception 'Not an MFA-verified administrator' using errcode='42501';
  end if;
  update public.listing_display_options
  set enabled=coalesce(p_enabled,false),updated_at=now()
  where slot=p_slot;
  if not found then raise exception 'Unknown listing detail' using errcode='22023'; end if;
end $$;
revoke all on function public.admin_set_listing_display_option(text,boolean) from public,anon,authenticated;
grant execute on function public.admin_set_listing_display_option(text,boolean) to authenticated;
