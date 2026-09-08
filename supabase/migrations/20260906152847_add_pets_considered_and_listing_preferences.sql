alter table public.properties add column if not exists pets_considered boolean not null default false;

create or replace function public.create_vacancy_listing(
  p_title text, p_suburb text, p_city text, p_state text, p_postcode text, p_country text,
  p_property_type text, p_household_summary text, p_address_line text, p_room_name text,
  p_room_type text, p_furnished boolean, p_ensuite boolean, p_room_description text,
  p_weekly_rent numeric, p_bond numeric, p_bills_included boolean, p_available_from date,
  p_minimum_stay_weeks integer, p_parking_spaces integer, p_max_occupants integer,
  p_pets_considered boolean
) returns uuid
language plpgsql
set search_path to 'public'
as $function$
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
  if coalesce(p_parking_spaces,0) < 0 or coalesce(p_parking_spaces,0) > 20 then raise exception 'Invalid parking spaces'; end if;
  if coalesce(p_max_occupants,1) < 1 or coalesce(p_max_occupants,1) > 4 then raise exception 'Invalid occupancy'; end if;

  insert into public.properties(owner_id,title,suburb,city,state,postcode,country,property_type,parking_spaces,pets_considered,household_summary)
  values(v_user,p_title,p_suburb,p_city,p_state,p_postcode,coalesce(nullif(p_country,''),'Australia'),p_property_type,coalesce(p_parking_spaces,0),coalesce(p_pets_considered,false),p_household_summary)
  returning id into v_property;

  insert into public.property_private_locations(property_id,address_line)
  values(v_property,p_address_line);

  insert into public.rooms(property_id,name,room_type,furnished,ensuite,max_occupants,description)
  values(v_property,p_room_name,coalesce(nullif(p_room_type,''),'private'),coalesce(p_furnished,false),coalesce(p_ensuite,false),coalesce(p_max_occupants,1),p_room_description)
  returning id into v_room;

  insert into public.vacancies(room_id,weekly_rent,bond,bills_included,available_from,minimum_stay_weeks,status,confirmed_at,expires_at,published_at)
  values(v_room,p_weekly_rent,p_bond,coalesce(p_bills_included,false),p_available_from,p_minimum_stay_weeks,'active',now(),now()+interval '21 days',now())
  returning id into v_vacancy;

  return v_vacancy;
end;
$function$;

revoke all on function public.create_vacancy_listing(text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,text,numeric,numeric,boolean,date,integer,integer,integer,boolean) from public, anon;
grant execute on function public.create_vacancy_listing(text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,text,numeric,numeric,boolean,date,integer,integer,integer,boolean) to authenticated, service_role;

create or replace function public.update_vacancy_listing(
  p_vacancy_id uuid, p_suburb text, p_postcode text, p_address_line text, p_property_type text,
  p_household_summary text, p_room_name text, p_furnished boolean, p_ensuite boolean,
  p_room_description text, p_weekly_rent numeric, p_bond numeric, p_bills_included boolean,
  p_available_from date, p_minimum_stay_weeks integer, p_parking_spaces integer,
  p_max_occupants integer, p_pets_considered boolean
) returns uuid
language plpgsql
set search_path to 'public'
as $function$
declare
  v_user uuid := (select auth.uid());
  v_room uuid;
  v_property uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select r.id, p.id into v_room, v_property
  from public.vacancies v
  join public.rooms r on r.id=v.room_id
  join public.properties p on p.id=r.property_id
  where v.id=p_vacancy_id and p.owner_id=v_user;
  if v_room is null then raise exception 'Vacancy not found'; end if;
  if coalesce(trim(p_suburb),'')='' or coalesce(trim(p_postcode),'')='' or coalesce(trim(p_address_line),'')='' or coalesce(trim(p_room_name),'')='' then raise exception 'Missing required listing fields'; end if;
  if p_weekly_rent is null or p_weekly_rent <= 0 then raise exception 'Weekly rent must be positive'; end if;
  if p_available_from is null then raise exception 'Availability date required'; end if;
  if coalesce(p_parking_spaces,0) < 0 or coalesce(p_parking_spaces,0) > 20 then raise exception 'Invalid parking spaces'; end if;
  if coalesce(p_max_occupants,1) < 1 or coalesce(p_max_occupants,1) > 4 then raise exception 'Invalid occupancy'; end if;

  update public.properties set suburb=p_suburb, postcode=p_postcode, property_type=p_property_type,
    parking_spaces=coalesce(p_parking_spaces,0), pets_considered=coalesce(p_pets_considered,false),
    household_summary=p_household_summary, updated_at=now() where id=v_property;
  update public.property_private_locations set address_line=p_address_line, updated_at=now() where property_id=v_property;
  update public.rooms set name=p_room_name, furnished=coalesce(p_furnished,false), ensuite=coalesce(p_ensuite,false),
    max_occupants=coalesce(p_max_occupants,1), description=p_room_description, updated_at=now() where id=v_room;
  update public.vacancies set weekly_rent=p_weekly_rent, bond=p_bond, bills_included=coalesce(p_bills_included,false),
    available_from=p_available_from, minimum_stay_weeks=p_minimum_stay_weeks, confirmed_at=now(), expires_at=now()+interval '21 days', updated_at=now()
    where id=p_vacancy_id;
  return p_vacancy_id;
end;
$function$;

revoke all on function public.update_vacancy_listing(uuid,text,text,text,text,text,text,boolean,boolean,text,numeric,numeric,boolean,date,integer,integer,integer,boolean) from public, anon;
grant execute on function public.update_vacancy_listing(uuid,text,text,text,text,text,text,boolean,boolean,text,numeric,numeric,boolean,date,integer,integer,integer,boolean) to authenticated, service_role;;
