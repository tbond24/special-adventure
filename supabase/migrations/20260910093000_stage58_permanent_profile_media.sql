drop policy if exists permanent_user_private_contact_insert_required on public.profile_private_contacts;
create policy permanent_user_private_contact_insert_required on public.profile_private_contacts
as restrictive for insert to authenticated with check (private.is_permanent_user());

drop policy if exists permanent_user_private_contact_update_required on public.profile_private_contacts;
create policy permanent_user_private_contact_update_required on public.profile_private_contacts
as restrictive for update to authenticated using (private.is_permanent_user()) with check (private.is_permanent_user());

drop policy if exists profile_avatars_owner_insert on storage.objects;
create policy profile_avatars_owner_insert on storage.objects for insert to authenticated
with check (bucket_id='profile-avatars' and private.is_permanent_user() and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists profile_avatars_owner_update on storage.objects;
create policy profile_avatars_owner_update on storage.objects for update to authenticated
using (bucket_id='profile-avatars' and private.is_permanent_user() and owner_id=(select auth.uid())::text)
with check (bucket_id='profile-avatars' and private.is_permanent_user() and owner_id=(select auth.uid())::text);

drop policy if exists profile_avatars_owner_delete on storage.objects;
create policy profile_avatars_owner_delete on storage.objects for delete to authenticated
using (bucket_id='profile-avatars' and private.is_permanent_user() and owner_id=(select auth.uid())::text);
