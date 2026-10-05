-- Synthetic hosted TEST project only. Entire fixture rolls back.
begin;
do $$
declare owner uuid; j uuid:=gen_random_uuid(); j2 uuid:=gen_random_uuid(); visitor uuid:=gen_random_uuid(); sess uuid:=gen_random_uuid();
 e0 uuid:=gen_random_uuid(); e1 uuid:=gen_random_uuid(); e2 uuid:=gen_random_uuid(); e3 uuid:=gen_random_uuid();
 req uuid:=gen_random_uuid(); prop uuid:=gen_random_uuid(); room uuid:=gen_random_uuid(); listing uuid:=gen_random_uuid();
 started timestamptz:=now()-interval '10 days'; r jsonb; n integer;
begin
 select user_id into owner from public.admin_users limit 1;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'aal','aal2')::text,true);
 insert into public.properties values(prop,owner);insert into public.rooms values(room,prop);
 insert into public.vacancies(id,room_id,client_request_id) values(listing,room,req);
 insert into public.listing_activity_log(entity_type,entity_id,old_status,new_status,created_at) values
 ('listing',listing,null,'active',started+interval '1 hour'),('listing',listing,'active','active',started+interval '2 hours'),('listing',listing,'paused','active',now());
 insert into public.analytics_events(event_id,event_name,user_id,created_at,visitor_id,session_id,journey_id,source,journey_version,journey_mode,previous_event_id,from_step,to_step,unit_request_id) values
 (e0,'listing_started',owner,started,visitor,sess,j,'Synthetic source',2,'new',null,null,0,null),
 (e1,'step_ready',owner,started+interval '1 minute',visitor,sess,j,'Synthetic source',2,'new',e0,0,1,null),
 (e2,'step_ready',owner,started+interval '2 minutes',visitor,sess,j,'Synthetic source',2,'new',e1,1,2,null),
 (e3,'publish_clicked',owner,started+interval '3 minutes',visitor,sess,j,'Synthetic source',2,'new',e2,2,3,req),
 (gen_random_uuid(),'publish_clicked',owner,started+interval '4 minutes',visitor,sess,j,'Synthetic source',2,'new',e3,3,3,req),
 (gen_random_uuid(),'listing_started',owner,started,visitor,sess,j2,'Synthetic source',2,'new',null,null,2,null);
 r:=public.admin_connected_journeys(started,started+interval '1 day','Synthetic source');
 if (r->>'total')::int<>2 or (r->>'confirmed')::int<>1 or (r->>'listings')::int<>1 or (r->>'unknown')::int<>1 then raise exception 'FAIL counting and linkage: %',r; end if;
 if jsonb_array_length(r->'edges')<>3 or (r->'stages'->2->>'count')::int<>2 then raise exception 'FAIL explicit edges/direct entry';end if;
 if r->>'rate' is not null then raise exception 'FAIL unsupported conversion';end if;
 raise notice 'PASS owned publication, retry deduplication, null old status, republication, direct entry and coverage';
 r:=public.admin_connected_journeys(started-interval '1 hour',started,'Synthetic source');
 if (r->>'total')::int<>0 then raise exception 'FAIL end-exclusive boundary';end if;
 r:=public.admin_connected_journeys(started,started+interval '1 day','different-source');
 if (r->>'total')::int<>0 then raise exception 'FAIL server source filter';end if;
 raise notice 'PASS UTC start-inclusive/end-exclusive and server filter';
 -- A second distinct listing in the same property must count independently.
 insert into public.vacancies(id,room_id,client_request_id) values(gen_random_uuid(),room,gen_random_uuid()) returning id,client_request_id into listing,req;
 insert into public.listing_activity_log(entity_type,entity_id,old_status,new_status,created_at) values('listing',listing,'draft','active',started+interval '1 hour');
 insert into public.analytics_events(event_id,event_name,user_id,created_at,visitor_id,session_id,journey_id,source,journey_version,journey_mode,unit_request_id) values(gen_random_uuid(),'publish_clicked',owner,started+interval '5 minutes',visitor,sess,j,'Synthetic source',2,'new',req);
 r:=public.admin_connected_journeys(started,started+interval '1 day','Synthetic source');
 if (r->>'confirmed')::int<>1 or (r->>'listings')::int<>2 then raise exception 'FAIL property/listing distinction';end if;
 raise notice 'PASS two listings in one property, one journey';
 -- Conflicting journey associations cannot steal publication credit.
 insert into public.analytics_events(event_id,event_name,user_id,created_at,visitor_id,session_id,journey_id,source,journey_version,journey_mode,unit_request_id) values(gen_random_uuid(),'publish_clicked',owner,started+interval '6 minutes',visitor,sess,j2,'Synthetic source',2,'new',req);
 r:=public.admin_connected_journeys(started,started+interval '1 day','Synthetic source');
 if (r->>'listings')::int<>1 then raise exception 'FAIL ambiguous request association';end if;
 raise notice 'PASS ambiguous association excluded';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'aal','aal1')::text,true);
 begin perform public.admin_connected_journeys(started,now());raise exception 'FAIL AAL1 allowed';exception when insufficient_privilege then raise notice 'PASS AAL1 denied';end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'aal','aal2')::text,true);
 begin perform public.admin_connected_journeys(started,now());raise exception 'FAIL nonadmin allowed';exception when insufficient_privilege then raise notice 'PASS nonadmin denied';end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'aal','aal2')::text,true);
 r:=public.admin_connected_journeys(now()-interval '91 days',now()-interval '2 days');
 if (r->>'complete')::boolean is not false or r?'total' then raise exception 'FAIL expired evidence';end if;
 raise notice 'PASS expired window suppresses counts';
end $$;
rollback;
