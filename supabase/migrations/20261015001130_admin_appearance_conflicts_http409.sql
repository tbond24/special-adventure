-- Application conflicts are HTTP 409, not retryable PostgreSQL serialization failures.
-- PostgREST 14 retries SQLSTATE 40001; keep all permission, locking and audit behavior.
-- Development branch; applied only to the isolated test project without release approval.

create or replace function public.admin_appearance_save_draft(
 p_element_key text,p_config jsonb,
 p_expected_draft_version bigint,p_expected_published_revision bigint)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid()); v_revision bigint; v_draft_version bigint; v_new bigint;
begin
 if not private.admin_can('appearance_draft') then
   raise exception 'Verified editor required' using errcode='42501';
 end if;
 perform private.validate_appearance_config(p_element_key,p_config);
 if p_expected_draft_version is null or p_expected_published_revision is null then
   raise exception 'Expected versions are required' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(2026101402::bigint);
 select revision into v_revision from public.admin_appearance_current
 where element_key=p_element_key;
 if coalesce(v_revision,0) <> p_expected_published_revision then
   raise exception 'Published appearance changed; reload before editing' using errcode='PT409';
 end if;
 select version into v_draft_version from public.admin_appearance_drafts
 where actor_id=v_actor and element_key=p_element_key for update;
 if coalesce(v_draft_version,0) <> p_expected_draft_version then
   raise exception 'Draft changed in another tab; reload before saving' using errcode='PT409';
 end if;
 v_new := coalesce(v_draft_version,0)+1;
 insert into public.admin_appearance_drafts(actor_id,element_key,version,base_revision,config)
 values(v_actor,p_element_key,v_new,p_expected_published_revision,p_config)
 on conflict(actor_id,element_key) do update set
 version=excluded.version,base_revision=excluded.base_revision,
 config=excluded.config,updated_at=now();
 return jsonb_build_object('version',v_new,'baseRevision',p_expected_published_revision,
                           'config',p_config);
end
$$;

create or replace function public.admin_appearance_publish(
 p_element_key text,p_expected_published_revision bigint,
 p_expected_draft_version bigint,p_reason text,p_request_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid()); v_current record; v_draft record;
        v_previous jsonb; v_prior record; v_new_revision bigint;
begin
 if not private.admin_can('appearance_publish') then
   raise exception 'Owner MFA verification required' using errcode='42501';
 end if;
 perform private.validate_appearance_config(p_element_key,'{}'::jsonb);
 if p_request_id is null or p_expected_published_revision is null
    or p_expected_draft_version is null
    or length(trim(coalesce(p_reason,''))) not between 3 and 500 then
   raise exception 'Versions, request ID and reason are required' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(2026101402::bigint);
 select element_key,revision,reason,source_draft_version into v_prior from public.admin_appearance_revisions
 where actor_id=v_actor and request_id=p_request_id;
 if found then
   if v_prior.element_key<>p_element_key
      or v_prior.reason<>trim(p_reason)
      or v_prior.source_draft_version<>p_expected_draft_version
      or v_prior.revision-1<>p_expected_published_revision then
     raise exception 'Request ID reused for a different publication' using errcode='23505';
   end if;
   return jsonb_build_object('revision',v_prior.revision,'alreadyApplied',true);
 end if;
 insert into public.admin_appearance_current(element_key,revision,config)
 values(p_element_key,0,'{}'::jsonb) on conflict do nothing;
 select revision,config into v_current from public.admin_appearance_current
 where element_key=p_element_key for update;
 if v_current.revision <> p_expected_published_revision then
   raise exception 'Published revision changed; review the latest version' using errcode='PT409';
 end if;
 select version,base_revision,config into v_draft from public.admin_appearance_drafts
 where actor_id=v_actor and element_key=p_element_key for update;
 if v_draft.version is null or v_draft.version<>p_expected_draft_version
    or v_draft.base_revision<>v_current.revision then
   raise exception 'Saved draft is missing or outdated' using errcode='PT409';
 end if;
 perform private.validate_appearance_config(p_element_key,v_draft.config);
 if v_draft.config=v_current.config then
   raise exception 'Draft does not change the published element' using errcode='22023';
 end if;
 v_previous := v_current.config;
 v_new_revision := v_current.revision + 1;
 update public.admin_appearance_current set revision=v_new_revision,
   config=v_draft.config,updated_at=now(),updated_by=v_actor where element_key=p_element_key;
 insert into public.admin_appearance_revisions(
    element_key,revision,config,actor_id,reason,request_id,source_draft_version)
 values(p_element_key,v_new_revision,v_draft.config,v_actor,trim(p_reason),p_request_id,v_draft.version);
 insert into public.admin_change_audit(
    actor_id,action,target_kind,target_key,reason,previous_version,new_version,
    request_id,diff)
 values(v_actor,'appearance_published','page_element',p_element_key,trim(p_reason),
    v_current.revision,v_new_revision,p_request_id,
    jsonb_build_object('before',v_previous,'after',v_draft.config));
 delete from public.admin_appearance_drafts
 where actor_id=v_actor and element_key=p_element_key;
 return jsonb_build_object('revision',v_new_revision,'alreadyApplied',false);
end
$$;

