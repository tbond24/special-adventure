-- Disposable SQL simulation only; genuine Auth/REST/UI is tested separately.
begin;
do $$ begin
  if (select enabled from public.listing_display_options where slot='card-services') is distinct from false
    or (select config from public.admin_appearance_current where element_key='listing-display/card-services')
      is distinct from '{"all":{"enabled":false}}'::jsonb
    or (select revision from public.admin_appearance_current where element_key='listing-display/card-services')<>0
    or exists(select 1 from public.admin_appearance_revisions)
    or exists(select 1 from public.admin_change_audit) then
    raise exception 'Adoption changed legacy public value or fabricated a publication/audit';
  end if;
end $$;
insert into public.admin_access_roles(user_id,role,grant_reason) values
 ('00000000-0000-4000-8000-0000000000a1','owner','Disposable SQL QA'),
 ('00000000-0000-4000-8000-0000000000a2','operator','Disposable SQL QA');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000a2","aal":"aal2"}',true);
select public.admin_appearance_save_draft('listing-display/card-services','{"all":{"enabled":true}}',0,0);
do $$ begin
  begin
    perform public.admin_appearance_publish('listing-display/card-services',0,1,'SQL Operator denial','10000000-0000-4000-8000-0000000000e1');
    raise exception 'UNSAFE: Operator published';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000a1","aal":"aal2"}',true);
do $$ begin
  if public.admin_appearance_state('listing-display/card-services')->'draft' <> 'null'::jsonb then
    raise exception 'Owner saw Operator private draft'; end if;
  if (select enabled from public.listing_display_options where slot='card-services') is distinct from false then
    raise exception 'Private draft changed public display'; end if;
  begin
    perform public.admin_appearance_save_draft('listing-display/card-services','{"mobile":{"enabled":true}}',0,0);
    raise exception 'UNSAFE: page viewport accepted for global display';
  exception when invalid_parameter_value then null; end;
  begin
    update public.listing_display_options set enabled=true where slot='card-services';
    raise exception 'UNSAFE: direct table bypass';
  exception when insufficient_privilege then null; end;
  begin
    perform public.admin_set_listing_display_option('card-services',true);
    raise exception 'UNSAFE: immediate RPC bypass';
  exception when sqlstate 'PT409' then null; end;
end $$;
select public.admin_appearance_save_draft('listing-display/card-services','{"all":{"enabled":true}}',0,0);
select public.admin_appearance_publish('listing-display/card-services',0,1,'Reviewed SQL display publication','10000000-0000-4000-8000-0000000000e2');
select public.admin_appearance_publish('listing-display/card-services',0,1,'Reviewed SQL display publication','10000000-0000-4000-8000-0000000000e2');
do $$ begin
  if (select enabled from public.listing_display_options where slot='card-services') is distinct from true then
    raise exception 'Publication did not update existing public projection'; end if;
  if not exists(select 1 from jsonb_array_elements(public.site_appearance_published()) as item(value)
    where value->>'key'='listing-display/card-services' and value->>'revision'='1') then
    raise exception 'Published-only reader did not propagate shared value'; end if;
end $$;
reset role;
do $$ begin
  if (select count(*) from public.admin_appearance_revisions where element_key='listing-display/card-services')<>1
    or (select count(*) from public.admin_change_audit where action='appearance_published')<>1 then
    raise exception 'Idempotent display retry duplicated revision/audit'; end if;
end $$;
rollback;
\echo PASS: hidden legacy setting adopted without publication; private/Owner/bypass/idempotency contracts verified in SQL simulation.
