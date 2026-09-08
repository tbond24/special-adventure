alter table public.properties add column if not exists landmark text;
alter table public.properties add column if not exists water_available boolean not null default false;
alter table public.properties add column if not exists electricity_available boolean not null default true;
alter table public.properties add column if not exists security_available boolean not null default false;
alter table public.properties add column if not exists internet_available boolean not null default false;
alter table public.rooms add column if not exists unit_type text;
alter table public.vacancies add column if not exists monthly_rent numeric;
alter table public.vacancies add column if not exists deposit numeric;

create or replace function public.create_vacancy_listing_ke(
  p_title text, p_estate text, p_town text, p_county text, p_postcode text, p_landmark text,
  p_property_type text, p_household_summary text, p_address_line text,
  p_unit_name text, p_unit_type text, p_furnished boolean, p_ensuite boolean, p_unit_description text,
  p_monthly_rent numeric, p_deposit numeric, p_bills_included boolean, p_available_from date,
  p_minimum_stay_weeks integer, p_parking_spaces integer, p_max_occupants integer,
  p_pets_considered boolean, p_smoking_allowed boolean,
  p_water_available boolean, p_electricity_available boolean, p_security_available boolean, p_internet_available boolean
) returns uuid language plpgsql set search_path to 'public' as $$
declare v_user uuid := auth.uid(); v_property uuid; v_room uuid; v_vacancy uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if coalesce(trim(p_estate),'')='' or coalesce(trim(p_town),'')='' or coalesce(trim(p_county),'')='' or coalesce(trim(p_address_line),'')='' or coalesce(trim(p_unit_name),'')='' then raise exception 'Missing required listing fields'; end if;
  if p_monthly_rent is null or p_monthly_rent <= 0 then raise exception 'Monthly rent must be positive'; end if;
  if p_available_from is null then raise exception 'Availability date required'; end if;
  if coalesce(p_parking_spaces,0) < 0 or coalesce(p_parking_spaces,0) > 50 then raise exception 'Invalid parking spaces'; end if;
  if coalesce(p_max_occupants,1) < 1 or coalesce(p_max_occupants,1) > 8 then raise exception 'Invalid occupancy'; end if;
  insert into public.properties(owner_id,title,suburb,city,state,postcode,country,property_type,parking_spaces,pets_considered,smoking_allowed,household_summary,landmark,water_available,electricity_available,security_available,internet_available)
  values(v_user,p_title,p_estate,p_town,p_county,nullif(trim(p_postcode),''),'Kenya',p_property_type,coalesce(p_parking_spaces,0),coalesce(p_pets_considered,false),coalesce(p_smoking_allowed,false),p_household_summary,p_landmark,coalesce(p_water_available,false),coalesce(p_electricity_available,true),coalesce(p_security_available,false),coalesce(p_internet_available,false)) returning id into v_property;
  insert into public.property_private_locations(property_id,address_line) values(v_property,p_address_line);
  insert into public.rooms(property_id,name,room_type,unit_type,furnished,ensuite,max_occupants,description)
  values(v_property,p_unit_name,coalesce(nullif(p_unit_type,''),'room'),coalesce(nullif(p_unit_type,''),'room'),coalesce(p_furnished,false),coalesce(p_ensuite,false),coalesce(p_max_occupants,1),p_unit_description) returning id into v_room;
  insert into public.vacancies(room_id,weekly_rent,bond,monthly_rent,deposit,bills_included,available_from,minimum_stay_weeks,status,confirmed_at,expires_at,published_at)
  values(v_room,p_monthly_rent,p_deposit,p_monthly_rent,p_deposit,coalesce(p_bills_included,false),p_available_from,p_minimum_stay_weeks,'active',now(),now()+interval '21 days',now()) returning id into v_vacancy;
  return v_vacancy;
end $$;

