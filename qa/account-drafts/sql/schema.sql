-- LOCAL REVIEW CANDIDATE V2. Not a migration; do not apply without reviewed approval.
-- Two new tables, one new PRIVATE bucket, and draft-only APIs/policies.
-- Existing listing/schema/bucket/auth policies are intentionally unchanged.
-- Revalidate live grants, helpers, Storage metadata and API behavior before use.

create table public.listing_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  source_draft_id uuid not null,
  revision bigint not null default 0 check (revision >= 0),
  current_transfer_id uuid,
  state text not null default 'editing' check (state in ('editing','publishing','published','archived')),
  published_units jsonb not null default '{}'::jsonb check (jsonb_typeof(published_units)='object'),
  publish_token uuid,
  created_units jsonb not null default '{}'::jsonb check(jsonb_typeof(created_units)='object'),
  last_action jsonb,
  publish_media jsonb not null default '{}'::jsonb check(jsonb_typeof(publish_media)='object'),
  finish_token uuid,
  finish_transfer_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id,source_draft_id),
  unique(id,owner_id)
);
create index listing_drafts_owner_updated on public.listing_drafts(owner_id,updated_at desc);

-- One immutable candidate snapshot/manifest per client operation. Uploading a
-- candidate never replaces the head pointer to the last complete version.
create table public.listing_draft_manifests (
  draft_id uuid not null,
  owner_id uuid not null,
  transfer_id uuid not null,
  base_revision bigint not null check (base_revision >= 0),
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  assets jsonb not null check (jsonb_typeof(assets)='array'),
  property_id uuid references public.properties(id),
  edit_vacancy_id uuid references public.vacancies(id),
  committed_revision bigint,
  created_at timestamptz not null default now(),
  committed_at timestamptz,
  finish_token uuid,
  primary key(draft_id,transfer_id),
  foreign key(draft_id,owner_id) references public.listing_drafts(id,owner_id),
  check ((committed_revision is null) = (committed_at is null))
);
alter table public.listing_drafts add constraint listing_drafts_head_fk
  foreign key(id,current_transfer_id) references public.listing_draft_manifests(draft_id,transfer_id);
create index listing_draft_manifests_owner on public.listing_draft_manifests(owner_id,draft_id);
alter table public.listing_drafts enable row level security;
alter table public.listing_draft_manifests enable row level security;
revoke all on public.listing_drafts,public.listing_draft_manifests from public,anon,authenticated;
grant select on public.listing_drafts,public.listing_draft_manifests to authenticated;
create policy listing_drafts_owner_read on public.listing_drafts for select to authenticated
  using(owner_id=(select auth.uid()) and private.is_permanent_user() and private.is_active_user((select auth.uid())));
create policy listing_draft_manifests_owner_read on public.listing_draft_manifests for select to authenticated
  using(owner_id=(select auth.uid()) and private.is_permanent_user() and private.is_active_user((select auth.uid())));

create function private.draft_account() returns uuid language plpgsql stable security definer set search_path='' as $$
declare u uuid := auth.uid();
begin
  if u is null or not private.is_permanent_user() or not private.is_active_user(u) then
    raise exception 'Active permanent account required' using errcode='42501';
  end if;
  return u;
end $$;

