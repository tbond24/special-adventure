create or replace function public.create_vacancy_listing(
  p_title text,
  p_suburb text,
  p_city text,
  p_state text,
  p_postcode text,
  p_country text,
  p_property_type text,
  p_household_summary text,
  p_address_line text,
  p_room_name text,
  p_room_type text,
  p_furnished boolean,
  p_ensuite boolean,
  p_room_description text,
  p_weekly_rent numeric,
  p_bond numeric,
  p_bills_included boolean,
  p_available_from date,
  p_minimum_stay_weeks integer
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_property uuid;
  v_room uuid;
  v_vacancy uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if coalesce(trim(p_suburb),'')='' or coalesce(trim(p_postcode),'')='' or coalesce(trim(p_address_line),'')='' or coalesce(trim(p_room_name),'')='' then raise exception 'Missing required listing fields'; end if;
  if p_weekly_rent is null or p_weekly_rent <= 0 then raise exception 'Weekly rent must be positive'; end if;
  if p_available_from is null then raise exception 'Availability date required'; end if;

  insert into public.properties(owner_id,title,suburb,city,state,postcode,country,property_type,household_summary)
  values(v_user,p_title,p_suburb,p_city,p_state,p_postcode,coalesce(nullif(p_country,''),'Australia'),p_property_type,p_household_summary)
  returning id into v_property;

  insert into public.property_private_locations(property_id,address_line)
  values(v_property,p_address_line);

  insert into public.rooms(property_id,name,room_type,furnished,ensuite,description)
  values(v_property,p_room_name,coalesce(nullif(p_room_type,''),'private'),coalesce(p_furnished,false),coalesce(p_ensuite,false),p_room_description)
  returning id into v_room;

  insert into public.vacancies(room_id,weekly_rent,bond,bills_included,available_from,minimum_stay_weeks,status,confirmed_at,expires_at,published_at)
  values(v_room,p_weekly_rent,p_bond,coalesce(p_bills_included,false),p_available_from,p_minimum_stay_weeks,'active',now(),now()+interval '21 days',now())
  returning id into v_vacancy;

  return v_vacancy;
end;
$$;
revoke all on function public.create_vacancy_listing(text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,text,numeric,numeric,boolean,date,integer) from public, anon;
grant execute on function public.create_vacancy_listing(text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,text,numeric,numeric,boolean,date,integer) to authenticated;;
