-- Development only. Disabled by default. No purge, backfill or business trigger.
create table private.renter_analytics_settings (
 id boolean primary key default true check(id),collection_enabled boolean not null default false,
 retention_days integer not null default 30 check(retention_days=30),
 notice_version text not null default '20261016-renter-v1' check(notice_version='20261016-renter-v1')
);
insert into private.renter_analytics_settings(id) values(true);
create table private.renter_analytics_events (
 event_id uuid primary key,event_name text not null check(event_name in ('search_used','vacancy_opened','enquiry_linked')),
 visitor_id uuid not null,session_id uuid not null,user_id uuid references auth.users(id) on delete set null,
 parent_id uuid references private.renter_analytics_events(event_id),vacancy_id uuid references public.vacancies(id) on delete set null,
 conversation_id uuid references public.conversations(id) on delete set null,owner_id uuid references auth.users(id) on delete set null,
 occurred_at timestamptz not null,created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '30 days',notice_version text not null
);
create index renter_analytics_events_time on private.renter_analytics_events(created_at);
create index renter_analytics_events_parent on private.renter_analytics_events(parent_id);
create index renter_analytics_events_expiry on private.renter_analytics_events(expires_at);
create unique index renter_analytics_first_enquiry on private.renter_analytics_events(conversation_id) where event_name='enquiry_linked';
alter table private.renter_analytics_settings enable row level security;
alter table private.renter_analytics_events enable row level security;
revoke all on private.renter_analytics_settings,private.renter_analytics_events from public,anon,authenticated;
create function public.renter_analytics_policy() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('enabled',collection_enabled,'retentionDays',retention_days,'noticeVersion',notice_version,
 'status',case when collection_enabled then 'Prospective opt-in collection' else 'Collection disabled pending notice and 30-day retention enforcement review' end)
 from private.renter_analytics_settings where id
$$;
create function public.record_renter_journey(p_events jsonb,p_notice_version text) returns integer
language plpgsql security definer set search_path='' as $$
declare item jsonb; parent private.renter_analytics_events; name text; event uuid; visitor uuid; session uuid; listing uuid; conversation uuid;
 stamp timestamptz; first_sender uuid; listing_owner uuid; accepted integer:=0; n integer;
begin
 if not exists(select 1 from private.renter_analytics_settings where id and collection_enabled and notice_version=p_notice_version)
 or not private.analytics_allowed() then return 0; end if;
 if p_events is null or jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)>20 or octet_length(p_events::text)>32768 then raise exception 'Bounded renter event batch required' using errcode='22023'; end if;
 if jsonb_array_length(p_events)=0 then return 0; end if;
 perform private.analytics_budget(jsonb_array_length(p_events));
 for item in select e.value from jsonb_array_elements(p_events) e loop
  if jsonb_typeof(item)<>'object' or exists(select 1 from jsonb_object_keys(item) x where x not in ('event_id','event_name','visitor_id','session_id','parent_id','vacancy_id','conversation_id','occurred_at')) then raise exception 'Unregistered renter fields' using errcode='22023'; end if;
  name:=item->>'event_name';event:=(item->>'event_id')::uuid;visitor:=(item->>'visitor_id')::uuid;session:=(item->>'session_id')::uuid;
  listing:=nullif(item->>'vacancy_id','')::uuid;conversation:=nullif(item->>'conversation_id','')::uuid;
  if event is null or visitor is null or session is null or name is null or name not in ('search_used','vacancy_opened','enquiry_linked') then raise exception 'Invalid renter event' using errcode='22023'; end if;
  stamp:=greatest(now()-interval '15 minutes',least(now(),coalesce((item->>'occurred_at')::timestamptz,now())));
  parent:=null;listing_owner:=null;
  if nullif(item->>'parent_id','') is not null then
   select * into parent from private.renter_analytics_events e where e.event_id=(item->>'parent_id')::uuid
    and e.visitor_id=visitor and e.session_id=session and (e.user_id is null or e.user_id=auth.uid()) and e.expires_at>now() and e.occurred_at<=stamp and stamp-e.occurred_at<=interval '30 minutes';
   if not found then raise exception 'Renter parent not linked' using errcode='22023'; end if;
  end if;
  if name='search_used' and (parent.event_id is not null or listing is not null or conversation is not null) then raise exception 'Search accepts no listing or conversation' using errcode='22023'; end if;
  if name in ('vacancy_opened','enquiry_linked') and (listing is null or not exists(select 1 from public.vacancies where id=listing and status='active')) then raise exception 'Active public listing required' using errcode='22023'; end if;
  if name='vacancy_opened' and (conversation is not null or (parent.event_id is not null and parent.event_name<>'search_used')) then raise exception 'Invalid open linkage' using errcode='22023'; end if;
  if name='enquiry_linked' then
   select p.owner_id into listing_owner from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where v.id=listing;
   if auth.uid() is null or conversation is null or parent.event_name is distinct from 'vacancy_opened' or parent.vacancy_id is distinct from listing then raise exception 'Authenticated enquiry linkage required' using errcode='42501'; end if;
   select m.sender_id into first_sender from public.conversations c join public.messages m on m.conversation_id=c.id
    where c.id=conversation and c.vacancy_id=listing and c.created_at>=parent.occurred_at
     and exists(select 1 from public.conversation_members cm where cm.conversation_id=c.id and cm.user_id=auth.uid())
    order by m.created_at,m.id limit 1;
   if first_sender is distinct from auth.uid() or listing_owner=auth.uid() then raise exception 'Authoritative first enquiry required' using errcode='42501'; end if;
  end if;
  insert into private.renter_analytics_events(event_id,event_name,visitor_id,session_id,user_id,parent_id,vacancy_id,conversation_id,owner_id,occurred_at,notice_version)
   values(event,name,visitor,session,auth.uid(),parent.event_id,listing,conversation,listing_owner,stamp,p_notice_version) on conflict do nothing;
  get diagnostics n=row_count;accepted:=accepted+n;
 end loop;
 return accepted;
