-- Site-wide icon overrides. Only MFA-verified operators may change them.
create table public.site_icon_slots (slot text primary key, label text not null);
insert into public.site_icon_slots(slot,label) values
('find','Find'),('saved','Saved'),('inbox','Inbox'),('you','You'),('sun','Sun'),('moon','Moon'),
('location-arrow','Current location'),('location-pin','Location pin'),('tools','Filters'),
('card-grid','Cards'),('list-view','List'),('flag','Report'),('chevron','Chevron'),
('info','Information'),('arrow-right','Right arrow'),('arrow-ne','Search arrow'),
('eye','Visible'),('eye-off','Hidden'),('water','Water'),('bolt','Electricity'),
('shield','Security'),('wifi','Wi-Fi'),('smoking','Smoking'),('pets','Pets'),
('furnished','Furnished'),('shower','Shower'),('bills','Bills'),('parking','Parking'),
('balcony','Balcony'),('shop','Shop'),('house','House'),('building','Building'),
('pause','Pause'),('pencil','Edit');
create table public.site_icon_overrides (
 slot text primary key references public.site_icon_slots(slot),
 source_slot text references public.site_icon_slots(slot),
 path_d text,
 updated_at timestamptz not null default now(),
 constraint icon_override_one_source check ((source_slot is null) <> (path_d is null)),
 constraint icon_override_safe_path check (path_d is null or (length(path_d) between 3 and 1200 and path_d ~ '^[MmLlHhVvCcSsQqTtAaZz0-9 .,+-]+$'))
);
create table public.site_icon_revisions (
 id bigint generated always as identity primary key,
 slot text not null references public.site_icon_slots(slot),
 source_slot text references public.site_icon_slots(slot),
 path_d text,
 actor_id uuid not null,
 created_at timestamptz not null default now(),
 constraint icon_revision_one_source check (source_slot is null or path_d is null)
);
create index site_icon_revisions_slot_created_idx on public.site_icon_revisions(slot,created_at desc);
alter table public.site_icon_slots enable row level security;
alter table public.site_icon_overrides enable row level security;
alter table public.site_icon_revisions enable row level security;
revoke all on public.site_icon_slots,public.site_icon_overrides,public.site_icon_revisions from anon,authenticated;
grant select on public.site_icon_slots,public.site_icon_overrides to anon,authenticated;
grant select on public.site_icon_revisions to authenticated;
create policy icon_slots_read on public.site_icon_slots for select to anon,authenticated using (true);
create policy icon_overrides_read on public.site_icon_overrides for select to anon,authenticated using (true);
create policy icon_revisions_admin_read on public.site_icon_revisions for select to authenticated using (private.is_admin((select auth.uid())));
create or replace function public.admin_set_site_icon(p_slot text,p_source_slot text default null,p_path_d text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not private.is_admin((select auth.uid())) then raise exception 'Not an MFA-verified administrator' using errcode='42501'; end if;
 if not exists(select 1 from public.site_icon_slots where slot=p_slot) then raise exception 'Unknown icon slot' using errcode='22023'; end if;
 if p_source_slot is not null and not exists(select 1 from public.site_icon_slots where slot=p_source_slot) then raise exception 'Unknown source icon' using errcode='22023'; end if;
 if p_source_slot is not null and p_path_d is not null then raise exception 'Choose one icon source' using errcode='22023'; end if;
 if p_path_d is not null and (length(p_path_d) not between 3 and 1200 or p_path_d !~ '^[MmLlHhVvCcSsQqTtAaZz0-9 .,+-]+$') then raise exception 'Invalid SVG path' using errcode='22023'; end if;
 if p_source_slot is null and p_path_d is null then
  delete from public.site_icon_overrides where slot=p_slot;
 else
  insert into public.site_icon_overrides(slot,source_slot,path_d) values(p_slot,p_source_slot,p_path_d)
  on conflict(slot) do update set source_slot=excluded.source_slot,path_d=excluded.path_d,updated_at=now();
 end if;
 insert into public.site_icon_revisions(slot,source_slot,path_d,actor_id) values(p_slot,p_source_slot,p_path_d,(select auth.uid()));
end $$;
revoke all on function public.admin_set_site_icon(text,text,text) from public,anon,authenticated;
grant execute on function public.admin_set_site_icon(text,text,text) to authenticated;
