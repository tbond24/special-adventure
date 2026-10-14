\set ON_ERROR_STOP on
\echo 'Stage 2 contract test: disposable PostgreSQL with synthetic JWT claims'

create function public.assert_editor_test(ok boolean,message text)
returns void language plpgsql as $$
begin
 if ok is distinct from true then
   raise exception 'FAILED: %',message;
 end if;
end
$$;

insert into public.admin_access_roles(user_id,role,granted_by,grant_reason)
values
 ('00000000-0000-4000-8000-0000000000a1','owner',null,'Local synthetic owner'),
 ('00000000-0000-4000-8000-0000000000a2','operator',null,'Local synthetic operator'),
 ('00000000-0000-4000-8000-0000000000a4','operator',null,'Local synthetic suspended admin');

select public.assert_editor_test(
 not has_table_privilege('authenticated','public.admin_appearance_current','SELECT')
 and not has_table_privilege('authenticated','public.admin_appearance_drafts','INSERT')
 and not has_table_privilege('anon','public.admin_appearance_revisions','SELECT')
 and has_function_privilege('anon','public.site_appearance_published()','EXECUTE')
 and not has_function_privilege('anon','public.admin_appearance_state(text)','EXECUTE'),
 'direct table grants must deny access; public reader only sees published configuration'
);

-- AAL1 active Owner must not read protected editor state.
begin;
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"00000000-0000-4000-8000-0000000000a1","aal":"aal1","role":"authenticated"}',true);
do $test$
begin
  begin
    perform public.admin_appearance_state('listing-detail/save-button');
    raise exception 'UNSAFE: AAL1 owner read accepted';
  exception when insufficient_privilege then null;
  end;
end
$test$;
rollback;
\echo 'PASS: AAL1 Owner read denied'

-- An AAL2 Operator may save their OWN draft, but cannot publish.
begin;
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"00000000-0000-4000-8000-0000000000a2","aal":"aal2","role":"authenticated"}',true);
do $test$
declare result jsonb;
begin
  result:=public.admin_appearance_state('listing-detail/save-button');
  perform public.assert_editor_test(
    (result->'published'->>'revision')::bigint=0,
    'initial config must use revision zero and compiled defaults');
  result:=public.admin_appearance_save_draft(
    'listing-detail/save-button','{"all":{"height":44}}',0,0);
  perform public.assert_editor_test(
    (result->>'version')::bigint=1,'Operator private draft version');
  begin
    perform public.admin_appearance_publish(
      'listing-detail/save-button',0,1,'Operator must not publish',
      '50000000-0000-4000-8000-000000000001');
    raise exception 'UNSAFE: operator publication accepted';
  exception when insufficient_privilege then null;
  end;
end
$test$;
commit;
\echo 'PASS: Operator draft permitted, publication denied'

-- AAL2 Owner: bad values, private draft, publish, public read and idempotency.
begin;
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"00000000-0000-4000-8000-0000000000a1","aal":"aal2","role":"authenticated"}',true);
do $test$
declare result jsonb; again jsonb; public_data jsonb;
begin
  begin
    perform public.admin_appearance_save_draft(
      'listing-detail/save-button','{"all":{"custom_css":"html{display:none}"}}',0,0);
    raise exception 'UNSAFE: arbitrary CSS field accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.admin_appearance_save_draft(
      'listing-detail/save-button','{"all":{"height":999}}',0,0);
    raise exception 'UNSAFE: out of range style accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.admin_appearance_save_draft(
      'listing-detail/language','{"all":{"radius":20}}',0,0);
    raise exception 'UNSAFE: unregistered element accepted';
  exception when invalid_parameter_value then null;
  end;
  result:=public.admin_appearance_save_draft(
    'listing-detail/save-button','{"all":{"radius":20}}',0,0);
  perform public.assert_editor_test((result->>'version')::bigint=1,'first private draft');
  public_data:=public.site_appearance_published();
  perform public.assert_editor_test(jsonb_array_length(public_data)=0,
    'private drafts cannot become visible on public read');
  result:=public.admin_appearance_publish(
    'listing-detail/save-button',0,1,'Approved synthetic first release',
    '50000000-0000-4000-8000-000000000011');
  perform public.assert_editor_test((result->>'revision')::bigint=1,
    'first publication revision');
  again:=public.admin_appearance_publish(
    'listing-detail/save-button',0,1,'Approved synthetic first release',
    '50000000-0000-4000-8000-000000000011');
  perform public.assert_editor_test(again->>'alreadyApplied'='true',
    'duplicate request must be idempotent');
  begin
    perform public.admin_appearance_publish(
      'listing-detail/save-button',0,1,'Reused ID with altered reason',
      '50000000-0000-4000-8000-000000000011');
    raise exception 'UNSAFE: reused request ID accepted a different publication';
  exception when unique_violation then null;
  end;
  public_data:=public.site_appearance_published();
  perform public.assert_editor_test(
    jsonb_array_length(public_data)=1 and
    (public_data->0->>'revision')::bigint=1 and
    public_data->0->'config'->'all'->>'radius'='20',
    'first public read returns only published style');
  perform public.assert_editor_test(
    jsonb_array_length(public.admin_appearance_history('listing-detail/save-button'))=1
    and
    (select count(*) from jsonb_array_elements(public.admin_change_audit_recent(10)) a
      where a->>'action'='appearance_published')=1
    and
    (select count(*) from jsonb_array_elements(public.admin_change_audit_recent(10)) a
      where a->>'action'='appearance_draft_saved')=2,
    'first publication and both private drafts have distinct audit entries');
