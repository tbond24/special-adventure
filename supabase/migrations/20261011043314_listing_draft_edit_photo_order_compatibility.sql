create or replace function public.listing_draft_publish_action(p_draft uuid,p_expected bigint,p_token uuid,p_request uuid,p_action text,p_args jsonb)
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
        or (p_args->>'p_bytes')::bigint not between 1 and 10485760
        -- Existing listings retain append-only sort positions after deletions.
        -- New-listing photo slots remain 0..7; edit slots use the column's
        -- nonnegative integer range without changing the eight-photo count cap.
        or (case when m.edit_vacancy_id is null then coalesce(p_args->>'p_order','') !~ '^[0-7]$'
          when coalesce(p_args->>'p_order','') !~ '^(0|[1-9][0-9]{0,9})$' then true
          else (p_args->>'p_order')::bigint > 2147483647 end)
        then raise exception 'Invalid media metadata'; end if;
      if not exists(select 1 from storage.objects o where o.bucket_id='room-media' and o.name=p_args->>'p_path' and o.owner_id=d.owner_id::text
        and o.metadata->>'mimetype'=p_args->>'p_mime' and o.metadata->>'size'=p_args->>'p_bytes') then raise exception 'Media object unavailable' using errcode='42501'; end if;
      -- Different edit drafts can target one room; serialize their count and
      -- link step without changing legacy direct-media policies or APIs.
      if m.edit_vacancy_id is not null then
        perform 1 from public.rooms where id=v_room for no key update;
        if not found then raise exception 'Listing unavailable for this draft request' using errcode='42501'; end if;
      end if;
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
