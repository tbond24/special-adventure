-- Admin/AAL2-only invalidations. No customer rows, contents or counters in messages.
-- Realtime schema is managed: add a policy only; do not alter its table/schema.
do $$ begin
 if not (select relrowsecurity from pg_class where oid='realtime.messages'::regclass) then raise exception 'Realtime messages must retain RLS';end if;
end $$;
create policy vacancy_admin_overview_receive on realtime.messages for select to authenticated
using (extension='broadcast' and topic='vacancy-admin-overview-v1' and realtime.topic()=topic
 and (select private.is_admin((select auth.uid()))));

create function public.admin_overview_live_access() returns boolean language sql stable security invoker set search_path=''
as $$select private.is_admin((select auth.uid()))$$;
revoke all on function public.admin_overview_live_access() from public,anon,authenticated;
grant execute on function public.admin_overview_live_access() to authenticated;

-- Internal trigger needs to emit to managed Realtime on behalf of ordinary writes.
-- It is not a browser-callable privilege escalation or a replacement for report gates.
create function private.notify_admin_overview() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform realtime.send(jsonb_build_object('schemaVersion',1,'groups',string_to_array(tg_argv[0],',')),'changed','vacancy-admin-overview-v1',true);
 return null;
exception when others then
 -- Optional dashboard delivery must never fail a listing, message, auth or file write.
 raise warning 'Admin overview notification unavailable';return null;
end $$;
revoke all on function private.notify_admin_overview() from public,anon,authenticated,service_role;

create trigger vacancy_admin_live after insert or update or delete on auth.users for each statement execute function private.notify_admin_overview('accounts,presence,traffic,visitor_feed');
create trigger vacancy_admin_live after insert or update or delete on public.profiles for each statement execute function private.notify_admin_overview('access,presence,capacity,locations');
create trigger vacancy_admin_live after insert or update or delete on public.admin_users for each statement execute function private.notify_admin_overview('access,presence,capacity,locations,traffic,journey,visitor_feed');
create trigger vacancy_admin_live after insert or update or delete on public.vacancies for each statement execute function private.notify_admin_overview('listings,capacity,locations');
create trigger vacancy_admin_live after insert or update or delete on public.rooms for each statement execute function private.notify_admin_overview('capacity,locations');
create trigger vacancy_admin_live after insert or update or delete on public.properties for each statement execute function private.notify_admin_overview('capacity,locations');
create trigger vacancy_admin_live after insert or update or delete on public.media for each statement execute function private.notify_admin_overview('images');
create trigger vacancy_admin_live after insert or update or delete on public.conversations for each statement execute function private.notify_admin_overview('enquiries');
create trigger vacancy_admin_live after insert or update or delete on public.messages for each statement execute function private.notify_admin_overview('messages');
create trigger vacancy_admin_live after insert or update or delete on public.analytics_events for each statement execute function private.notify_admin_overview('traffic,journey,activity,tracking,visitor_feed');
create trigger vacancy_admin_live after insert or update or delete on public.listing_activity_log for each statement execute function private.notify_admin_overview('visitor_feed');
create trigger vacancy_admin_live after insert or update or delete on private.visitor_presence for each statement execute function private.notify_admin_overview('presence');
create trigger vacancy_admin_live after insert or update or delete on private.engagement_events for each statement execute function private.notify_admin_overview('engagement,visitor_feed');
create trigger vacancy_admin_live after insert or update or delete on private.site_change_feed for each statement execute function private.notify_admin_overview('site_feed');
create trigger vacancy_admin_live after insert or update or delete on storage.objects for each statement execute function private.notify_admin_overview('capacity');
notify pgrst,'reload schema';
