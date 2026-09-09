alter table public.vacancies add column if not exists client_request_id uuid;
create unique index if not exists vacancies_client_request_id_key on public.vacancies(client_request_id) where client_request_id is not null;

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
 return v_id;
end $$;

revoke all on function public.create_vacancy_listing_v3(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,text,numeric,text,text,numeric,boolean,date,integer,integer,integer,boolean,boolean,boolean,boolean,boolean,boolean) from public,anon;
grant execute on function public.create_vacancy_listing_v3(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,text,numeric,text,text,numeric,boolean,date,integer,integer,integer,boolean,boolean,boolean,boolean,boolean,boolean) to authenticated,service_role;
revoke all on function public.create_unit_vacancy_for_property_v3(uuid,uuid,text,text,boolean,boolean,integer,text,boolean,boolean,numeric,text,text,numeric,boolean,date,integer) from public,anon;
grant execute on function public.create_unit_vacancy_for_property_v3(uuid,uuid,text,text,boolean,boolean,integer,text,boolean,boolean,numeric,text,text,numeric,boolean,date,integer) to authenticated,service_role;