create or replace function public.create_unit_vacancy_for_property_ke(
  p_property_id uuid, p_unit_name text, p_unit_type text, p_furnished boolean, p_ensuite boolean, p_max_occupants integer,
  p_unit_description text, p_smoking_allowed_override boolean, p_pets_considered_override boolean,
  p_monthly_rent numeric, p_deposit numeric, p_bills_included boolean, p_available_from date, p_minimum_stay_weeks integer
) returns uuid language plpgsql set search_path to 'public' as $$
declare v_user uuid := auth.uid(); v_room uuid; v_vacancy uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.properties where id=p_property_id and owner_id=v_user) then raise exception 'Property not found'; end if;
  if coalesce(trim(p_unit_name),'')='' then raise exception 'Unit name required'; end if;
  if p_monthly_rent is null or p_monthly_rent <= 0 then raise exception 'Monthly rent must be positive'; end if;
  if p_available_from is null then raise exception 'Availability date required'; end if;
  insert into public.rooms(property_id,name,room_type,unit_type,furnished,ensuite,max_occupants,description,smoking_allowed_override,pets_considered_override)
  values(p_property_id,p_unit_name,coalesce(nullif(p_unit_type,''),'room'),coalesce(nullif(p_unit_type,''),'room'),coalesce(p_furnished,false),coalesce(p_ensuite,false),coalesce(p_max_occupants,1),p_unit_description,p_smoking_allowed_override,p_pets_considered_override) returning id into v_room;
  insert into public.vacancies(room_id,weekly_rent,bond,monthly_rent,deposit,bills_included,available_from,minimum_stay_weeks,status,confirmed_at,expires_at,published_at)
  values(v_room,p_monthly_rent,p_deposit,p_monthly_rent,p_deposit,coalesce(p_bills_included,false),p_available_from,p_minimum_stay_weeks,'active',now(),now()+interval '21 days',now()) returning id into v_vacancy;
  return v_vacancy;
end $$;

create or replace function public.update_property_defaults_ke(
 p_property_id uuid, p_smoking_allowed boolean, p_pets_considered boolean, p_parking_spaces integer,
 p_household_summary text, p_landmark text, p_water_available boolean, p_electricity_available boolean,
 p_security_available boolean, p_internet_available boolean
) returns uuid language plpgsql set search_path to 'public' as $$
declare v_user uuid := auth.uid();
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 update public.properties set smoking_allowed=coalesce(p_smoking_allowed,false), pets_considered=coalesce(p_pets_considered,false), parking_spaces=coalesce(p_parking_spaces,0), household_summary=p_household_summary, landmark=p_landmark, water_available=coalesce(p_water_available,false), electricity_available=coalesce(p_electricity_available,true), security_available=coalesce(p_security_available,false), internet_available=coalesce(p_internet_available,false), updated_at=now() where id=p_property_id and owner_id=v_user;
 if not found then raise exception 'Property not found'; end if;
 return p_property_id;
end $$;

revoke all on function public.create_vacancy_listing_ke(text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,text,numeric,numeric,boolean,date,integer,integer,integer,boolean,boolean,boolean,boolean,boolean,boolean) from public, anon;
grant execute on function public.create_vacancy_listing_ke(text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,text,numeric,numeric,boolean,date,integer,integer,integer,boolean,boolean,boolean,boolean,boolean,boolean) to authenticated, service_role;
revoke all on function public.create_unit_vacancy_for_property_ke(uuid,text,text,boolean,boolean,integer,text,boolean,boolean,numeric,numeric,boolean,date,integer) from public, anon;
grant execute on function public.create_unit_vacancy_for_property_ke(uuid,text,text,boolean,boolean,integer,text,boolean,boolean,numeric,numeric,boolean,date,integer) to authenticated, service_role;
revoke all on function public.update_property_defaults_ke(uuid,boolean,boolean,integer,text,text,boolean,boolean,boolean,boolean) from public, anon;
grant execute on function public.update_property_defaults_ke(uuid,boolean,boolean,integer,text,text,boolean,boolean,boolean,boolean) to authenticated, service_role;
;
