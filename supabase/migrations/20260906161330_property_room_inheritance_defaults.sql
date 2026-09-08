alter table public.properties add column if not exists smoking_allowed boolean not null default false;
alter table public.rooms add column if not exists smoking_allowed_override boolean;
alter table public.rooms add column if not exists pets_considered_override boolean;

create or replace function public.update_property_defaults(
  p_property_id uuid,
  p_smoking_allowed boolean,
  p_pets_considered boolean,
  p_parking_spaces integer,
  p_household_summary text
) returns uuid
language plpgsql
set search_path to 'public'
as $function$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if coalesce(p_parking_spaces,0) < 0 or coalesce(p_parking_spaces,0) > 20 then raise exception 'Invalid parking spaces'; end if;
  update public.properties
    set smoking_allowed=coalesce(p_smoking_allowed,false),
        pets_considered=coalesce(p_pets_considered,false),
        parking_spaces=coalesce(p_parking_spaces,0),
        household_summary=p_household_summary,
        updated_at=now()
  where id=p_property_id and owner_id=v_user;
  if not found then raise exception 'Property not found'; end if;
  return p_property_id;
end;
$function$;
revoke all on function public.update_property_defaults(uuid,boolean,boolean,integer,text) from public, anon;
grant execute on function public.update_property_defaults(uuid,boolean,boolean,integer,text) to authenticated, service_role;

create or replace function public.create_room_vacancy_for_property(
  p_property_id uuid,
  p_room_name text,
  p_room_type text,
  p_furnished boolean,
  p_ensuite boolean,
  p_max_occupants integer,
  p_room_description text,
  p_smoking_allowed_override boolean,
  p_pets_considered_override boolean,
  p_weekly_rent numeric,
  p_bond numeric,
  p_bills_included boolean,
  p_available_from date,
  p_minimum_stay_weeks integer
) returns uuid
language plpgsql
set search_path to 'public'
as $function$
declare
  v_user uuid := (select auth.uid());
  v_room uuid;
  v_vacancy uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.properties where id=p_property_id and owner_id=v_user) then raise exception 'Property not found'; end if;
  if coalesce(trim(p_room_name),'')='' then raise exception 'Room name required'; end if;
  if p_weekly_rent is null or p_weekly_rent <= 0 then raise exception 'Weekly rent must be positive'; end if;
  if p_available_from is null then raise exception 'Availability date required'; end if;
  if coalesce(p_max_occupants,1) < 1 or coalesce(p_max_occupants,1) > 4 then raise exception 'Invalid occupancy'; end if;

  insert into public.rooms(property_id,name,room_type,furnished,ensuite,max_occupants,description,smoking_allowed_override,pets_considered_override)
  values(p_property_id,p_room_name,coalesce(nullif(p_room_type,''),'private'),coalesce(p_furnished,false),coalesce(p_ensuite,false),coalesce(p_max_occupants,1),p_room_description,p_smoking_allowed_override,p_pets_considered_override)
  returning id into v_room;

  insert into public.vacancies(room_id,weekly_rent,bond,bills_included,available_from,minimum_stay_weeks,status,confirmed_at,expires_at,published_at)
  values(v_room,p_weekly_rent,p_bond,coalesce(p_bills_included,false),p_available_from,p_minimum_stay_weeks,'active',now(),now()+interval '21 days',now())
  returning id into v_vacancy;
  return v_vacancy;
end;
$function$;
revoke all on function public.create_room_vacancy_for_property(uuid,text,text,boolean,boolean,integer,text,boolean,boolean,numeric,numeric,boolean,date,integer) from public, anon;
grant execute on function public.create_room_vacancy_for_property(uuid,text,text,boolean,boolean,integer,text,boolean,boolean,numeric,numeric,boolean,date,integer) to authenticated, service_role;

create or replace function public.update_room_overrides(
  p_room_id uuid,
  p_smoking_allowed_override boolean,
  p_pets_considered_override boolean
) returns uuid
language plpgsql
set search_path to 'public'
as $function$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  update public.rooms r
  set smoking_allowed_override=p_smoking_allowed_override,
      pets_considered_override=p_pets_considered_override,
      updated_at=now()
  from public.properties p
  where r.id=p_room_id and r.property_id=p.id and p.owner_id=v_user;
  if not found then raise exception 'Room not found'; end if;
  return p_room_id;
end;
$function$;
revoke all on function public.update_room_overrides(uuid,boolean,boolean) from public, anon;
grant execute on function public.update_room_overrides(uuid,boolean,boolean) to authenticated, service_role;;
