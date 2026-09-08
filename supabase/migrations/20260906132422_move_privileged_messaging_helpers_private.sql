create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.start_enquiry_impl(
  p_vacancy_id uuid,
  p_requested_move_in date,
  p_stay_weeks integer,
  p_renter_intro text,
  p_message text
) returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
  v_conversation uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if p_message is null or length(trim(p_message)) < 1 then raise exception 'message required'; end if;
  if p_stay_weeks is not null and p_stay_weeks <= 0 then raise exception 'stay_weeks must be positive'; end if;

  select p.owner_id into v_owner
  from public.vacancies v
  join public.rooms r on r.id = v.room_id
  join public.properties p on p.id = r.property_id
  where v.id = p_vacancy_id and v.status = 'active';

  if v_owner is null then raise exception 'active vacancy not found'; end if;
  if v_owner = v_user then raise exception 'cannot enquire on own vacancy'; end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id=v_user and b.blocked_id=v_owner)
       or (b.blocker_id=v_owner and b.blocked_id=v_user)
  ) then raise exception 'conversation unavailable'; end if;

  select c.id into v_conversation
  from public.conversations c
  join public.conversation_members me on me.conversation_id=c.id and me.user_id=v_user
  join public.conversation_members owner_cm on owner_cm.conversation_id=c.id and owner_cm.user_id=v_owner
  where c.vacancy_id=p_vacancy_id
  limit 1;

  if v_conversation is null then
    insert into public.conversations(vacancy_id, requested_move_in, stay_weeks, renter_intro)
    values (p_vacancy_id, p_requested_move_in, p_stay_weeks, nullif(trim(p_renter_intro),''))
    returning id into v_conversation;

    insert into public.conversation_members(conversation_id,user_id)
    values (v_conversation,v_user),(v_conversation,v_owner);
  end if;

  insert into public.messages(conversation_id,sender_id,body)
  values (v_conversation,v_user,trim(p_message));

  return v_conversation;
end;
$$;

create or replace function private.send_message_impl(p_conversation_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if p_body is null or length(trim(p_body)) < 1 then raise exception 'message required'; end if;

  if not exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id=p_conversation_id and cm.user_id=v_user
  ) then raise exception 'not a conversation member'; end if;

  if exists (
    select 1
    from public.conversation_members other
    join public.blocks b
      on (b.blocker_id=v_user and b.blocked_id=other.user_id)
      or (b.blocker_id=other.user_id and b.blocked_id=v_user)
    where other.conversation_id=p_conversation_id
      and other.user_id<>v_user
  ) then raise exception 'conversation unavailable'; end if;

  insert into public.messages(conversation_id,sender_id,body)
  values (p_conversation_id,v_user,trim(p_body)) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function private.start_enquiry_impl(uuid,date,integer,text,text) from public, anon;
revoke all on function private.send_message_impl(uuid,text) from public, anon;
grant execute on function private.start_enquiry_impl(uuid,date,integer,text,text) to authenticated;
grant execute on function private.send_message_impl(uuid,text) to authenticated;

create or replace function public.start_enquiry(
  p_vacancy_id uuid,
  p_requested_move_in date,
  p_stay_weeks integer,
  p_renter_intro text,
  p_message text
) returns uuid
language sql
security invoker
set search_path = public, private
as $$
  select private.start_enquiry_impl(p_vacancy_id,p_requested_move_in,p_stay_weeks,p_renter_intro,p_message);
$$;

create or replace function public.send_message(p_conversation_id uuid, p_body text)
returns uuid
language sql
security invoker
set search_path = public, private
as $$
  select private.send_message_impl(p_conversation_id,p_body);
$$;

revoke all on function public.start_enquiry(uuid,date,integer,text,text) from public, anon;
revoke all on function public.send_message(uuid,text) from public, anon;
grant execute on function public.start_enquiry(uuid,date,integer,text,text) to authenticated;
grant execute on function public.send_message(uuid,text) to authenticated;;
