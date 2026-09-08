create index if not exists blocks_blocked_idx on public.blocks(blocked_id);
create index if not exists conversations_vacancy_idx on public.conversations(vacancy_id);
create index if not exists media_owner_idx on public.media(owner_id);
create index if not exists media_property_idx on public.media(property_id);
create index if not exists media_room_idx on public.media(room_id);
create index if not exists messages_sender_idx on public.messages(sender_id);
create index if not exists reports_reporter_idx on public.reports(reporter_id);
create index if not exists reports_vacancy_idx on public.reports(vacancy_id);
create index if not exists reports_reported_user_idx on public.reports(reported_user_id);
create index if not exists saved_vacancies_vacancy_idx on public.saved_vacancies(vacancy_id);

drop policy if exists profiles_self_update on public.profiles;
create policy "profiles_self_update" on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists properties_owner_insert on public.properties;
drop policy if exists properties_owner_update on public.properties;
drop policy if exists properties_owner_delete on public.properties;
create policy "properties_owner_insert" on public.properties for insert with check ((select auth.uid()) = owner_id);
create policy "properties_owner_update" on public.properties for update using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "properties_owner_delete" on public.properties for delete using ((select auth.uid()) = owner_id);

drop policy if exists rooms_owner_insert on public.rooms;
drop policy if exists rooms_owner_update on public.rooms;
drop policy if exists rooms_owner_delete on public.rooms;
create policy "rooms_owner_insert" on public.rooms for insert with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = (select auth.uid())));
create policy "rooms_owner_update" on public.rooms for update using (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = (select auth.uid()))) with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = (select auth.uid())));
create policy "rooms_owner_delete" on public.rooms for delete using (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = (select auth.uid())));

drop policy if exists vacancies_public_active_read on public.vacancies;
drop policy if exists vacancies_owner_insert on public.vacancies;
drop policy if exists vacancies_owner_update on public.vacancies;
drop policy if exists vacancies_owner_delete on public.vacancies;
create policy "vacancies_public_active_read" on public.vacancies for select using (status = 'active' or exists (select 1 from public.rooms r join public.properties p on p.id = r.property_id where r.id = room_id and p.owner_id = (select auth.uid())));
create policy "vacancies_owner_insert" on public.vacancies for insert with check (exists (select 1 from public.rooms r join public.properties p on p.id = r.property_id where r.id = room_id and p.owner_id = (select auth.uid())));
create policy "vacancies_owner_update" on public.vacancies for update using (exists (select 1 from public.rooms r join public.properties p on p.id = r.property_id where r.id = room_id and p.owner_id = (select auth.uid()))) with check (exists (select 1 from public.rooms r join public.properties p on p.id = r.property_id where r.id = room_id and p.owner_id = (select auth.uid())));
create policy "vacancies_owner_delete" on public.vacancies for delete using (exists (select 1 from public.rooms r join public.properties p on p.id = r.property_id where r.id = room_id and p.owner_id = (select auth.uid())));

drop policy if exists media_public_read on public.media;
drop policy if exists media_owner_all on public.media;
create policy "media_read" on public.media for select using (status = 'active' or owner_id = (select auth.uid()));
create policy "media_owner_insert" on public.media for insert with check (owner_id = (select auth.uid()));
create policy "media_owner_update" on public.media for update using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "media_owner_delete" on public.media for delete using (owner_id = (select auth.uid()));

drop policy if exists saved_self_all on public.saved_vacancies;
create policy "saved_self_all" on public.saved_vacancies for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists conversation_member_read on public.conversations;
create policy "conversation_member_read" on public.conversations for select using (exists (select 1 from public.conversation_members cm where cm.conversation_id = id and cm.user_id = (select auth.uid())));

drop policy if exists conversation_members_member_read on public.conversation_members;
drop policy if exists conversation_members_self_insert on public.conversation_members;
create policy "conversation_members_self_read" on public.conversation_members for select using (user_id = (select auth.uid()));
create policy "conversation_members_self_insert" on public.conversation_members for insert with check (user_id = (select auth.uid()));

drop policy if exists messages_member_read on public.messages;
drop policy if exists messages_member_insert on public.messages;
create policy "messages_member_read" on public.messages for select using (exists (select 1 from public.conversation_members cm where cm.conversation_id = conversation_id and cm.user_id = (select auth.uid())));
create policy "messages_member_insert" on public.messages for insert with check (sender_id = (select auth.uid()) and exists (select 1 from public.conversation_members cm where cm.conversation_id = conversation_id and cm.user_id = (select auth.uid())));

drop policy if exists reports_self_insert on public.reports;
drop policy if exists reports_self_read on public.reports;
create policy "reports_self_insert" on public.reports for insert with check (reporter_id = (select auth.uid()));
create policy "reports_self_read" on public.reports for select using (reporter_id = (select auth.uid()));

drop policy if exists blocks_self_all on public.blocks;
create policy "blocks_self_all" on public.blocks for all using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));;
