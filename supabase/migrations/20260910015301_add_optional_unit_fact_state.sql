alter table public.rooms
  add column if not exists furnished_known boolean not null default true,
  add column if not exists ensuite_known boolean not null default true;

comment on column public.rooms.furnished_known is 'False when the lister has not answered the furnished question.';
comment on column public.rooms.ensuite_known is 'False when the lister has not answered the ensuite question.';

create or replace function public.create_vacancy_listing_v3(
 p_request_id uuid,p_title text,p_locality text,p_city text,p_region text,p_postal text,p_landmark text,p_country text,p_market_code text,
 p_property_type text,p_household_summary text,p_address_line text,p_unit_name text,p_unit_type text,p_furnished boolean,p_ensuite boolean,p_unit_description text,
 p_rent_amount numeric,p_rent_currency text,p_rent_period text,p_deposit numeric,p_bills_included boolean,p_available_from date,p_minimum_stay_weeks integer,
 p_parking_spaces integer,p_max_occupants integer,p_pets_considered boolean,p_smoking_allowed boolean,p_water_available boolean,p_electricity_available boolean,p_security_available boolean,p_internet_available boolean)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid;
begin
 if p_request_id is null then raise exception 'Request ID required'; end if;
 select v.id into v_id from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where v.client_request_id=p_request_id and p.owner_id=(select auth.uid());
 if v_id is not null then return v_id; end if;
 v_id:=public.create_vacancy_listing_v2(p_title,p_locality,p_city,p_region,p_postal,p_landmark,p_country,p_market_code,p_property_type,p_household_summary,p_address_line,p_unit_name,p_unit_type,p_furnished,p_ensuite,p_unit_description,p_rent_amount,p_rent_currency,p_rent_period,p_deposit,p_bills_included,p_available_from,p_minimum_stay_weeks,p_parking_spaces,p_max_occupants,p_pets_considered,p_smoking_allowed,p_water_available,p_electricity_available,p_security_available,p_internet_available);
 update public.vacancies set client_request_id=p_request_id where id=v_id;
 update public.rooms r set furnished_known=(p_furnished is not null),ensuite_known=(p_ensuite is not null) from public.vacancies v where v.id=v_id and r.id=v.room_id;
 return v_id;
end $$;

create or replace function public.create_unit_vacancy_for_property_v3(
 p_request_id uuid,p_property_id uuid,p_unit_name text,p_unit_type text,p_furnished boolean,p_ensuite boolean,p_max_occupants integer,p_unit_description text,
 p_smoking_allowed_override boolean,p_pets_considered_override boolean,p_rent_amount numeric,p_rent_currency text,p_rent_period text,p_deposit numeric,p_bills_included boolean,p_available_from date,p_minimum_stay_weeks integer)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid;
begin
 if p_request_id is null then raise exception 'Request ID required'; end if;
 select v.id into v_id from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where v.client_request_id=p_request_id and p.owner_id=(select auth.uid());
 if v_id is not null then return v_id; end if;
 v_id:=public.create_unit_vacancy_for_property_v2(p_property_id,p_unit_name,p_unit_type,p_furnished,p_ensuite,p_max_occupants,p_unit_description,p_smoking_allowed_override,p_pets_considered_override,p_rent_amount,p_rent_currency,p_rent_period,p_deposit,p_bills_included,p_available_from,p_minimum_stay_weeks);
 update public.vacancies set client_request_id=p_request_id where id=v_id;
 update public.rooms r set furnished_known=(p_furnished is not null),ensuite_known=(p_ensuite is not null) from public.vacancies v where v.id=v_id and r.id=v.room_id;
 return v_id;
end $$;

create or replace function public.update_vacancy_listing_v2(
 p_vacancy_id uuid,p_locality text,p_city text,p_region text,p_postal text,p_landmark text,p_country text,p_market_code text,p_address_line text,p_property_type text,p_household_summary text,
 p_unit_name text,p_unit_type text,p_furnished boolean,p_ensuite boolean,p_unit_description text,p_rent_amount numeric,p_rent_currency text,p_rent_period text,p_deposit numeric,
 p_bills_included boolean,p_available_from date,p_minimum_stay_weeks integer,p_parking_spaces integer,p_max_occupants integer,p_pets_considered boolean,p_smoking_allowed boolean,
 p_water_available boolean,p_electricity_available boolean,p_security_available boolean,p_internet_available boolean)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_property uuid;
begin
 if coalesce(trim(p_country),'')='' then raise exception 'Country required'; end if;
 if p_market_code !~ '^[A-Z]{2}$' then raise exception 'Invalid market code'; end if;
 if p_rent_currency !~ '^[A-Z]{3}$' then raise exception 'Invalid rent currency'; end if;
 if p_rent_period not in ('night','week','month') then raise exception 'Invalid rent period'; end if;
 v_id:=public.update_vacancy_listing_ke(p_vacancy_id,p_locality,p_city,p_region,p_postal,p_landmark,p_address_line,p_property_type,p_household_summary,p_unit_name,p_unit_type,p_furnished,p_ensuite,p_unit_description,p_rent_amount,p_deposit,p_bills_included,p_available_from,p_minimum_stay_weeks,p_parking_spaces,p_max_occupants,p_pets_considered,p_smoking_allowed,p_water_available,p_electricity_available,p_security_available,p_internet_available);
 select r.property_id into v_property from public.vacancies v join public.rooms r on r.id=v.room_id where v.id=v_id;
 update public.properties set country=p_country,market_code=p_market_code where id=v_property;
 update public.vacancies set rent_amount=p_rent_amount,rent_currency=upper(p_rent_currency),rent_period=p_rent_period where id=v_id;
 update public.rooms r set furnished_known=(p_furnished is not null),ensuite_known=(p_ensuite is not null) from public.vacancies v where v.id=v_id and r.id=v.room_id;
 return v_id;
end $$;

revoke all on function public.create_vacancy_listing_v3(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,text,numeric,text,text,numeric,boolean,date,integer,integer,integer,boolean,boolean,boolean,boolean,boolean,boolean) from public,anon;
grant execute on function public.create_vacancy_listing_v3(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,text,numeric,text,text,numeric,boolean,date,integer,integer,integer,boolean,boolean,boolean,boolean,boolean,boolean) to authenticated,service_role;
revoke all on function public.create_unit_vacancy_for_property_v3(uuid,uuid,text,text,boolean,boolean,integer,text,boolean,boolean,numeric,text,text,numeric,boolean,date,integer) from public,anon;
grant execute on function public.create_unit_vacancy_for_property_v3(uuid,uuid,text,text,boolean,boolean,integer,text,boolean,boolean,numeric,text,text,numeric,boolean,date,integer) to authenticated,service_role;
revoke all on function public.update_vacancy_listing_v2(uuid,text,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,text,numeric,text,text,numeric,boolean,date,integer,integer,integer,boolean,boolean,boolean,boolean,boolean,boolean) from public,anon;
grant execute on function public.update_vacancy_listing_v2(uuid,text,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,text,numeric,text,text,numeric,boolean,date,integer,integer,integer,boolean,boolean,boolean,boolean,boolean,boolean) to authenticated,service_role;
