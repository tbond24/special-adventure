insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('room-media','room-media',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "room_media_public_read"
on storage.objects for select
using (bucket_id = 'room-media');

create policy "room_media_owner_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'room-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "room_media_owner_update"
on storage.objects for update to authenticated
using (bucket_id = 'room-media' and owner_id = (select auth.uid()::text))
with check (bucket_id = 'room-media' and owner_id = (select auth.uid()::text));

create policy "room_media_owner_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'room-media' and owner_id = (select auth.uid()::text));;
