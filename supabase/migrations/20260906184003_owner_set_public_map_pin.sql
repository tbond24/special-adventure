create or replace function public.set_vacancy_public_location(p_vacancy_id uuid,p_latitude numeric,p_longitude numeric)
returns uuid
language plpgsql
security invoker
set search_path=public
as $$
declare v_user uuid:=auth.uid(); v_property uuid;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if p_latitude is null or p_latitude not between -90 and 90 then raise exception 'Invalid latitude'; end if;
 if p_longitude is null or p_longitude not between -180 and 180 then raise exception 'Invalid longitude'; end if;
 select p.id into v_property
 from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id
 where v.id=p_vacancy_id and p.owner_id=v_user;
 if v_property is null then raise exception 'Vacancy not found'; end if;
 update public.properties set public_latitude=p_latitude,public_longitude=p_longitude,updated_at=now() where id=v_property;
 return v_property;
end $$;
revoke all on function public.set_vacancy_public_location(uuid,numeric,numeric) from public,anon;
grant execute on function public.set_vacancy_public_location(uuid,numeric,numeric) to authenticated;;
