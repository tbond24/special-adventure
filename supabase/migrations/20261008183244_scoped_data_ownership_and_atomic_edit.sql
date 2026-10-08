-- Scoped ownership/privilege repair. No existing user data is rewritten.
-- Member read markers are the only client-editable membership field.
revoke update on public.conversation_members from public, anon, authenticated;
revoke update (conversation_id,user_id,joined_at,last_read_at) on public.conversation_members from public, anon, authenticated;
grant update (last_read_at) on public.conversation_members to authenticated;

-- Every shipped profile mutation was audited: profile edit, Google bootstrap,
-- and avatar upload only write these two fields. Verification/status stay trusted.
revoke update on public.profiles from public, anon, authenticated;
revoke update (id,display_name,bio,phone_verified,created_at,updated_at,account_status,avatar_path) on public.profiles from public, anon, authenticated;
grant update (display_name,avatar_path) on public.profiles to authenticated;

-- Validate actual Storage ownership rather than a new filename convention:
-- valid old upload paths and reused photos continue to work.
create or replace function private.owns_media_target(p_owner uuid,p_property uuid,p_room uuid,p_path text)
returns boolean language sql stable security definer set search_path='' as $$
  select p_owner=(select auth.uid())
    and private.is_active_user(p_owner)
    and (
      (p_room is not null and p_property is null and exists (
        select 1 from public.rooms r join public.properties p on p.id=r.property_id
        where r.id=p_room and p.owner_id=p_owner
      )) or
      (p_property is not null and p_room is null and exists (
        select 1 from public.properties p where p.id=p_property and p.owner_id=p_owner
      ))
    )
    and exists (select 1 from storage.objects o
      where o.bucket_id='room-media' and o.name=p_path and o.owner_id=p_owner::text)
$$;
revoke all on function private.owns_media_target(uuid,uuid,uuid,text) from public,anon;
grant execute on function private.owns_media_target(uuid,uuid,uuid,text) to authenticated;
drop policy if exists media_owner_insert on public.media;
create policy media_owner_insert on public.media for insert to authenticated
  with check (private.owns_media_target(owner_id,property_id,room_id,storage_path));
drop policy if exists media_owner_update on public.media;
create policy media_owner_update on public.media for update to authenticated
  using (owner_id=(select auth.uid()))
  with check (private.owns_media_target(owner_id,property_id,room_id,storage_path));

-- Message creation goes through the checked RPCs. Table RLS alone did not
-- enforce the bilateral block check and trusted media attachment rules.
drop policy if exists messages_member_insert on public.messages;
revoke insert on public.messages from public,anon,authenticated;
revoke insert (id,conversation_id,sender_id,body,created_at,read_at,media_path) on public.messages from public,anon,authenticated;