create function private.validate_draft_snapshot(p_owner uuid,p_payload jsonb,p_property uuid,p_edit uuid)
returns void language plpgsql security definer set search_path='' as $$
declare n integer; distinct_n integer; actual_property uuid;
begin
  if jsonb_typeof(p_payload) is distinct from 'object' or p_payload->>'version' is distinct from '1'
    or jsonb_typeof(p_payload->'shared') is distinct from 'object'
    or jsonb_typeof(p_payload->'units') is distinct from 'array'
    or octet_length(p_payload::text)>262144 then raise exception 'Invalid draft snapshot'; end if;
  -- Proposed 256 KiB metadata cap, not a retention policy; needs product approval.
  select count(*),count(distinct x->>'_requestId') into n,distinct_n from jsonb_array_elements(p_payload->'units') x;
  if n<1 or n<>distinct_n or exists(select 1 from jsonb_array_elements(p_payload->'units') x
    where coalesce(x->>'_requestId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
    then raise exception 'Invalid unit request identities'; end if;
  if p_property is not null and not exists(select 1 from public.properties where id=p_property and owner_id=p_owner)
    then raise exception 'Property unavailable' using errcode='42501'; end if;
  if p_edit is not null then
    if n<>1 then raise exception 'An edit draft must contain exactly one unit'; end if;
    select p.id into actual_property from public.vacancies v join public.rooms r on r.id=v.room_id
      join public.properties p on p.id=r.property_id where v.id=p_edit and p.owner_id=p_owner;
    if actual_property is null or (p_property is not null and p_property<>actual_property)
      then raise exception 'Edited listing unavailable' using errcode='42501'; end if;
    if p_payload->>'editVacancy' is distinct from p_edit::text or p_payload->>'scope' is distinct from 'edit-'||p_edit::text
      then raise exception 'Edit reference mismatch'; end if;
  elsif coalesce(p_payload->>'editVacancy','')<>'' or p_payload->>'scope' is distinct from
    (case when p_property is null then 'new-property' else 'property-'||p_property::text end)
    then raise exception 'Property reference mismatch'; end if;
end $$;

create function private.validate_draft_assets(p_owner uuid,p_draft uuid,p_payload jsonb,p_assets jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare a jsonb; extension text;
begin
  if jsonb_typeof(p_assets) is distinct from 'array' then raise exception 'Invalid photo manifest'; end if;
  if exists(select 1 from jsonb_array_elements(p_assets) x group by x->>'path' having count(*)>1)
    or exists(select 1 from jsonb_array_elements(p_assets) x group by x->>'assetId' having count(*)>1)
    or exists(select 1 from jsonb_array_elements(p_assets) x group by x->>'unitRequestId' having count(*)>8)
    or exists(select 1 from jsonb_array_elements(p_assets) x group by x->>'unitRequestId',x->>'order' having count(*)>1)
    then raise exception 'Duplicate photos/order or too many photos per unit'; end if;
  for a in select * from jsonb_array_elements(p_assets) loop
    if not exists(select 1 from jsonb_array_elements(p_payload->'units') u where u->>'_requestId'=a->>'unitRequestId')
      then raise exception 'Photo unit is not in draft'; end if;
    extension:=case a->>'mime' when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' end;
    if extension is null or coalesce(a->>'assetId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or coalesce(a->>'sha256','') !~ '^[0-9a-f]{64}$' or coalesce(a->>'bytes','') !~ '^[0-9]+$'
      or length(a->>'bytes')>8 or (a->>'bytes')::bigint not between 1 and 10485760 or coalesce(a->>'order','') !~ '^[0-7]$'
      or a->>'path' is distinct from p_owner::text||'/'||p_draft::text||'/'||(a->>'unitRequestId')||'/'||(a->>'assetId')||'.'||extension
      then raise exception 'Invalid photo path or metadata'; end if;
  end loop;
end $$;

create function private.begin_listing_draft_impl(p_source uuid) returns public.listing_drafts
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.draft_account(); result public.listing_drafts;
begin
  if p_source is null then raise exception 'Source draft ID required'; end if;
  insert into public.listing_drafts(owner_id,source_draft_id) values(u,p_source) on conflict(owner_id,source_draft_id) do nothing;
  select * into result from public.listing_drafts where owner_id=u and source_draft_id=p_source;
  return result;
end $$;

create function private.stage_listing_draft_impl(p_draft uuid,p_transfer uuid,p_expected bigint,p_payload jsonb,p_assets jsonb,p_property uuid,p_edit uuid)
returns public.listing_draft_manifests language plpgsql security definer set search_path='' as $$
declare u uuid:=private.draft_account(); d public.listing_drafts; result public.listing_draft_manifests;
begin
  select * into d from public.listing_drafts where id=p_draft and owner_id=u for update;
  if d.id is null then raise exception 'Draft unavailable' using errcode='42501'; end if;
  select * into result from public.listing_draft_manifests where draft_id=d.id and transfer_id=p_transfer;
  if result.transfer_id is not null then
    if result.base_revision is distinct from p_expected or result.payload is distinct from p_payload or result.assets is distinct from p_assets
      or result.property_id is distinct from p_property or result.edit_vacancy_id is distinct from p_edit
      then raise exception 'Idempotency key reused with different content' using errcode='22023'; end if;
    return result;
  end if;
  if d.state<>'editing' then raise exception 'Draft is not editable'; end if;
  if d.revision is distinct from p_expected then raise exception 'Draft revision conflict' using errcode='40001'; end if;
  if exists(select 1 from jsonb_array_elements(p_payload->'units') x where d.published_units ? (x->>'_requestId')) then raise exception 'Published unit request cannot re-enter draft'; end if;
  perform private.validate_draft_snapshot(u,p_payload,p_property,p_edit);
  perform private.validate_draft_assets(u,d.id,p_payload,p_assets);
  insert into public.listing_draft_manifests(draft_id,owner_id,transfer_id,base_revision,payload,assets,property_id,edit_vacancy_id)
    values(d.id,u,p_transfer,p_expected,p_payload,p_assets,p_property,p_edit) returning * into result;
  return result;
end $$;

create function private.commit_listing_draft_impl(p_draft uuid,p_transfer uuid,p_expected bigint)
returns public.listing_drafts language plpgsql security definer set search_path='' as $$
declare u uuid:=private.draft_account(); d public.listing_drafts; m public.listing_draft_manifests; a jsonb;
begin
  select * into d from public.listing_drafts where id=p_draft and owner_id=u for update;
  if d.id is null then raise exception 'Draft unavailable' using errcode='42501'; end if;
  select * into m from public.listing_draft_manifests where draft_id=d.id and transfer_id=p_transfer;
  if m.transfer_id is null then raise exception 'Transfer unavailable'; end if;
  if m.committed_revision is not null then
    if m.base_revision=p_expected and d.current_transfer_id=m.transfer_id and d.revision=m.committed_revision then return d; end if;
    raise exception 'Draft revision conflict' using errcode='40001';
  end if;
  if d.state<>'editing' then raise exception 'Draft is not editable'; end if;
  if d.revision is distinct from p_expected or d.revision<>m.base_revision then raise exception 'Draft revision conflict' using errcode='40001'; end if;
  perform private.validate_draft_snapshot(u,m.payload,m.property_id,m.edit_vacancy_id);
  perform private.validate_draft_assets(u,d.id,m.payload,m.assets);
  for a in select * from jsonb_array_elements(m.assets) loop
    if not exists(select 1 from storage.objects o where o.bucket_id='listing-draft-media' and o.name=a->>'path' and o.owner_id=u::text
      and o.metadata->>'mimetype'=a->>'mime' and o.metadata->>'size'=a->>'bytes')
      then raise exception 'Private photo upload is incomplete or not owned'; end if;
  end loop;
  update public.listing_draft_manifests set committed_revision=d.revision+1,committed_at=now() where draft_id=d.id and transfer_id=m.transfer_id;
  update public.listing_drafts set current_transfer_id=m.transfer_id,revision=revision+1,updated_at=now() where id=d.id returning * into d;
  return d;
end $$;

-- Canonical planned paths must be present in a staged manifest before upload.
-- Object identity is immutable: deliberately no UPDATE/DELETE policy or upsert.
create function private.owns_listing_draft_path(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
  select private.is_permanent_user() and private.is_active_user((select auth.uid())) and exists(
    select 1 from public.listing_draft_manifests m join public.listing_drafts d on d.id=m.draft_id
    cross join lateral jsonb_array_elements(m.assets) a
    where m.owner_id=(select auth.uid()) and d.state in ('editing','publishing','published','archived') and a->>'path'=p_path
  )
$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('listing-draft-media','listing-draft-media',false,10485760,array['image/jpeg','image/png','image/webp']);
create policy listing_draft_media_owner_read on storage.objects for select to authenticated
  using(bucket_id='listing-draft-media' and owner_id=(select auth.uid())::text and private.owns_listing_draft_path(name));
create policy listing_draft_media_owner_insert on storage.objects for insert to authenticated
  with check(bucket_id='listing-draft-media' and owner_id=(select auth.uid())::text and private.owns_listing_draft_path(name));

-- Authoritative content and lifecycle changes are CAS fenced. Candidate staging
-- and immutable object uploads never replace the last complete head.
create function private.set_listing_draft_state_impl(p_draft uuid,p_expected bigint,p_state text)
returns public.listing_drafts language plpgsql security definer set search_path='' as $$
declare u uuid:=private.draft_account(); d public.listing_drafts;
begin
  select * into d from public.listing_drafts where id=p_draft and owner_id=u for update;
  if d.id is null then raise exception 'Draft unavailable' using errcode='42501'; end if;
  if d.revision is distinct from p_expected then raise exception 'Draft revision conflict' using errcode='40001'; end if;
  if p_state is null or p_state not in ('editing','archived') or d.state not in ('editing','archived') then raise exception 'Unsupported draft state transition'; end if;
  update public.listing_drafts set state=p_state,revision=revision+1,updated_at=now() where id=d.id returning * into d;
  return d;
end $$;

create function private.begin_listing_draft_publish_impl(p_draft uuid,p_expected bigint,p_token uuid)
returns public.listing_drafts language plpgsql security definer set search_path='' as $$
declare u uuid:=private.draft_account(); d public.listing_drafts;
begin
  select * into d from public.listing_drafts where id=p_draft and owner_id=u for update;
  if d.id is null then raise exception 'Draft unavailable' using errcode='42501'; end if;
  if p_token is null then raise exception 'Publish token required'; end if;
  if d.state='publishing' and d.publish_token=p_token and d.revision=p_expected+1 then return d; end if;
  if d.revision is distinct from p_expected then raise exception 'Draft revision conflict' using errcode='40001'; end if;
  if d.state<>'editing' or d.current_transfer_id is null then raise exception 'Complete editable draft required'; end if;
  update public.listing_drafts set state='publishing',publish_token=p_token,last_action=null,publish_media='{}'::jsonb,revision=revision+1,updated_at=now() where id=d.id returning * into d;
  return d;
end $$;

-- A row lock acquired here survives until the whole public RPC transaction ends.
-- This helper grants no write access and returns only the current account's row.
create function private.lock_listing_draft(p_draft uuid) returns public.listing_drafts
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.draft_account(); d public.listing_drafts;
begin
  select * into d from public.listing_drafts where id=p_draft and owner_id=u for update;
  if d.id is null then raise exception 'Draft unavailable' using errcode='42501'; end if;
  return d;
end $$;

create function private.ack_listing_draft_action(p_draft uuid,p_expected bigint,p_token uuid,p_request uuid,p_action text,p_args jsonb,p_result jsonb)
returns public.listing_drafts language plpgsql security definer set search_path='' as $$
declare d public.listing_drafts; m public.listing_draft_manifests; v_id uuid; own_id uuid; target uuid;
begin
  d:=private.lock_listing_draft(p_draft);
  if d.revision is distinct from p_expected then raise exception 'Draft revision conflict' using errcode='40001'; end if;
  if d.state<>'publishing' or p_token is null or d.publish_token is distinct from p_token then raise exception 'Publish fence changed' using errcode='40001'; end if;
  select * into m from public.listing_draft_manifests where draft_id=d.id and transfer_id=d.current_transfer_id;
  if p_request is null or not exists(select 1 from jsonb_array_elements(m.payload->'units') x where x->>'_requestId'=p_request::text)
    or p_action not in ('create_listing','create_room','unit_details','property_nickname','property_features','link_media','edit_listing','publish_unit','complete_edit')
    then raise exception 'Unsupported draft action'; end if;
  if p_action in ('create_listing','create_room') then
    v_id:=(p_result#>>'{}')::uuid;
    if not exists(select 1 from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id
      where v.id=v_id and v.client_request_id=p_request and p.owner_id=d.owner_id) then raise exception 'Created unit is not owned by this request' using errcode='42501'; end if;
    if d.created_units ? p_request::text and d.created_units->>p_request::text<>v_id::text then raise exception 'Created mapping is immutable'; end if;
    d.created_units:=d.created_units||jsonb_build_object(p_request::text,v_id);
  elsif p_action='link_media' then
    d.publish_media:=jsonb_set(d.publish_media,array[p_request::text],coalesce(d.publish_media->p_request::text,'[]'::jsonb)||case when coalesce(d.publish_media->p_request::text,'[]'::jsonb) ? (p_args->>'p_path') then '[]'::jsonb else jsonb_build_array(p_args->>'p_path') end);
  elsif p_action in ('publish_unit','complete_edit') then
    v_id:=(p_args->>'p_vacancy_id')::uuid;
    if not exists(select 1 from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id
      where v.id=v_id and p.owner_id=d.owner_id and
        ((p_action='complete_edit' and m.edit_vacancy_id=v.id) or
         (p_action='publish_unit' and m.edit_vacancy_id is null and v.client_request_id=p_request and v.status='active')))
      then raise exception 'Completed listing unavailable for this draft' using errcode='42501'; end if;
    if d.published_units ? p_request::text and d.published_units->>p_request::text<>v_id::text then raise exception 'Published mapping is immutable'; end if;
    d.published_units:=d.published_units||jsonb_build_object(p_request::text,v_id);
  end if;
  update public.listing_drafts set created_units=d.created_units,published_units=d.published_units,publish_media=d.publish_media,revision=revision+1,updated_at=now(),
    last_action=jsonb_build_object('expected_revision',p_expected,'publish_token',p_token,'request_id',p_request,'action',p_action,'args',p_args,'result',p_result,'revision',p_expected+1)
    where id=d.id returning * into d;
  return d;
end $$;

-- SECURITY INVOKER is intentional: all existing listing RPCs and direct media
-- writes retain their existing RLS/column grants. Only draft-head acknowledgments
-- use the checked private definer helper. No arbitrary dynamic RPC names.
create function public.listing_draft_publish_action(p_draft uuid,p_expected bigint,p_token uuid,p_request uuid,p_action text,p_args jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare d public.listing_drafts; m public.listing_draft_manifests; result jsonb; v_id uuid; v_room uuid; v_property uuid;
  fixed_property uuid; prior_vacancy uuid; prior_status text; input_data jsonb; existing_property public.properties; existing_details jsonb; function_oid regprocedure; sql_call text; arg_names text[]; arg_types oid[]; i integer; known_keys text[];
begin
  d:=private.lock_listing_draft(p_draft);
  if d.revision=p_expected+1 and d.publish_token=p_token and d.last_action @> jsonb_build_object('expected_revision',p_expected,'publish_token',p_token,'request_id',p_request,'action',p_action,'args',p_args)
    and d.last_action->'args'=p_args then return jsonb_build_object('head',to_jsonb(d),'result',d.last_action->'result'); end if;
  if d.revision is distinct from p_expected then raise exception 'Draft revision conflict' using errcode='40001'; end if;
  if d.state<>'publishing' or p_token is null or d.publish_token is distinct from p_token then raise exception 'Publish fence changed' using errcode='40001'; end if;
  if jsonb_typeof(p_args) is distinct from 'object' or octet_length(p_args::text)>262144 then raise exception 'Invalid action arguments'; end if;
  select * into m from public.listing_draft_manifests where draft_id=d.id and transfer_id=d.current_transfer_id;
  if p_request is null or not exists(select 1 from jsonb_array_elements(m.payload->'units') x where x->>'_requestId'=p_request::text) then raise exception 'Unit is not in draft'; end if;
  if d.published_units ? p_request::text then raise exception 'Unit already completed'; end if;
  fixed_property:=m.property_id;
  if fixed_property is null then
    select r.property_id into fixed_property from public.vacancies v join public.rooms r on r.id=v.room_id
      where v.id in (select value::uuid from jsonb_each_text(d.created_units)) order by v.created_at,v.id limit 1;
  end if;
  if p_args ? 'p_vacancy_id' then
    v_id:=(p_args->>'p_vacancy_id')::uuid;
    select r.id,p.id into v_room,v_property from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id
      where v.id=v_id and p.owner_id=d.owner_id and ((m.edit_vacancy_id is not null and v.id=m.edit_vacancy_id)
        or (m.edit_vacancy_id is null and v.client_request_id=p_request));
    if v_room is null then raise exception 'Listing unavailable for this draft request' using errcode='42501'; end if;
    if fixed_property is not null and fixed_property<>v_property then raise exception 'Property mismatch' using errcode='42501'; end if;
  end if;
  if p_args ? 'p_property_id' then
    if fixed_property is null or (p_args->>'p_property_id')::uuid is distinct from fixed_property then raise exception 'Property mismatch' using errcode='42501'; end if;
  end if;
  if p_action in ('create_listing','create_room') then
    select v.id,v.status into prior_vacancy,prior_status from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where v.client_request_id=p_request and p.owner_id=d.owner_id;
    if prior_vacancy is not null and prior_status<>'draft' then raise exception 'Request already belongs to a completed listing'; end if;
  end if;
  case p_action
    when 'create_listing' then
      if m.edit_vacancy_id is not null or (fixed_property is not null and not (d.created_units ? p_request::text)) then raise exception 'Use the established draft property'; end if;
      if (p_args->>'p_request_id')::uuid is distinct from p_request then raise exception 'Request mismatch'; end if;
      function_oid:='public.create_vacancy_listing_v4(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,text,numeric,text,text,numeric,boolean,date,integer,integer,integer,boolean,boolean,boolean,boolean,boolean,boolean,numeric,numeric)'::regprocedure;
    when 'create_room' then
      if m.edit_vacancy_id is not null or fixed_property is null or (p_args->>'p_request_id')::uuid is distinct from p_request or (p_args->>'p_property_id')::uuid is distinct from fixed_property then raise exception 'Request/property mismatch'; end if;
      function_oid:='public.create_unit_vacancy_for_property_v3(uuid,uuid,text,text,boolean,boolean,integer,text,boolean,boolean,numeric,text,text,numeric,boolean,date,integer)'::regprocedure;
    when 'property_nickname' then
      if fixed_property is null or (p_args->>'p_property_id')::uuid is distinct from fixed_property then raise exception 'Property mismatch'; end if;
      function_oid:='public.set_property_manager_nickname(uuid,text)'::regprocedure;
    when 'property_features' then
      if fixed_property is null or (p_args->>'p_property_id')::uuid is distinct from fixed_property then raise exception 'Property mismatch'; end if;
      function_oid:='public.set_property_custom_features(uuid,jsonb)'::regprocedure;
    when 'edit_listing' then
      if v_id is null or m.edit_vacancy_id is distinct from v_id then raise exception 'Edit target mismatch'; end if;
      function_oid:='public.update_listing_atomic(uuid,jsonb,jsonb,text,numeric,numeric)'::regprocedure;
    when 'unit_details' then
      if v_room is null or jsonb_typeof(coalesce(p_args->'p_details','{}'::jsonb))<>'object' then raise exception 'Invalid unit details'; end if;
      if length(coalesce(p_args->>'p_private_name',''))>100 then raise exception 'Private unit name too long'; end if;
      update public.rooms set unit_details=coalesce(p_args->'p_details','{}'::jsonb) where id=v_room;
      if p_args ? 'p_private_name' then
        if nullif(trim(p_args->>'p_private_name'),'') is null then delete from public.room_private_names where room_id=v_room;
        else insert into public.room_private_names(room_id,name) values(v_room,trim(p_args->>'p_private_name')) on conflict(room_id) do update set name=excluded.name; end if;
      end if;
      result:=to_jsonb(v_id);
    when 'link_media' then
      if v_room is null or p_args->>'p_mime' not in ('image/jpeg','image/png','image/webp') or coalesce(p_args->>'p_bytes','') !~ '^[0-9]{1,8}$'
        or (p_args->>'p_bytes')::bigint not between 1 and 10485760 or coalesce(p_args->>'p_order','') !~ '^[0-7]$' then raise exception 'Invalid media metadata'; end if;
      if not exists(select 1 from storage.objects o where o.bucket_id='room-media' and o.name=p_args->>'p_path' and o.owner_id=d.owner_id::text
        and o.metadata->>'mimetype'=p_args->>'p_mime' and o.metadata->>'size'=p_args->>'p_bytes') then raise exception 'Media object unavailable' using errcode='42501'; end if;
      select to_jsonb(x) into result from public.media x where x.room_id=v_room and x.storage_path=p_args->>'p_path' and x.status='active';
      if result is not null then
        update public.media set sort_order=(p_args->>'p_order')::integer where id=(result->>'id')::uuid returning to_jsonb(media) into result;
      else
        if m.edit_vacancy_id is not null and (select count(*) from public.media where room_id=v_room and status='active')>=8 then raise exception 'Maximum 8 uploaded images'; end if;
        if m.edit_vacancy_id is null and jsonb_array_length(coalesce(d.publish_media->p_request::text,'[]'::jsonb))>=8 and not (coalesce(d.publish_media->p_request::text,'[]'::jsonb) ? (p_args->>'p_path')) then raise exception 'Maximum 8 current photos'; end if;
        insert into public.media(owner_id,room_id,storage_path,mime_type,sort_order,status)
          values(d.owner_id,v_room,p_args->>'p_path',p_args->>'p_mime',(p_args->>'p_order')::integer,'active') returning to_jsonb(media) into result;
      end if;
    when 'publish_unit' then
      if v_id is null or m.edit_vacancy_id is not null then raise exception 'Publish target mismatch'; end if;
      if jsonb_array_length(coalesce(d.publish_media->p_request::text,'[]'::jsonb)) not between 3 and 8 then raise exception 'Add at least 3 current uploaded photos before publishing'; end if;
      -- The explicit current photo set replaces only this unpublished unit's old
      -- active links. Objects/history remain intact; no hard deletion occurs.
      update public.media set status='removed' where room_id=v_room and status='active' and not (d.publish_media->p_request::text ? storage_path);
      perform public.reconfirm_vacancy(v_id); result:=to_jsonb(v_id);
    when 'complete_edit' then
      if v_id is null or m.edit_vacancy_id is distinct from v_id then raise exception 'Edit target mismatch'; end if;
      result:=to_jsonb(v_id);
    else raise exception 'Unsupported draft action';
  end case;
  if function_oid is not null then
    -- Function identifier and all cast types come from fixed allowlisted catalog
    -- signatures. User JSON never supplies SQL identifiers or cast types.
    select proargnames,proargtypes::oid[] into arg_names,arg_types from pg_catalog.pg_proc where oid=function_oid;
    if exists(select 1 from jsonb_object_keys(p_args) k where not (k=any(arg_names))) then raise exception 'Unknown action argument'; end if;
    sql_call:='select to_jsonb(public.'||(select quote_ident(proname) from pg_catalog.pg_proc where oid=function_oid)||'(';
    for i in 1..array_length(arg_names,1) loop
      if i>1 then sql_call:=sql_call||','; end if;
      sql_call:=sql_call||format('%I := ($1->>%L)::%s',arg_names[i],arg_names[i],pg_catalog.format_type(arg_types[i-1],null));
    end loop;
    sql_call:=sql_call||'))';
    execute sql_call into result using p_args;
    if prior_vacancy is not null and p_action in ('create_listing','create_room') then
      -- Baseline create RPCs intentionally return a stable existing UUID. Apply
      -- edited remaining-unit fields to that still-private row before retrying.
      select r.id,r.property_id,r.unit_details into v_room,v_property,existing_details from public.vacancies v join public.rooms r on r.id=v.room_id where v.id=prior_vacancy;
      if p_action='create_listing' then input_data:=p_args;
      else
        select * into existing_property from public.properties where id=v_property;
        input_data:=jsonb_build_object(
          'p_locality',existing_property.suburb,'p_city',existing_property.city,'p_region',existing_property.state,'p_postal',existing_property.postcode,
          'p_landmark',existing_property.landmark,'p_country',existing_property.country,'p_market_code',existing_property.market_code,
          'p_address_line',(select address_line from public.property_private_locations where property_id=v_property),
          'p_property_type',existing_property.property_type,'p_household_summary',existing_property.household_summary,
          'p_parking_spaces',existing_property.parking_spaces,'p_pets_considered',existing_property.pets_considered,'p_smoking_allowed',existing_property.smoking_allowed,
          'p_water_available',existing_property.water_available,'p_electricity_available',existing_property.electricity_available,'p_security_available',existing_property.security_available,'p_internet_available',existing_property.internet_available)
          || p_args || jsonb_build_object('p_smoking_override',p_args->'p_smoking_allowed_override','p_pets_override',p_args->'p_pets_considered_override');
      end if;
      perform public.update_listing_atomic(prior_vacancy,input_data,existing_details,null,
        case when p_action='create_listing' then (p_args->>'p_public_latitude')::numeric end,
        case when p_action='create_listing' then (p_args->>'p_public_longitude')::numeric end);
      update public.rooms set furnished_known=(p_args->>'p_furnished' is not null),ensuite_known=(p_args->>'p_ensuite' is not null) where id=v_room;
    end if;
  end if;
  d:=private.ack_listing_draft_action(p_draft,p_expected,p_token,p_request,p_action,p_args,result);
  return jsonb_build_object('head',to_jsonb(d),'result',result);
end $$;

create function private.finish_listing_draft_publish_impl(p_draft uuid,p_expected bigint,p_token uuid,p_transfer uuid)
returns public.listing_drafts language plpgsql security definer set search_path='' as $$
declare d public.listing_drafts; m public.listing_draft_manifests; next_payload jsonb; next_assets jsonb; next_property uuid;
begin
  d:=private.lock_listing_draft(p_draft);
  if d.revision=p_expected+1 and d.finish_token=p_token and d.finish_transfer_id=p_transfer then return d; end if;
  if d.revision is distinct from p_expected then raise exception 'Draft revision conflict' using errcode='40001'; end if;
  if d.state<>'publishing' or p_token is null or d.publish_token is distinct from p_token then raise exception 'Publish fence changed' using errcode='40001'; end if;
  if p_transfer is null then raise exception 'Finish transfer ID required'; end if;
  select * into m from public.listing_draft_manifests where draft_id=d.id and transfer_id=d.current_transfer_id;
  select jsonb_set(m.payload,'{units}',coalesce(jsonb_agg(x order by ord),'[]'::jsonb)) into next_payload from jsonb_array_elements(m.payload->'units') with ordinality a(x,ord) where not (d.published_units ? (x->>'_requestId'));
  select coalesce(jsonb_agg(x order by ord),'[]'::jsonb) into next_assets from jsonb_array_elements(m.assets) with ordinality a(x,ord) where not (d.published_units ? (x->>'unitRequestId'));
  next_property:=m.property_id;
  if next_property is null then
    select r.property_id into next_property from public.vacancies v join public.rooms r on r.id=v.room_id
      where v.id in (select value::uuid from jsonb_each_text(d.created_units)) order by v.created_at,v.id limit 1;
  end if;
  if m.edit_vacancy_id is null and next_property is not null then next_payload:=jsonb_set(next_payload,'{scope}',to_jsonb('property-'||next_property::text)); end if;
  if jsonb_array_length(next_payload->'units')>0 then
    perform private.validate_draft_snapshot(d.owner_id,next_payload,next_property,m.edit_vacancy_id);
    perform private.validate_draft_assets(d.owner_id,d.id,next_payload,next_assets);
  end if;
  insert into public.listing_draft_manifests(draft_id,owner_id,transfer_id,base_revision,payload,assets,property_id,edit_vacancy_id,committed_revision,committed_at,finish_token)
    values(d.id,d.owner_id,p_transfer,p_expected,next_payload,next_assets,next_property,m.edit_vacancy_id,p_expected+1,now(),p_token);
  update public.listing_drafts set state=case when jsonb_array_length(next_payload->'units')=0 then 'published' else 'editing' end,
    publish_token=null,publish_media='{}'::jsonb,current_transfer_id=p_transfer,revision=revision+1,updated_at=now(),finish_token=p_token,finish_transfer_id=p_transfer,last_action=null
    where id=d.id returning * into d;
  return d;
end $$;

create function public.begin_listing_draft(p_source uuid) returns public.listing_drafts language sql security invoker set search_path='' as $$ select private.begin_listing_draft_impl(p_source) $$;
create function public.stage_listing_draft(p_draft uuid,p_transfer uuid,p_expected bigint,p_payload jsonb,p_assets jsonb,p_property uuid default null,p_edit uuid default null) returns public.listing_draft_manifests language sql security invoker set search_path='' as $$ select private.stage_listing_draft_impl(p_draft,p_transfer,p_expected,p_payload,p_assets,p_property,p_edit) $$;
create function public.commit_listing_draft(p_draft uuid,p_transfer uuid,p_expected bigint) returns public.listing_drafts language sql security invoker set search_path='' as $$ select private.commit_listing_draft_impl(p_draft,p_transfer,p_expected) $$;
create function public.set_listing_draft_state(p_draft uuid,p_expected bigint,p_state text) returns public.listing_drafts language sql security invoker set search_path='' as $$ select private.set_listing_draft_state_impl(p_draft,p_expected,p_state) $$;
create function public.begin_listing_draft_publish(p_draft uuid,p_expected bigint,p_token uuid) returns public.listing_drafts language sql security invoker set search_path='' as $$ select private.begin_listing_draft_publish_impl(p_draft,p_expected,p_token) $$;
create function public.finish_listing_draft_publish(p_draft uuid,p_expected bigint,p_token uuid,p_transfer uuid) returns public.listing_drafts language sql security invoker set search_path='' as $$ select private.finish_listing_draft_publish_impl(p_draft,p_expected,p_token,p_transfer) $$;

-- Explicit narrow grants only; never change any pre-existing grants or policies.
do $$ declare sig text; begin
 foreach sig in array array[
 'private.draft_account()','private.validate_draft_snapshot(uuid,jsonb,uuid,uuid)','private.validate_draft_assets(uuid,uuid,jsonb,jsonb)',
 'private.begin_listing_draft_impl(uuid)','private.stage_listing_draft_impl(uuid,uuid,bigint,jsonb,jsonb,uuid,uuid)','private.commit_listing_draft_impl(uuid,uuid,bigint)',
 'private.owns_listing_draft_path(text)','private.set_listing_draft_state_impl(uuid,bigint,text)','private.begin_listing_draft_publish_impl(uuid,bigint,uuid)',
 'private.lock_listing_draft(uuid)','private.ack_listing_draft_action(uuid,bigint,uuid,uuid,text,jsonb,jsonb)','private.finish_listing_draft_publish_impl(uuid,bigint,uuid,uuid)',
 'public.begin_listing_draft(uuid)','public.stage_listing_draft(uuid,uuid,bigint,jsonb,jsonb,uuid,uuid)','public.commit_listing_draft(uuid,uuid,bigint)',
 'public.set_listing_draft_state(uuid,bigint,text)','public.begin_listing_draft_publish(uuid,bigint,uuid)','public.finish_listing_draft_publish(uuid,bigint,uuid,uuid)',
 'public.listing_draft_publish_action(uuid,bigint,uuid,uuid,text,jsonb)'
 ] loop execute 'revoke all on function '||sig||' from public,anon,authenticated'; end loop;
 foreach sig in array array[
 'private.begin_listing_draft_impl(uuid)','private.stage_listing_draft_impl(uuid,uuid,bigint,jsonb,jsonb,uuid,uuid)','private.commit_listing_draft_impl(uuid,uuid,bigint)',
 'private.owns_listing_draft_path(text)','private.set_listing_draft_state_impl(uuid,bigint,text)','private.begin_listing_draft_publish_impl(uuid,bigint,uuid)',
 'private.lock_listing_draft(uuid)','private.ack_listing_draft_action(uuid,bigint,uuid,uuid,text,jsonb,jsonb)','private.finish_listing_draft_publish_impl(uuid,bigint,uuid,uuid)',
 'public.begin_listing_draft(uuid)','public.stage_listing_draft(uuid,uuid,bigint,jsonb,jsonb,uuid,uuid)','public.commit_listing_draft(uuid,uuid,bigint)',
 'public.set_listing_draft_state(uuid,bigint,text)','public.begin_listing_draft_publish(uuid,bigint,uuid)','public.finish_listing_draft_publish(uuid,bigint,uuid,uuid)',
 'public.listing_draft_publish_action(uuid,bigint,uuid,uuid,text,jsonb)'
 ] loop execute 'grant execute on function '||sig||' to authenticated'; end loop;
end $$;
