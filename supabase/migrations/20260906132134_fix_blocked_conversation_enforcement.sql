create or replace function public.send_message(p_conversation_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path=public
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

revoke all on function public.send_message(uuid,text) from public, anon;
grant execute on function public.send_message(uuid,text) to authenticated;;