create or replace function private.send_message_impl(p_conversation_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid := auth.uid(); v_id uuid;
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  if not private.is_active_user(v_user) then raise exception 'active account required' using errcode='42501'; end if;
  if p_body is null or length(trim(p_body)) < 1 then raise exception 'message required'; end if;
  if not exists (select 1 from public.conversation_members cm where cm.conversation_id=p_conversation_id and cm.user_id=v_user)
    then raise exception 'not a conversation member' using errcode='42501'; end if;
  if exists (select 1 from public.conversation_members other join public.blocks b
      on (b.blocker_id=v_user and b.blocked_id=other.user_id) or (b.blocker_id=other.user_id and b.blocked_id=v_user)
      where other.conversation_id=p_conversation_id and other.user_id<>v_user)
    then raise exception 'conversation unavailable' using errcode='42501'; end if;
  insert into public.messages(conversation_id,sender_id,body)
    values(p_conversation_id,v_user,trim(p_body)) returning id into v_id;
  return v_id;
end $$;

create or replace function private.start_enquiry_impl(p_vacancy_id uuid,p_requested_move_in date,p_stay_weeks integer,p_renter_intro text,p_message text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid := auth.uid(); v_owner uuid; v_conversation uuid; v_status text; v_expires timestamptz;
begin
  if v_user is null then raise exception 'authentication required' using errcode='42501'; end if;
  if not private.is_active_user(v_user) then raise exception 'active account required' using errcode='42501'; end if;
  if p_message is null or length(trim(p_message)) < 1 then raise exception 'message required'; end if;
  if p_stay_weeks is not null and p_stay_weeks<=0 then raise exception 'stay_weeks must be positive'; end if;
  select p.owner_id,v.status,v.expires_at into v_owner,v_status,v_expires
    from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id
    where v.id=p_vacancy_id;
  if v_owner is null then raise exception 'active vacancy not found'; end if;
  if v_owner=v_user then raise exception 'cannot enquire on own vacancy'; end if;
  select c.id into v_conversation from public.conversations c
    join public.conversation_members me on me.conversation_id=c.id and me.user_id=v_user
    join public.conversation_members owner_cm on owner_cm.conversation_id=c.id and owner_cm.user_id=v_owner
    where c.vacancy_id=p_vacancy_id limit 1;
  if v_conversation is null then
    -- A paused/expired listing must not start a new enquiry. Existing members
    -- keep their history and may continue through the same checked send path.
    if v_status<>'active' or (v_expires is not null and v_expires<=now()) or not private.is_active_user(v_owner)
      then raise exception 'active vacancy not found'; end if;
    if exists (select 1 from public.blocks b where (b.blocker_id=v_user and b.blocked_id=v_owner) or (b.blocker_id=v_owner and b.blocked_id=v_user))
      then raise exception 'conversation unavailable' using errcode='42501'; end if;
    insert into public.conversations(vacancy_id,requested_move_in,stay_weeks,renter_intro)
      values(p_vacancy_id,p_requested_move_in,p_stay_weeks,nullif(trim(p_renter_intro),'')) returning id into v_conversation;
    insert into public.conversation_members(conversation_id,user_id) values(v_conversation,v_user),(v_conversation,v_owner);
  end if;
  perform private.send_message_impl(v_conversation,p_message);
  return v_conversation;
end $$;

-- Public wrappers are SECURITY INVOKER; these exact private grants are required.
revoke all on function private.start_enquiry_impl(uuid,date,integer,text,text) from public,anon;
revoke all on function private.send_message_impl(uuid,text) from public,anon;
grant execute on function private.start_enquiry_impl(uuid,date,integer,text,text) to authenticated;
grant execute on function private.send_message_impl(uuid,text) to authenticated;

-- Blank private names mean remove the optional label, never a forbidden blank row.
grant delete on public.room_private_names to authenticated;
drop policy if exists room_private_names_owner_delete on public.room_private_names;
create policy room_private_names_owner_delete on public.room_private_names for delete to authenticated
  using (exists (select 1 from public.rooms r join public.properties p on p.id=r.property_id
    where r.id=room_id and p.owner_id=(select auth.uid())));
do $$ declare op text; begin
  foreach op in array array['insert','update','delete'] loop
    execute format('drop policy if exists active_permanent_%s_required on public.room_private_names',op);
    execute format('create policy active_permanent_%s_required on public.room_private_names as restrictive for %s to authenticated %s',op,op,
      case op when 'insert' then 'with check (private.is_active_user((select auth.uid())) and private.is_permanent_user())'
        when 'delete' then 'using (private.is_active_user((select auth.uid())) and private.is_permanent_user())'
        else 'using (private.is_active_user((select auth.uid())) and private.is_permanent_user()) with check (private.is_active_user((select auth.uid())) and private.is_permanent_user())' end);
  end loop;
end $$;

-- Preserve the current helper contract while enforcing current account status.
CREATE OR REPLACE FUNCTION private.is_admin(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    p_user is not null
    and private.is_active_user(p_user)
    and coalesce((select auth.jwt()->>'aal'),'aal1') = 'aal2'
    and exists(select 1 from public.admin_users where user_id=p_user);
$function$
;

-- Preserve the current helper contract while enforcing current account status.
CREATE OR REPLACE FUNCTION public.conversation_peer_summary(p_conversation_id uuid)
 RETURNS TABLE(peer_id uuid, display_name text, avatar_path text, last_read_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is null or not private.is_active_user((select auth.uid())) or not exists (
    select 1 from public.conversation_members me
    where me.conversation_id=p_conversation_id and me.user_id=(select auth.uid())
  ) then raise exception 'Conversation unavailable' using errcode='42501'; end if;
  return query
    select p.id,p.display_name,p.avatar_path,cm.last_read_at
    from public.conversation_members cm
    join public.profiles p on p.id=cm.user_id
    where cm.conversation_id=p_conversation_id and cm.user_id<>(select auth.uid())
    limit 1;
end $function$
;

-- Preserve the current helper contract while enforcing current account status.
CREATE OR REPLACE FUNCTION public.set_contact_preferences(p_in_app boolean, p_email boolean, p_phone boolean DEFAULT false, p_whatsapp boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid := (select auth.uid());
  email_ok boolean;
  phone_ok boolean;
begin
  if not private.is_active_user(uid) then raise exception 'active account required' using errcode='42501'; end if;
  if uid is null or coalesce((select auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'permanent account required'; end if;
  select email_confirmed_at is not null into email_ok from auth.users where id=uid;
  select coalesce(phone_verified,false) into phone_ok from public.profiles where id=uid;
  if coalesce(p_email,false) and not coalesce(email_ok,false) then raise exception 'confirm email before enabling email contact'; end if;
  if (coalesce(p_phone,false) or coalesce(p_whatsapp,false)) and not coalesce(phone_ok,false) then raise exception 'verify phone before enabling phone contact'; end if;
  if not (coalesce(p_in_app,false) or coalesce(p_email,false) or coalesce(p_phone,false) or coalesce(p_whatsapp,false)) then raise exception 'choose at least one contact method'; end if;
  insert into public.profile_private_contacts(user_id,enquiry_in_app,enquiry_email,enquiry_phone,enquiry_whatsapp,updated_at)
  values(uid,coalesce(p_in_app,false),coalesce(p_email,false),coalesce(p_phone,false),coalesce(p_whatsapp,false),now())
  on conflict(user_id) do update set enquiry_in_app=excluded.enquiry_in_app,enquiry_email=excluded.enquiry_email,enquiry_phone=excluded.enquiry_phone,enquiry_whatsapp=excluded.enquiry_whatsapp,updated_at=now();
end;
$function$
;

-- Preserve the current helper contract while enforcing current account status.
CREATE OR REPLACE FUNCTION public.set_property_manager_nickname(p_property_id uuid, p_nickname text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if auth.uid() is null or not private.is_active_user(auth.uid()) or not private.is_permanent_user() or not exists (
    select 1 from public.properties
    where id = p_property_id and owner_id = auth.uid()
  ) then
    raise exception 'Property not found';
  end if;

  update public.property_private_locations
  set manager_nickname = nullif(trim(p_nickname), '')
  where property_id = p_property_id;
end;
$function$
;

-- One transaction for the existing edit form's database writes. Storage uploads
-- remain a separate step and the client reports/retries that step explicitly.
create or replace function public.update_listing_atomic(p_vacancy_id uuid,p_input jsonb,p_details jsonb,p_private_name text,p_latitude numeric default null,p_longitude numeric default null)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_room uuid; v_name text := nullif(trim(p_private_name),'');
begin
  if not private.is_active_user((select auth.uid())) or not private.is_permanent_user()
    then raise exception 'active permanent account required' using errcode='42501'; end if;
  if jsonb_typeof(coalesce(p_details,'{}'::jsonb))<>'object' then raise exception 'Unit details must be an object'; end if;
  if length(v_name)>100 then raise exception 'Private unit name must be 100 characters or fewer'; end if;
  select r.id into v_room from public.vacancies v join public.rooms r on r.id=v.room_id
    join public.properties p on p.id=r.property_id where v.id=p_vacancy_id and p.owner_id=(select auth.uid());
  if v_room is null then raise exception 'Vacancy not found' using errcode='42501'; end if;
  perform public.update_vacancy_listing_v2(
    p_vacancy_id,
    (p_input->>'p_locality')::text,
    (p_input->>'p_city')::text,
    (p_input->>'p_region')::text,
    (p_input->>'p_postal')::text,
    (p_input->>'p_landmark')::text,
    (p_input->>'p_country')::text,
    (p_input->>'p_market_code')::text,
    (p_input->>'p_address_line')::text,
    (p_input->>'p_property_type')::text,
    (p_input->>'p_household_summary')::text,
    (p_input->>'p_unit_name')::text,
    (p_input->>'p_unit_type')::text,
    (p_input->>'p_furnished')::boolean,
    (p_input->>'p_ensuite')::boolean,
    (p_input->>'p_unit_description')::text,
    (p_input->>'p_rent_amount')::numeric,
    (p_input->>'p_rent_currency')::text,
    (p_input->>'p_rent_period')::text,
    (p_input->>'p_deposit')::numeric,
    (p_input->>'p_bills_included')::boolean,
    (p_input->>'p_available_from')::date,
    (p_input->>'p_minimum_stay_weeks')::integer,
    (p_input->>'p_parking_spaces')::integer,
    (p_input->>'p_max_occupants')::integer,
    (p_input->>'p_pets_considered')::boolean,
    (p_input->>'p_smoking_allowed')::boolean,
    (p_input->>'p_water_available')::boolean,
    (p_input->>'p_electricity_available')::boolean,
    (p_input->>'p_security_available')::boolean,
    (p_input->>'p_internet_available')::boolean);
  perform public.update_room_overrides(v_room,(p_input->>'p_smoking_override')::boolean,(p_input->>'p_pets_override')::boolean);
  update public.rooms set unit_details=coalesce(p_details,'{}'::jsonb) where id=v_room;
  if p_private_name is not null then
    if v_name is null then delete from public.room_private_names where room_id=v_room;
    else insert into public.room_private_names(room_id,name) values(v_room,v_name)
      on conflict(room_id) do update set name=excluded.name;
    end if;
  end if;
  if p_latitude is not null or p_longitude is not null then
    if p_latitude is null or p_longitude is null then raise exception 'Both map coordinates are required'; end if;
    perform public.set_vacancy_public_location(p_vacancy_id,p_latitude,p_longitude);
  end if;
  return p_vacancy_id;
end $$;
revoke all on function public.update_listing_atomic(uuid,jsonb,jsonb,text,numeric,numeric) from public,anon;
grant execute on function public.update_listing_atomic(uuid,jsonb,jsonb,text,numeric,numeric) to authenticated;

-- A lost API response may race a retry. Exactly one active link to an object is
-- allowed per room; hidden/removed history and property-level media are untouched.
-- Preflight must report zero duplicate active(room_id,storage_path) groups. If a
-- concurrent duplicate appears before apply, this transaction must fail safely.
create unique index if not exists media_one_active_room_path
  on public.media(room_id,storage_path) where room_id is not null and status='active';
