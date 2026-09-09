create or replace function public.create_vacancy_listing_v4(
 p_request_id uuid,p_title text,p_locality text,p_city text,p_region text,p_postal text,p_landmark text,p_country text,p_market_code text,
 p_property_type text,p_household_summary text,p_address_line text,p_unit_name text,p_unit_type text,p_furnished boolean,p_ensuite boolean,p_unit_description text,
 p_rent_amount numeric,p_rent_currency text,p_rent_period text,p_deposit numeric,p_bills_included boolean,p_available_from date,p_minimum_stay_weeks integer,
 p_parking_spaces integer,p_max_occupants integer,p_pets_considered boolean,p_smoking_allowed boolean,p_water_available boolean,p_electricity_available boolean,p_security_available boolean,p_internet_available boolean,
 p_public_latitude numeric,p_public_longitude numeric)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_property uuid;
begin
 if p_public_latitude is null or p_public_latitude not between -90 and 90 then raise exception 'Choose a valid public map location'; end if;
 if p_public_longitude is null or p_public_longitude not between -180 and 180 then raise exception 'Choose a valid public map location'; end if;
 v_id:=public.create_vacancy_listing_v3(p_request_id,p_title,p_locality,p_city,p_region,p_postal,p_landmark,p_country,p_market_code,p_property_type,p_household_summary,p_address_line,p_unit_name,p_unit_type,p_furnished,p_ensuite,p_unit_description,p_rent_amount,p_rent_currency,p_rent_period,p_deposit,p_bills_included,p_available_from,p_minimum_stay_weeks,p_parking_spaces,p_max_occupants,p_pets_considered,p_smoking_allowed,p_water_available,p_electricity_available,p_security_available,p_internet_available);
 select p.id into v_property from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where v.id=v_id and p.owner_id=(select auth.uid());
 if v_property is null then raise exception 'Vacancy not found'; end if;
 update public.properties set public_latitude=p_public_latitude,public_longitude=p_public_longitude,updated_at=now() where id=v_property;
 return v_id;
end $$;

revoke all on function public.create_vacancy_listing_v4(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,text,numeric,text,text,numeric,boolean,date,integer,integer,integer,boolean,boolean,boolean,boolean,boolean,boolean,numeric,numeric) from public,anon;
grant execute on function public.create_vacancy_listing_v4(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,text,numeric,text,text,numeric,boolean,date,integer,integer,integer,boolean,boolean,boolean,boolean,boolean,boolean,numeric,numeric) to authenticated,service_role;