end $$;
create function public.admin_renter_journeys(p_from timestamptz,p_to timestamptz,p_offset integer default 0) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='8s' as $$
declare result jsonb;
begin
 if not private.is_admin(auth.uid()) then raise exception 'MFA-verified administrator required' using errcode='42501'; end if;
 if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>interval '30 days' or p_offset is null or p_offset not between 0 and 100000 then raise exception 'Choose up to 30 days and a bounded page' using errcode='22023'; end if;
 if not exists(select 1 from private.renter_analytics_settings where id and collection_enabled) or p_from<now()-interval '30 days' then
  return jsonb_build_object('schemaVersion',1,'generatedAt',clock_timestamp(),'complete',false,'retentionDays',30,'reason','Renter collection is disabled or this range exceeds the 30-day evidence window. Counts are unavailable, not zero.'); end if;
 with eligible as materialized (
  select e.* from private.renter_analytics_events e where e.expires_at>now() and not private.analytics_excluded_user(e.user_id)
 ), starts as materialized (
  select * from eligible where event_name='search_used' and created_at>=p_from and created_at<least(p_to,now())
 ), opens as materialized (
  select e.*,s.event_id search_id from eligible e join starts s on s.event_id=e.parent_id where e.event_name='vacancy_opened'
 ), enquiries as materialized (
  select e.*,o.search_id from eligible e join opens o on o.event_id=e.parent_id where e.event_name='enquiry_linked'
 ), outcomes as materialized (
  select e.search_id,e.conversation_id,
   exists(select 1 from public.conversations c join public.messages m on m.conversation_id=c.id and m.sender_id=e.owner_id
    where c.id=e.conversation_id and m.created_at>=(select min(first_m.created_at) from public.messages first_m where first_m.conversation_id=c.id and first_m.sender_id=e.user_id)
     and m.created_at<=e.occurred_at+interval '7 days' and m.created_at<e.expires_at) replied
  from enquiries e
 ), summaries as materialized (
  select s.event_id,s.created_at,(select count(*) from opens o where o.search_id=s.event_id) opens,
   (select count(distinct o.conversation_id) from outcomes o where o.search_id=s.event_id) enquiries,
   (select count(distinct o.conversation_id) from outcomes o where o.search_id=s.event_id and o.replied) replies
  from starts s
 )
 select jsonb_build_object('schemaVersion',1,'complete',true,'generatedAt',clock_timestamp(),'retentionDays',30,
  'searches',(select count(*) from summaries),'withOpen',(select count(*) from summaries where opens>0),
  'withEnquiry',(select count(*) from summaries where enquiries>0),'withReply',(select count(*) from summaries where replies>0),
  'conversations',(select count(distinct conversation_id) from outcomes),'repliedConversations',(select count(distinct conversation_id) from outcomes where replied),
  'directOpens',(select count(*) from eligible where event_name='vacancy_opened' and parent_id is null and created_at>=p_from and created_at<least(p_to,now())),
  'detailTotal',(select count(*) from summaries),'rate',null,
  'coverage','Best-effort, prospective opt-in events. Missing links are unknown; sessions/browser IDs are not people. First replies come from owner messages within seven days. No rental completion is inferred.',
  'details',coalesce((select jsonb_agg(to_jsonb(d)) from (select row_number() over(order by created_at desc,event_id) label,created_at,opens,enquiries,replies from summaries order by created_at desc,event_id limit 50 offset p_offset) d),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.renter_analytics_policy(),public.record_renter_journey(jsonb,text),public.admin_renter_journeys(timestamptz,timestamptz,integer) from public,anon,authenticated;
grant execute on function public.renter_analytics_policy(),public.record_renter_journey(jsonb,text) to anon,authenticated;
grant execute on function public.admin_renter_journeys(timestamptz,timestamptz,integer) to authenticated;
