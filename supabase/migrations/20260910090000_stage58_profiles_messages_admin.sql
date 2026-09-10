alter table public.profiles
  add column if not exists avatar_path text;

create table if not exists public.profile_private_contacts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  phone_number text,
  whatsapp_number text,
  updated_at timestamptz not null default now()
);
alter table public.profile_private_contacts enable row level security;
revoke all on table public.profile_private_contacts from anon, authenticated;
grant select, insert, update on table public.profile_private_contacts to authenticated;
drop policy if exists profile_private_contacts_self_read on public.profile_private_contacts;
create policy profile_private_contacts_self_read on public.profile_private_contacts for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists profile_private_contacts_self_insert on public.profile_private_contacts;
create policy profile_private_contacts_self_insert on public.profile_private_contacts for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists profile_private_contacts_self_update on public.profile_private_contacts;
create policy profile_private_contacts_self_update on public.profile_private_contacts for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

alter table public.conversation_members
  add column if not exists last_read_at timestamptz not null default now();

drop policy if exists conversation_members_self_update on public.conversation_members;
create policy conversation_members_self_update on public.conversation_members
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars','profile-avatars',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists profile_avatars_owner_insert on storage.objects;
create policy profile_avatars_owner_insert on storage.objects for insert to authenticated
with check (bucket_id='profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists profile_avatars_owner_select on storage.objects;
create policy profile_avatars_owner_select on storage.objects for select to authenticated
using (bucket_id='profile-avatars' and owner_id=(select auth.uid())::text);

drop policy if exists profile_avatars_owner_update on storage.objects;
create policy profile_avatars_owner_update on storage.objects for update to authenticated
using (bucket_id='profile-avatars' and owner_id=(select auth.uid())::text)
with check (bucket_id='profile-avatars' and owner_id=(select auth.uid())::text);

drop policy if exists profile_avatars_owner_delete on storage.objects;
create policy profile_avatars_owner_delete on storage.objects for delete to authenticated
using (bucket_id='profile-avatars' and owner_id=(select auth.uid())::text);

create or replace function private.admin_account_hierarchy_impl(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_result jsonb;
begin
  if not private.is_admin((select auth.uid())) then raise exception 'admin required'; end if;
  select jsonb_build_object(
    'profile',jsonb_build_object('id',p.id,'display_name',p.display_name,'account_status',p.account_status,'created_at',p.created_at,'phone_verified',p.phone_verified),
    'properties',coalesce((select jsonb_agg(jsonb_build_object(
      'id',pr.id,'title',pr.title,'location',concat_ws(', ',pr.suburb,pr.city),'created_at',pr.created_at,
      'units',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'vacancies',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'status',v.status,'created_at',v.created_at)) from public.vacancies v where v.room_id=r.id),'[]'::jsonb))) from public.rooms r where r.property_id=pr.id),'[]'::jsonb)
    ) order by pr.created_at desc) from public.properties pr where pr.owner_id=p.id),'[]'::jsonb)
  ) into v_result
  from public.profiles p where p.id=p_user_id;
  return coalesce(v_result,jsonb_build_object('error','account not found'));
end;
$$;

revoke all on function private.admin_account_hierarchy_impl(uuid) from public, anon, authenticated;

create or replace function public.admin_account_hierarchy(p_user_id uuid)
returns jsonb
language sql
security invoker
set search_path=''
as $$ select private.admin_account_hierarchy_impl(p_user_id) $$;

revoke all on function public.admin_account_hierarchy(uuid) from public, anon;
grant execute on function public.admin_account_hierarchy(uuid) to authenticated;
