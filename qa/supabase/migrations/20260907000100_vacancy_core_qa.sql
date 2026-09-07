create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  bio text,
  phone_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  country text not null,
  state text not null,
  city text not null,
  suburb text not null,
  postcode text,
  market_code text check (market_code is null or market_code ~ '^[A-Z]{2}$'),
  property_type text,
  parking_spaces integer not null default 0 check (parking_spaces between 0 and 50),
  pets_considered boolean not null default false,
  smoking_allowed boolean not null default false,
  household_summary text,
  landmark text,
  water_available boolean not null default false,
  electricity_available boolean not null default true,
  security_available boolean not null default false,
  internet_available boolean not null default false,
  public_latitude numeric(9,6) check (public_latitude is null or public_latitude between -90 and 90),
  public_longitude numeric(9,6) check (public_longitude is null or public_longitude between -180 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.property_private_locations (
  property_id uuid primary key references public.properties(id) on delete cascade,
  address_line text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  room_type text not null default 'room',
  unit_type text,
  furnished boolean not null default false,
  ensuite boolean not null default false,
  max_occupants integer not null default 1 check (max_occupants between 1 and 4),
  smoking_allowed_override boolean,
  pets_considered_override boolean,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vacancies (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  weekly_rent numeric not null check (weekly_rent > 0),
  bond numeric check (bond is null or bond >= 0),
  monthly_rent numeric,
  deposit numeric check (deposit is null or deposit >= 0),
  rent_amount numeric check (rent_amount is null or rent_amount > 0),
  rent_currency text check (rent_currency is null or rent_currency ~ '^[A-Z]{3}$'),
  rent_period text check (rent_period is null or rent_period in ('night','week','month')),
  bills_included boolean not null default false,
  available_from date not null,
  minimum_stay_weeks integer check (minimum_stay_weeks is null or minimum_stay_weeks > 0),
  status text not null default 'draft' check (status in ('draft','active','paused','expired','filled','removed')),
  confirmed_at timestamptz,
  expires_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete cascade,
  storage_path text not null,
  mime_type text,
  sort_order integer not null default 0,
  status text not null default 'active' check (status in ('active','hidden','removed')),
  created_at timestamptz not null default now(),
  check ((property_id is not null)::int + (room_id is not null)::int = 1)
);

create table public.saved_vacancies (
  user_id uuid not null references public.profiles(id) on delete cascade,
  vacancy_id uuid not null references public.vacancies(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, vacancy_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.vacancies(id) on delete cascade,
  requested_move_in date,
  stay_weeks integer check (stay_weeks is null or stay_weeks > 0),
  renter_intro text,
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  vacancy_id uuid references public.vacancies(id) on delete set null,
  reported_user_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  event_name text not null,
  vacancy_id uuid references public.vacancies(id) on delete set null,
  route text,
  created_at timestamptz not null default now()
);

create table public.client_errors (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  error_code text not null,
  route text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,display_name)
  values(new.id,coalesce(new.raw_user_meta_data->>'display_name',''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create or replace function private.vacancy_room_owned_by(p_room_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path=public,private as $$
  select exists(select 1 from public.rooms r join public.properties p on p.id=r.property_id where r.id=p_room_id and p.owner_id=p_user_id);
$$;
create or replace function private.room_has_public_vacancy(p_room_id uuid)
returns boolean language sql stable security definer set search_path=public,private as $$
  select exists(select 1 from public.vacancies v where v.room_id=p_room_id and v.status='active' and (v.expires_at is null or v.expires_at>now()));
$$;
create or replace function private.property_has_public_vacancy(p_property_id uuid)
returns boolean language sql stable security definer set search_path=public,private as $$
  select exists(select 1 from public.rooms r join public.vacancies v on v.room_id=r.id where r.property_id=p_property_id and v.status='active' and (v.expires_at is null or v.expires_at>now()));
$$;
create or replace function private.profile_has_public_vacancy(p_profile_id uuid)
returns boolean language sql stable security definer set search_path=public,private as $$
  select exists(select 1 from public.properties p join public.rooms r on r.property_id=p.id join public.vacancies v on v.room_id=r.id where p.owner_id=p_profile_id and v.status='active' and (v.expires_at is null or v.expires_at>now()));
$$;
grant execute on function private.vacancy_room_owned_by(uuid,uuid) to anon, authenticated;
grant execute on function private.room_has_public_vacancy(uuid) to anon, authenticated;
grant execute on function private.property_has_public_vacancy(uuid) to anon, authenticated;
grant execute on function private.profile_has_public_vacancy(uuid) to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_private_locations enable row level security;
alter table public.rooms enable row level security;
alter table public.vacancies enable row level security;
alter table public.media enable row level security;
alter table public.saved_vacancies enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.analytics_events enable row level security;
alter table public.client_errors enable row level security;

create policy profiles_public_or_self_read on public.profiles for select to anon,authenticated using (id=(select auth.uid()) or private.profile_has_public_vacancy(id));
create policy profiles_self_update on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));

create policy properties_public_or_owner_read on public.properties for select to anon,authenticated using (owner_id=(select auth.uid()) or private.property_has_public_vacancy(id));
create policy properties_owner_insert on public.properties for insert to authenticated with check (owner_id=(select auth.uid()));
create policy properties_owner_update on public.properties for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy properties_owner_delete on public.properties for delete to authenticated using (owner_id=(select auth.uid()));

create policy private_location_owner_read on public.property_private_locations for select to authenticated using (exists(select 1 from public.properties p where p.id=property_id and p.owner_id=(select auth.uid())));
create policy private_location_owner_insert on public.property_private_locations for insert to authenticated with check (exists(select 1 from public.properties p where p.id=property_id and p.owner_id=(select auth.uid())));
create policy private_location_owner_update on public.property_private_locations for update to authenticated using (exists(select 1 from public.properties p where p.id=property_id and p.owner_id=(select auth.uid()))) with check (exists(select 1 from public.properties p where p.id=property_id and p.owner_id=(select auth.uid())));

create policy rooms_public_or_owner_read on public.rooms for select to anon,authenticated using (private.room_has_public_vacancy(id) or exists(select 1 from public.properties p where p.id=property_id and p.owner_id=(select auth.uid())));
create policy rooms_owner_insert on public.rooms for insert to authenticated with check (exists(select 1 from public.properties p where p.id=property_id and p.owner_id=(select auth.uid())));
create policy rooms_owner_update on public.rooms for update to authenticated using (exists(select 1 from public.properties p where p.id=property_id and p.owner_id=(select auth.uid()))) with check (exists(select 1 from public.properties p where p.id=property_id and p.owner_id=(select auth.uid())));

create policy vacancies_public_active_read on public.vacancies for select to anon,authenticated using ((status='active' and (expires_at is null or expires_at>now())) or private.vacancy_room_owned_by(room_id,(select auth.uid())));
create policy vacancies_owner_insert on public.vacancies for insert to authenticated with check (private.vacancy_room_owned_by(room_id,(select auth.uid())));
create policy vacancies_owner_update on public.vacancies for update to authenticated using (private.vacancy_room_owned_by(room_id,(select auth.uid()))) with check (private.vacancy_room_owned_by(room_id,(select auth.uid())));

create policy media_public_or_owner_read on public.media for select to anon,authenticated using (owner_id=(select auth.uid()) or (status='active' and room_id is not null and private.room_has_public_vacancy(room_id)));
create policy media_owner_insert on public.media for insert to authenticated with check (owner_id=(select auth.uid()));
create policy media_owner_update on public.media for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy media_owner_delete on public.media for delete to authenticated using (owner_id=(select auth.uid()));

create policy saved_self_all on public.saved_vacancies for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy conversation_member_read on public.conversations for select to authenticated using (exists(select 1 from public.conversation_members cm where cm.conversation_id=id and cm.user_id=(select auth.uid())));
create policy conversation_members_self_read on public.conversation_members for select to authenticated using (user_id=(select auth.uid()));
create policy messages_member_read on public.messages for select to authenticated using (exists(select 1 from public.conversation_members cm where cm.conversation_id=messages.conversation_id and cm.user_id=(select auth.uid())));
create policy reports_self_insert on public.reports for insert to authenticated with check (reporter_id=(select auth.uid()));
create policy reports_self_read on public.reports for select to authenticated using (reporter_id=(select auth.uid()));
create policy blocks_self_all on public.blocks for all to authenticated using (blocker_id=(select auth.uid())) with check (blocker_id=(select auth.uid()));
create policy analytics_insert_anon on public.analytics_events for insert to anon with check (user_id is null);
create policy analytics_insert_auth on public.analytics_events for insert to authenticated with check (user_id=(select auth.uid()));
create policy errors_insert_anon on public.client_errors for insert to anon with check (user_id is null);
create policy errors_insert_auth on public.client_errors for insert to authenticated with check (user_id=(select auth.uid()));

create or replace function public.create_vacancy_listing_v2(
 p_title text,p_locality text,p_city text,p_region text,p_postal text,p_landmark text,p_country text,p_market_code text,
 p_property_type text,p_household_summary text,p_address_line text,p_unit_name text,p_unit_type text,p_furnished boolean,p_ensuite boolean,p_unit_description text,
 p_rent_amount numeric,p_rent_currency text,p_rent_period text,p_deposit numeric,p_bills_included boolean,p_available_from date,p_minimum_stay_weeks integer,
 p_parking_spaces integer,p_max_occupants integer,p_pets_considered boolean,p_smoking_allowed boolean,p_water_available boolean,p_electricity_available boolean,p_security_available boolean,p_internet_available boolean)
returns uuid language plpgsql security invoker set search_path=public as $$
declare v_user uuid:=auth.uid(); v_property uuid; v_room uuid; v_vacancy uuid;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if coalesce(trim(p_locality),'')='' or coalesce(trim(p_city),'')='' or coalesce(trim(p_region),'')='' or coalesce(trim(p_address_line),'')='' or coalesce(trim(p_unit_name),'')='' then raise exception 'Missing required listing fields'; end if;
 if p_rent_amount is null or p_rent_amount<=0 then raise exception 'Rent must be positive'; end if;
 if p_rent_currency !~ '^[A-Z]{3}$' or p_rent_period not in ('night','week','month') then raise exception 'Invalid rent terms'; end if;
 if coalesce(p_max_occupants,1) not between 1 and 4 then raise exception 'Invalid occupancy'; end if;
 insert into public.properties(owner_id,title,suburb,city,state,postcode,country,market_code,property_type,parking_spaces,pets_considered,smoking_allowed,household_summary,landmark,water_available,electricity_available,security_available,internet_available)
 values(v_user,p_title,p_locality,p_city,p_region,nullif(trim(p_postal),''),p_country,p_market_code,p_property_type,coalesce(p_parking_spaces,0),coalesce(p_pets_considered,false),coalesce(p_smoking_allowed,false),p_household_summary,p_landmark,coalesce(p_water_available,false),coalesce(p_electricity_available,true),coalesce(p_security_available,false),coalesce(p_internet_available,false)) returning id into v_property;
 insert into public.property_private_locations(property_id,address_line) values(v_property,p_address_line);
 insert into public.rooms(property_id,name,room_type,unit_type,furnished,ensuite,max_occupants,description) values(v_property,p_unit_name,coalesce(nullif(p_unit_type,''),'room'),coalesce(nullif(p_unit_type,''),'room'),coalesce(p_furnished,false),coalesce(p_ensuite,false),coalesce(p_max_occupants,1),p_unit_description) returning id into v_room;
 insert into public.vacancies(room_id,weekly_rent,bond,monthly_rent,deposit,rent_amount,rent_currency,rent_period,bills_included,available_from,minimum_stay_weeks,status,confirmed_at,expires_at,published_at)
 values(v_room,p_rent_amount,p_deposit,case when p_rent_period='month' then p_rent_amount else null end,p_deposit,p_rent_amount,upper(p_rent_currency),p_rent_period,coalesce(p_bills_included,false),p_available_from,p_minimum_stay_weeks,'active',now(),now()+interval '21 days',now()) returning id into v_vacancy;
 return v_vacancy;
end $$;
revoke all on function public.create_vacancy_listing_v2(text,text,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,text,numeric,text,text,numeric,boolean,date,integer,integer,integer,boolean,boolean,boolean,boolean,boolean,boolean) from public,anon;
grant execute on function public.create_vacancy_listing_v2(text,text,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,text,numeric,text,text,numeric,boolean,date,integer,integer,integer,boolean,boolean,boolean,boolean,boolean,boolean) to authenticated;

create or replace function public.create_unit_vacancy_for_property_v2(
 p_property_id uuid,p_unit_name text,p_unit_type text,p_furnished boolean,p_ensuite boolean,p_max_occupants integer,p_unit_description text,
 p_smoking_allowed_override boolean,p_pets_considered_override boolean,p_rent_amount numeric,p_rent_currency text,p_rent_period text,p_deposit numeric,p_bills_included boolean,p_available_from date,p_minimum_stay_weeks integer)
returns uuid language plpgsql security invoker set search_path=public as $$
declare v_user uuid:=auth.uid(); v_room uuid; v_vacancy uuid;
begin
 if v_user is null or not exists(select 1 from public.properties where id=p_property_id and owner_id=v_user) then raise exception 'Property not found'; end if;
 if coalesce(trim(p_unit_name),'')='' or p_rent_amount<=0 or coalesce(p_max_occupants,1) not between 1 and 4 then raise exception 'Invalid unit'; end if;
 insert into public.rooms(property_id,name,room_type,unit_type,furnished,ensuite,max_occupants,description,smoking_allowed_override,pets_considered_override)
 values(p_property_id,p_unit_name,coalesce(nullif(p_unit_type,''),'room'),coalesce(nullif(p_unit_type,''),'room'),coalesce(p_furnished,false),coalesce(p_ensuite,false),coalesce(p_max_occupants,1),p_unit_description,p_smoking_allowed_override,p_pets_considered_override) returning id into v_room;
 insert into public.vacancies(room_id,weekly_rent,bond,monthly_rent,deposit,rent_amount,rent_currency,rent_period,bills_included,available_from,minimum_stay_weeks,status,confirmed_at,expires_at,published_at)
 values(v_room,p_rent_amount,p_deposit,case when p_rent_period='month' then p_rent_amount else null end,p_deposit,p_rent_amount,upper(p_rent_currency),p_rent_period,coalesce(p_bills_included,false),p_available_from,p_minimum_stay_weeks,'active',now(),now()+interval '21 days',now()) returning id into v_vacancy;
 return v_vacancy;
end $$;
revoke all on function public.create_unit_vacancy_for_property_v2(uuid,text,text,boolean,boolean,integer,text,boolean,boolean,numeric,text,text,numeric,boolean,date,integer) from public,anon;
grant execute on function public.create_unit_vacancy_for_property_v2(uuid,text,text,boolean,boolean,integer,text,boolean,boolean,numeric,text,text,numeric,boolean,date,integer) to authenticated;

create or replace function public.update_vacancy_listing_v2(
 p_vacancy_id uuid,p_locality text,p_city text,p_region text,p_postal text,p_landmark text,p_country text,p_market_code text,p_address_line text,p_property_type text,p_household_summary text,
 p_unit_name text,p_unit_type text,p_furnished boolean,p_ensuite boolean,p_unit_description text,p_rent_amount numeric,p_rent_currency text,p_rent_period text,p_deposit numeric,
 p_bills_included boolean,p_available_from date,p_minimum_stay_weeks integer,p_parking_spaces integer,p_max_occupants integer,p_pets_considered boolean,p_smoking_allowed boolean,
 p_water_available boolean,p_electricity_available boolean,p_security_available boolean,p_internet_available boolean)
returns uuid language plpgsql security invoker set search_path=public as $$
declare v_user uuid:=auth.uid(); v_room uuid; v_property uuid;
begin
 select r.id,p.id into v_room,v_property from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where v.id=p_vacancy_id and p.owner_id=v_user;
 if v_room is null then raise exception 'Vacancy not found'; end if;
 if coalesce(p_max_occupants,1) not between 1 and 4 then raise exception 'Invalid occupancy'; end if;
 update public.properties set suburb=p_locality,city=p_city,state=p_region,postcode=nullif(trim(p_postal),''),country=p_country,market_code=p_market_code,landmark=p_landmark,property_type=p_property_type,household_summary=p_household_summary,parking_spaces=coalesce(p_parking_spaces,0),pets_considered=coalesce(p_pets_considered,false),smoking_allowed=coalesce(p_smoking_allowed,false),water_available=coalesce(p_water_available,false),electricity_available=coalesce(p_electricity_available,true),security_available=coalesce(p_security_available,false),internet_available=coalesce(p_internet_available,false),updated_at=now() where id=v_property;
 update public.property_private_locations set address_line=p_address_line,updated_at=now() where property_id=v_property;
 update public.rooms set name=p_unit_name,room_type=coalesce(nullif(p_unit_type,''),'room'),unit_type=coalesce(nullif(p_unit_type,''),'room'),furnished=coalesce(p_furnished,false),ensuite=coalesce(p_ensuite,false),max_occupants=coalesce(p_max_occupants,1),description=p_unit_description,updated_at=now() where id=v_room;
 update public.vacancies set weekly_rent=p_rent_amount,bond=p_deposit,monthly_rent=case when p_rent_period='month' then p_rent_amount else monthly_rent end,deposit=p_deposit,rent_amount=p_rent_amount,rent_currency=upper(p_rent_currency),rent_period=p_rent_period,bills_included=coalesce(p_bills_included,false),available_from=p_available_from,minimum_stay_weeks=p_minimum_stay_weeks,confirmed_at=now(),expires_at=now()+interval '21 days',updated_at=now() where id=p_vacancy_id;
 return p_vacancy_id;
end $$;
revoke all on function public.update_vacancy_listing_v2(uuid,text,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,text,numeric,text,text,numeric,boolean,date,integer,integer,integer,boolean,boolean,boolean,boolean,boolean,boolean) from public,anon;
grant execute on function public.update_vacancy_listing_v2(uuid,text,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,text,numeric,text,text,numeric,boolean,date,integer,integer,integer,boolean,boolean,boolean,boolean,boolean,boolean) to authenticated;

create or replace function public.update_room_overrides(p_room_id uuid,p_smoking_allowed_override boolean,p_pets_considered_override boolean)
returns uuid language plpgsql security invoker set search_path=public as $$
begin
 update public.rooms r set smoking_allowed_override=p_smoking_allowed_override,pets_considered_override=p_pets_considered_override,updated_at=now()
 from public.properties p where r.id=p_room_id and r.property_id=p.id and p.owner_id=auth.uid();
 if not found then raise exception 'Room not found'; end if;
 return p_room_id;
end $$;
grant execute on function public.update_room_overrides(uuid,boolean,boolean) to authenticated;

create or replace function public.set_vacancy_public_location(p_vacancy_id uuid,p_latitude numeric,p_longitude numeric)
returns uuid language plpgsql security invoker set search_path=public as $$
declare v_property uuid;
begin
 select p.id into v_property from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where v.id=p_vacancy_id and p.owner_id=auth.uid();
 if v_property is null then raise exception 'Vacancy not found'; end if;
 update public.properties set public_latitude=p_latitude,public_longitude=p_longitude,updated_at=now() where id=v_property;
 return v_property;
end $$;
revoke all on function public.set_vacancy_public_location(uuid,numeric,numeric) from public,anon;
grant execute on function public.set_vacancy_public_location(uuid,numeric,numeric) to authenticated;

create or replace function public.reconfirm_vacancy(p_vacancy_id uuid)
returns void language plpgsql security invoker set search_path=public as $$
begin
 update public.vacancies set confirmed_at=now(),expires_at=now()+interval '21 days',status='active',updated_at=now() where id=p_vacancy_id;
 if not found then raise exception 'vacancy not found or not owned'; end if;
end $$;
grant execute on function public.reconfirm_vacancy(uuid) to authenticated;

create or replace function private.start_enquiry_impl(p_vacancy_id uuid,p_requested_move_in date,p_stay_weeks integer,p_renter_intro text,p_message text)
returns uuid language plpgsql security definer set search_path=public,private as $$
declare v_user uuid:=auth.uid(); v_owner uuid; v_conversation uuid;
begin
 if v_user is null then raise exception 'authentication required'; end if;
 if p_message is null or length(trim(p_message))<1 then raise exception 'message required'; end if;
 select p.owner_id into v_owner from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where v.id=p_vacancy_id and v.status='active' and (v.expires_at is null or v.expires_at>now());
 if v_owner is null then raise exception 'active vacancy not found'; end if;
 if v_owner=v_user then raise exception 'cannot enquire on own vacancy'; end if;
 if exists(select 1 from public.blocks b where (b.blocker_id=v_user and b.blocked_id=v_owner) or (b.blocker_id=v_owner and b.blocked_id=v_user)) then raise exception 'conversation unavailable'; end if;
 select c.id into v_conversation from public.conversations c join public.conversation_members a on a.conversation_id=c.id and a.user_id=v_user join public.conversation_members b on b.conversation_id=c.id and b.user_id=v_owner where c.vacancy_id=p_vacancy_id limit 1;
 if v_conversation is null then
   insert into public.conversations(vacancy_id,requested_move_in,stay_weeks,renter_intro) values(p_vacancy_id,p_requested_move_in,p_stay_weeks,nullif(trim(p_renter_intro),'')) returning id into v_conversation;
   insert into public.conversation_members(conversation_id,user_id) values(v_conversation,v_user),(v_conversation,v_owner);
 end if;
 insert into public.messages(conversation_id,sender_id,body) values(v_conversation,v_user,trim(p_message));
 return v_conversation;
end $$;
create or replace function public.start_enquiry(p_vacancy_id uuid,p_requested_move_in date,p_stay_weeks integer,p_renter_intro text,p_message text)
returns uuid language sql security invoker set search_path=public,private as $$ select private.start_enquiry_impl(p_vacancy_id,p_requested_move_in,p_stay_weeks,p_renter_intro,p_message); $$;
revoke all on function public.start_enquiry(uuid,date,integer,text,text) from public,anon;
grant execute on function public.start_enquiry(uuid,date,integer,text,text) to authenticated;

create or replace function private.send_message_impl(p_conversation_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path=public,private as $$
declare v_user uuid:=auth.uid(); v_id uuid;
begin
 if v_user is null then raise exception 'authentication required'; end if;
 if not exists(select 1 from public.conversation_members cm where cm.conversation_id=p_conversation_id and cm.user_id=v_user) then raise exception 'not a conversation member'; end if;
 if exists(select 1 from public.conversation_members other join public.blocks b on (b.blocker_id=v_user and b.blocked_id=other.user_id) or (b.blocker_id=other.user_id and b.blocked_id=v_user) where other.conversation_id=p_conversation_id and other.user_id<>v_user) then raise exception 'conversation unavailable'; end if;
 insert into public.messages(conversation_id,sender_id,body) values(p_conversation_id,v_user,trim(p_body)) returning id into v_id;
 return v_id;
end $$;
create or replace function public.send_message(p_conversation_id uuid,p_body text)
returns uuid language sql security invoker set search_path=public,private as $$ select private.send_message_impl(p_conversation_id,p_body); $$;
revoke all on function public.send_message(uuid,text) from public,anon;
grant execute on function public.send_message(uuid,text) to authenticated;

create or replace function public.track_event(p_event_name text,p_vacancy_id uuid default null,p_route text default null)
returns void language plpgsql security invoker set search_path=public as $$
begin insert into public.analytics_events(user_id,event_name,vacancy_id,route) values(auth.uid(),p_event_name,p_vacancy_id,left(p_route,120)); end $$;
create or replace function public.record_client_error(p_error_code text,p_route text default null)
returns void language plpgsql security invoker set search_path=public as $$
begin insert into public.client_errors(user_id,error_code,route) values(auth.uid(),left(coalesce(p_error_code,'unknown'),80),left(p_route,120)); end $$;
grant execute on function public.track_event(text,uuid,text) to anon,authenticated;
grant execute on function public.record_client_error(text,text) to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('room-media','room-media',true,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy room_media_public_read on storage.objects for select using (bucket_id='room-media');
create policy room_media_owner_insert on storage.objects for insert to authenticated with check (bucket_id='room-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
