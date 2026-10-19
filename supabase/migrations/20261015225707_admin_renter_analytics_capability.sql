-- Development only. Preserve prior migrations and report contract; enforce fixed roles.
create or replace function public.admin_renter_journeys(p_from timestamptz,p_to timestamptz,p_offset integer default 0) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='8s' as $$
declare result jsonb;
begin
 if not private.admin_can('analytics_read') then raise exception 'Assigned analytics reader capability required' using errcode='42501'; end if;
 if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>interval '30 days' or p_offset is null or p_offset not between 0 and 100000 then raise exception 'Choose up to 30 days and a bounded page' using errcode='22023'; end if;
 if not exists(select 1 from private.renter_analytics_settings where id and collection_enabled) or p_to<=now()-interval '30 days' then
  return jsonb_build_object('schemaVersion',1,'generatedAt',clock_timestamp(),'complete',false,'retentionDays',30,'reason','Renter collection is disabled or this range exceeds the 30-day evidence window. Counts are unavailable, not zero.'); end if;
 with eligible as materialized (
  select e.* from private.renter_analytics_events e where e.created_at>=now()-interval '30 days' and e.expires_at>now() and not private.analytics_excluded_user(e.user_id)
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
 select jsonb_build_object('schemaVersion',1,'complete',true,'generatedAt',clock_timestamp(),'retentionDays',30,'windowFrom',greatest(p_from,now()-interval '30 days'),'windowTo',least(p_to,now()),
  'searches',(select count(*) from summaries),'withOpen',(select count(*) from summaries where opens>0),
  'withEnquiry',(select count(*) from summaries where enquiries>0),'withReply',(select count(*) from summaries where replies>0),
  'conversations',(select count(distinct conversation_id) from outcomes),'repliedConversations',(select count(distinct conversation_id) from outcomes where replied),
  'directOpens',(select count(*) from eligible where event_name='vacancy_opened' and parent_id is null and created_at>=p_from and created_at<least(p_to,now())),
  'detailTotal',(select count(*) from summaries),'rate',null,
  'coverage','Best-effort, prospective opt-in events. Missing links are unknown; sessions/browser IDs are not people. First replies come from owner messages within seven days. No rental completion is inferred.',
  'details',coalesce((select jsonb_agg(to_jsonb(d)) from (select row_number() over(order by created_at desc,event_id) label,created_at,opens,enquiries,replies from summaries order by created_at desc,event_id limit 50 offset p_offset) d),'[]'::jsonb)) into result;
 return result;
end $$;
-- CREATE OR REPLACE preserves the existing authenticated-only EXECUTE ACL.
