-- A conversation member can see only their counterpart's public identity and read timestamp.
create function public.conversation_peer_summary(p_conversation_id uuid)
returns table(peer_id uuid,display_name text,avatar_path text,last_read_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.conversation_members me
    where me.conversation_id=p_conversation_id and me.user_id=(select auth.uid())
  ) then raise exception 'Conversation unavailable' using errcode='42501'; end if;
  return query
    select p.id,p.display_name,p.avatar_path,cm.last_read_at
    from public.conversation_members cm
    join public.profiles p on p.id=cm.user_id
    where cm.conversation_id=p_conversation_id and cm.user_id<>(select auth.uid())
    limit 1;
end $$;
revoke all on function public.conversation_peer_summary(uuid) from public,anon,authenticated;
grant execute on function public.conversation_peer_summary(uuid) to authenticated;
