alter table public.messages add column if not exists media_path text;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('conversation-media','conversation-media',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

create policy conversation_media_member_read on storage.objects for select to authenticated
using (
  bucket_id='conversation-media'
  and exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id::text=(storage.foldername(name))[1]
      and cm.user_id=(select auth.uid())
  )
);
create policy conversation_media_member_upload on storage.objects for insert to authenticated
with check (
  bucket_id='conversation-media'
  and (storage.foldername(name))[2]=(select auth.uid())::text
  and exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id::text=(storage.foldername(name))[1]
      and cm.user_id=(select auth.uid())
  )
);
create policy conversation_media_owner_delete on storage.objects for delete to authenticated
using (bucket_id='conversation-media' and owner_id=(select auth.uid())::text);

create function public.send_photo_message(p_conversation_id uuid,p_body text,p_media_path text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_message_id uuid;
begin
  if (select auth.uid()) is null or p_media_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
    or split_part(p_media_path,'/',1)<>p_conversation_id::text
    or split_part(p_media_path,'/',2)<>(select auth.uid())::text
    or not exists (
      select 1 from storage.objects o
      where o.bucket_id='conversation-media' and o.name=p_media_path
        and o.owner_id=(select auth.uid())::text
    ) then raise exception 'Photo unavailable' using errcode='42501'; end if;
  v_message_id:=private.send_message_impl(p_conversation_id,coalesce(nullif(left(trim(p_body),1200),''),'Photo'));
  update public.messages set media_path=p_media_path where id=v_message_id;
  return v_message_id;
end $$;
revoke all on function public.send_photo_message(uuid,text,text) from public,anon,authenticated;
grant execute on function public.send_photo_message(uuid,text,text) to authenticated;