end
$test$;
commit;
\echo 'PASS: validation, private draft, publish, public read, idempotency, audit'

-- An old Operator draft must conflict with the newly published version.
begin;
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"00000000-0000-4000-8000-0000000000a2","aal":"aal2","role":"authenticated"}',true);
do $test$
begin
  begin
    perform public.admin_appearance_save_draft(
      'listing-detail/save-button','{"all":{"height":48}}',1,0);
    raise exception 'UNSAFE: stale base published version accepted';
  exception when serialization_failure then null;
  end;
end
$test$;
rollback;
\echo 'PASS: lost-update conflict detected'

-- Restore copies history into a PRIVATE draft, then creates a NEW published revision.
begin;
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"00000000-0000-4000-8000-0000000000a1","aal":"aal2","role":"authenticated"}',true);
do $test$
declare draft jsonb; pub jsonb;
begin
  draft:=public.admin_appearance_save_draft(
    'listing-detail/save-button','{"mobile":{"radius":22}}',0,1);
  pub:=public.admin_appearance_publish(
    'listing-detail/save-button',1,(draft->>'version')::bigint,
    'Synthetic second revision','50000000-0000-4000-8000-000000000012');
  perform public.assert_editor_test((pub->>'revision')::bigint=2,'second release version');
  draft:=public.admin_appearance_restore_draft(
    'listing-detail/save-button',1,0,2);
  perform public.assert_editor_test(
    draft->'config'->'all'->>'radius'='20','restore creates private prior-state draft');
  pub:=public.admin_appearance_publish(
    'listing-detail/save-button',2,(draft->>'version')::bigint,
    'Restore earlier approved styling','50000000-0000-4000-8000-000000000013');
  perform public.assert_editor_test((pub->>'revision')::bigint=3,'restore publishes new revision');
  perform public.assert_editor_test(
    jsonb_array_length(public.admin_appearance_history('listing-detail/save-button'))=3
    and
    (select count(*) from jsonb_array_elements(public.admin_change_audit_recent(10)) a
      where a->>'action'='appearance_published')=3
    and
    (select count(*) from jsonb_array_elements(public.admin_change_audit_recent(10)) a
      where a->>'action'='appearance_draft_saved')=4,
    'restoring never erases earlier publication and private draft audit entries');
end
$test$;
commit;
\echo 'PASS: restore requires new reviewed publication, history preserved'

-- The published reader works without any auth token; protected reads do not.
begin;
set local role anon;
do $test$
declare data jsonb;
begin
  data:=public.site_appearance_published();
  perform public.assert_editor_test(jsonb_array_length(data)=1
    and (data->0->>'revision')::bigint=3,'anonymous published reader');
  begin
    perform public.admin_appearance_state('listing-detail/save-button');
    raise exception 'UNSAFE: anonymous protected read';
  exception when insufficient_privilege then null;
  end;
end
$test$;
rollback;
\echo 'PASS: public read permitted and protected read denied'

-- Existing profile contract: the last active Owner cannot be suspended.
do $test$
begin
  begin
    update public.profiles set account_status='suspended'
    where id='00000000-0000-4000-8000-0000000000a1';
    raise exception 'UNSAFE: sole active owner suspended';
  exception when insufficient_privilege then null;
  end;
end
$test$;
\echo 'PASS: last-active-owner guard preserved'

-- A failing publication audit insert must roll back the entire new release.
-- The temporary failure injector and draft are dropped by ROLLBACK.
begin;
create function private.test_block_published_audit() returns trigger
language plpgsql set search_path='' as $block_published$
begin
  if new.action='appearance_published' then
    raise exception 'synthetic audit unavailable' using errcode='ZX001';
  end if;
  return new;
end
$block_published$;
create trigger test_block_published_audit
before insert on public.admin_change_audit
for each row execute function private.test_block_published_audit();
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"00000000-0000-4000-8000-0000000000a1","aal":"aal2","role":"authenticated"}',true);
do $test$
declare saved jsonb; version_before bigint;
begin
  saved:=public.admin_appearance_save_draft(
    'listing-detail/save-button','{"desktop":{"radius":30}}',0,3);
  begin
    perform public.admin_appearance_publish(
      'listing-detail/save-button',3,(saved->>'version')::bigint,
      'Synthetic forced audit failure','50000000-0000-4000-8000-000000000014');
    raise exception 'UNSAFE: publication survived audit failure';
  exception when sqlstate 'ZX001' then null;
  end;
  perform public.assert_editor_test(
    (public.site_appearance_published()->0->>'revision')::bigint=3
    and jsonb_array_length(public.admin_appearance_history('listing-detail/save-button'))=3,
    'audit failure must prevent current pointer and immutable release from changing');
end
$test$;
rollback;
\echo 'PASS: forced audit insertion failure rolled back publication'

select public.assert_editor_test(
  (select count(*) from public.admin_change_audit)=7
  and (select count(*) from public.admin_appearance_revisions)=3
  and (select revision from public.admin_appearance_current
    where element_key='listing-detail/save-button')=3,
  'all three approved publications have one audit and immutable revision each');
\echo 'ALL LOCAL SQL CONTRACT TESTS PASS'
