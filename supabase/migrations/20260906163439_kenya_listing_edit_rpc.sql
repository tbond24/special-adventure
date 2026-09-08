create or replace function public.update_vacancy_listing_ke(
 p_vacancy_id uuid, p_estate text, p_town text, p_county text, p_postcode text, p_landmark text,
 p_address_line text, p_property_type text, p_household_summary text,
 p_unit_name text, p_unit_type text, p_furnished boolean, p_ensuite boolean, p_unit_description text,
 p_monthly_rent numeric, p_deposit numeric, p_bills_included boolean, p_available_from date,
 p_minimum_stay_weeks integer, p_parking_spaces integer, p_max_occupants integer,
 p_pets_considered boolean, p_smoking_allowed boolean,
 p_water_available boolean, p_electricity_available boolean, p_security_available boolean, p_internet_available boolean
) returns uuid language plpgsql set search_path to 'public' as $$
declare v_user uuid := auth.uid(); v_room uuid; v_property uuid;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 select r.id,p.id into v_room,v_property from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where v.id=p_vacancy_id and p.owner_id=v_user;
 if v_room is null then raise exception 'Vacancy not found'; end if;
 if coalesce(trim(p_estate),'')='' or coalesce(trim(p_town),'')='' or coalesce(trim(p_county),'')='' or coalesce(trim(p_address_line),'')='' or coalesce(trim(p_unit_name),'')='' then raise exception 'Missing required listing fields'; end if;
 if p_monthly_rent is null or p_monthly_rent <= 0 then raise exception 'Monthly rent must be positive'; end if;
 update public.properties set suburb=p_estate,city=p_town,state=p_county,postcode=nullif(trim(p_postcode),''),landmark=p_landmark,property_type=p_property_type,parking_spaces=coalesce(p_parking_spaces,0),pets_considered=coalesce(p_pets_considered,false),smoking_allowed=coalesce(p_smoking_allowed,false),household_summary=p_household_summary,water_available=coalesce(p_water_available,false),electricity_available=coalesce(p_electricity_available,true),security_available=coalesce(p_security_available,false),internet_available=coalesce(p_internet_available,false),updated_at=now() where id=v_property;
 update public.property_private_locations set address_line=p_address_line,updated_at=now() where property_id=v_property;
 update public.rooms set name=p_unit_name,room_type=coalesce(nullif(p_unit_type,''),'room'),unit_type=coalesce(nullif(p_unit_type,''),'room'),furnished=coalesce(p_furnished,false),ensuite=coalesce(p_ensuite,false),max_occupants=coalesce(p_max_occupants,1),description=p_unit_description,updated_at=now() where id=v_room;
 update public.vacancies set weekly_rent=p_monthly_rent,bond=p_deposit,monthly_rent=p_monthly_rent,deposit=p_deposit,bills_included=coalesce(p_bills_included,false),available_from=p_available_from,minimum_stay_weeks=p_minimum_stay_weeks,confirmed_at=now(),expires_at=now()+interval '21 days',updated_at=now() where id=p_vacancy_id;
 return p_vacancy_id;
end $$;
revoke all on function public.update_vacancy_listing_ke(uuid,text,text,text,text,text,text,text,text,text,text,boolean,boolean,text,numeric,numeric,boolean,date,integer,integer,integer,boolean,boolean,boolean,boolean,boolean,boolean) from public, anon;
grant execute on function public.update_vacancy_listing_ke(uuid,text,text,text,text,text,text,text,text,text,text,boolean,boolean,text,numeric,numeric,boolean,date,integer,integer,integer,boolean,boolean,boolean,boolean,boolean,boolean) to authenticated, service_role;;
