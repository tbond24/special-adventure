create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  bio text,
  phone_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  country text not null default 'Australia',
  state text not null,
  city text not null,
  suburb text not null,
  postcode text,
  address_line text,
  latitude double precision,
  longitude double precision,
  property_type text,
  bedrooms integer,
  bathrooms numeric,
  parking_spaces integer,
  household_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  room_type text not null default 'private',
  furnished boolean not null default false,
  ensuite boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vacancies (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  weekly_rent numeric(10,2) not null check (weekly_rent >= 0),
  bond numeric(10,2) check (bond is null or bond >= 0),
  bills_included boolean not null default false,
  available_from date not null,
  available_until date,
  minimum_stay_weeks integer check (minimum_stay_weeks is null or minimum_stay_weeks > 0),
  status text not null default 'draft' check (status in ('draft','active','paused','expired','filled','removed')),
  confirmed_at timestamptz,
  expires_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete cascade,
  storage_path text not null,
  mime_type text,
  sort_order integer not null default 0,
  status text not null default 'active' check (status in ('active','hidden','removed')),
  created_at timestamptz not null default now(),
  check ((property_id is not null)::int + (room_id is not null)::int = 1)
);

create table public.saved_vacancies (
  user_id uuid not null references public.profiles(id) on delete cascade,
  vacancy_id uuid not null references public.vacancies(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, vacancy_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.vacancies(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  vacancy_id uuid references public.vacancies(id) on delete set null,
  reported_user_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name',''));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.rooms enable row level security;
alter table public.vacancies enable row level security;
alter table public.media enable row level security;
alter table public.saved_vacancies enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;

create policy "profiles_public_read" on public.profiles for select using (true);
create policy "profiles_self_update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "properties_public_read" on public.properties for select using (true);
create policy "properties_owner_insert" on public.properties for insert with check (auth.uid() = owner_id);
create policy "properties_owner_update" on public.properties for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "properties_owner_delete" on public.properties for delete using (auth.uid() = owner_id);

create policy "rooms_public_read" on public.rooms for select using (true);
create policy "rooms_owner_insert" on public.rooms for insert with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));
create policy "rooms_owner_update" on public.rooms for update using (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));
create policy "rooms_owner_delete" on public.rooms for delete using (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));

create policy "vacancies_public_active_read" on public.vacancies for select using (status = 'active' or exists (select 1 from public.rooms r join public.properties p on p.id = r.property_id where r.id = room_id and p.owner_id = auth.uid()));
create policy "vacancies_owner_insert" on public.vacancies for insert with check (exists (select 1 from public.rooms r join public.properties p on p.id = r.property_id where r.id = room_id and p.owner_id = auth.uid()));
create policy "vacancies_owner_update" on public.vacancies for update using (exists (select 1 from public.rooms r join public.properties p on p.id = r.property_id where r.id = room_id and p.owner_id = auth.uid())) with check (exists (select 1 from public.rooms r join public.properties p on p.id = r.property_id where r.id = room_id and p.owner_id = auth.uid()));
create policy "vacancies_owner_delete" on public.vacancies for delete using (exists (select 1 from public.rooms r join public.properties p on p.id = r.property_id where r.id = room_id and p.owner_id = auth.uid()));

create policy "media_public_read" on public.media for select using (status = 'active');
create policy "media_owner_all" on public.media for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "saved_self_all" on public.saved_vacancies for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "conversation_member_read" on public.conversations for select using (exists (select 1 from public.conversation_members cm where cm.conversation_id = id and cm.user_id = auth.uid()));
create policy "conversation_authenticated_insert" on public.conversations for insert to authenticated with check (true);

create policy "conversation_members_member_read" on public.conversation_members for select using (user_id = auth.uid() or exists (select 1 from public.conversation_members cm where cm.conversation_id = conversation_id and cm.user_id = auth.uid()));
create policy "conversation_members_self_insert" on public.conversation_members for insert with check (user_id = auth.uid());

create policy "messages_member_read" on public.messages for select using (exists (select 1 from public.conversation_members cm where cm.conversation_id = conversation_id and cm.user_id = auth.uid()));
create policy "messages_member_insert" on public.messages for insert with check (sender_id = auth.uid() and exists (select 1 from public.conversation_members cm where cm.conversation_id = conversation_id and cm.user_id = auth.uid()));

create policy "reports_self_insert" on public.reports for insert with check (reporter_id = auth.uid());
create policy "reports_self_read" on public.reports for select using (reporter_id = auth.uid());

create policy "blocks_self_all" on public.blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create index properties_owner_idx on public.properties(owner_id);
create index properties_location_idx on public.properties(state, city, suburb);
create index rooms_property_idx on public.rooms(property_id);
create index vacancies_room_idx on public.vacancies(room_id);
create index vacancies_status_available_idx on public.vacancies(status, available_from);
create index conversation_members_user_idx on public.conversation_members(user_id);
create index messages_conversation_created_idx on public.messages(conversation_id, created_at);
;
