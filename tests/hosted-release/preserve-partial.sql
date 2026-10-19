-- TEST PROJECT raauicmfyjpcuhfzknak ONLY. Preserve the existing partial API.
-- Applied as one managed transaction; never a production candidate.
set local lock_timeout='5s';
set local statement_timeout='90s';
do $$ begin
 if obj_description(to_regclass('public.profiles'),'pg_class') is distinct from
 'Test-only partial profile contract for isolated admin role/audit verification. Not a production schema migration.'
 or (select count(*) from pg_tables where schemaname='public')<>12
 or (select count(*) from pg_tables where schemaname='private')<>0
 or (select count(*) from public.admin_appearance_revisions)<>9
 or (select count(*) from public.admin_change_audit)<>26
 or (select count(*) from auth.users)<>2
 or (select count(*) from storage.objects)<>0
 or to_regnamespace('qa_hosted_legacy_public') is not null
 or to_regnamespace('qa_hosted_legacy_private') is not null
 or to_regnamespace('qa_hosted_control') is not null then
  raise exception 'Unexpected test baseline; preserve and review before reconciliation';
 end if;
 if exists(select 1 from pg_constraint k join pg_class p on p.oid=k.confrelid join pg_namespace pn on pn.oid=p.relnamespace
 join pg_class c on c.oid=k.conrelid join pg_namespace cn on cn.oid=c.relnamespace
 where pn.nspname='public' and cn.nspname not in('public','private')) then raise exception 'External legacy dependency';end if;
end $$;
create schema qa_hosted_legacy_public;
create schema qa_hosted_legacy_private;
create schema qa_hosted_control;
revoke all on schema qa_hosted_legacy_public,qa_hosted_legacy_private,qa_hosted_control from public,anon,authenticated,service_role;
create table qa_hosted_control.preservation_checkpoint(kind text not null,name text not null,payload jsonb not null,primary key(kind,name));
alter table qa_hosted_control.preservation_checkpoint enable row level security;
revoke all on qa_hosted_control.preservation_checkpoint from public,anon,authenticated,service_role;
create table qa_hosted_control.source_receipts(ordinal integer primary key,path text not null,source_sha256 text not null,replay_sha256 text not null,provider_name text not null,provider_version text not null,verified_at timestamptz not null default now());
alter table qa_hosted_control.source_receipts enable row level security;
revoke all on qa_hosted_control.source_receipts from public,anon,authenticated,service_role;

do $$ declare r record; rows bigint; digest text; body jsonb;begin
 for r in select c.oid,c.relname,c.relacl,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind in('r','p') order by c.relname loop
  execute format('lock table public.%I in access exclusive mode',r.relname);
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),''[]''::jsonb)::text) from public.%I x',r.relname) into rows,digest;
  insert into qa_hosted_control.preservation_checkpoint values('table',r.relname,jsonb_build_object('oid',r.oid,'rows',rows,'digest',digest,'acl',r.relacl::text,'rls',r.relrowsecurity,'comment',obj_description(r.oid,'pg_class')));
 end loop;
 for r in select c.oid,c.relname,c.relacl from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='S' loop
  execute format('select jsonb_build_object(''last_value'',last_value,''is_called'',is_called,''log_cnt'',log_cnt) from public.%I',r.relname) into body;
  insert into qa_hosted_control.preservation_checkpoint values('sequence',r.relname,jsonb_build_object('oid',r.oid,'state',body,'acl',r.relacl::text));
 end loop;
 insert into qa_hosted_control.preservation_checkpoint
 select 'function',n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',
 jsonb_build_object('oid',p.oid,'schema',n.nspname,'definition',pg_get_functiondef(p.oid),'acl',p.proacl::text)
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.prokind='f'
 and not exists(select 1 from pg_depend d where d.objid=p.oid and d.deptype='e');
 if (select count(*) from qa_hosted_control.preservation_checkpoint where kind='function')<>20 then raise exception 'Unexpected function set';end if;
 insert into qa_hosted_control.preservation_checkpoint select 'receipts','original',jsonb_build_object('rows',count(*),'digest',md5(jsonb_agg(to_jsonb(m) order by version)::text),'versions',jsonb_agg(version order by version)) from supabase_migrations.schema_migrations m;
 insert into qa_hosted_control.preservation_checkpoint select 'auth','original',jsonb_build_object('rows',count(*),'digest',md5(jsonb_agg(to_jsonb(u) order by id)::text),'ids',jsonb_agg(id order by id)) from auth.users u;
 insert into qa_hosted_control.preservation_checkpoint select 'presentation','original',to_jsonb(c) from public.admin_appearance_current c where element_key='listing-detail/save-button';
end $$;

-- SET SCHEMA retains table/function OIDs, rows, indexes, constraints and history.
do $$ declare r record;begin
 for r in select tablename from pg_tables where schemaname='public' order by tablename loop
  execute format('alter table public.%I set schema qa_hosted_legacy_public',r.tablename);
 end loop;
 for r in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='S' loop
  execute format('alter sequence public.%I set schema qa_hosted_legacy_public',r.relname);
 end loop;
 for r in select p.oid,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.prokind='f'
 and not exists(select 1 from pg_depend d where d.objid=p.oid and d.deptype='e') loop
  execute format('alter function %s set schema %I',r.oid::regprocedure,case when r.nspname='public' then 'qa_hosted_legacy_public' else 'qa_hosted_legacy_private' end);
 end loop;
end $$;
revoke all on all tables in schema qa_hosted_legacy_public from public,anon,authenticated,service_role;
revoke all on all sequences in schema qa_hosted_legacy_public from public,anon,authenticated,service_role;
revoke all on all functions in schema qa_hosted_legacy_public,qa_hosted_legacy_private from public,anon,authenticated,service_role;
create function qa_hosted_control.reject_archive_write() returns trigger language plpgsql set search_path='' as $$begin raise exception 'Preserved test baseline is immutable' using errcode='42501';end $$;
revoke all on function qa_hosted_control.reject_archive_write() from public,anon,authenticated,service_role;
do $$ declare r record;begin
 for r in select tablename from pg_tables where schemaname='qa_hosted_legacy_public' loop
  execute format('create trigger qa_preserved_no_row_write before insert or update or delete on qa_hosted_legacy_public.%I for each row execute function qa_hosted_control.reject_archive_write()',r.tablename);
  execute format('create trigger qa_preserved_no_truncate before truncate on qa_hosted_legacy_public.%I for each statement execute function qa_hosted_control.reject_archive_write()',r.tablename);
 end loop;
end $$;
create trigger qa_checkpoint_no_row_write before insert or update or delete on qa_hosted_control.preservation_checkpoint for each row execute function qa_hosted_control.reject_archive_write();
create trigger qa_checkpoint_no_truncate before truncate on qa_hosted_control.preservation_checkpoint for each statement execute function qa_hosted_control.reject_archive_write();
create function qa_hosted_control.verify_preservation() returns jsonb language plpgsql set search_path='' as $$
declare r record; rows bigint; digest text; body jsonb; n integer:=0;begin
 for r in select name,payload from qa_hosted_control.preservation_checkpoint where kind='table' loop
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),''[]''::jsonb)::text) from qa_hosted_legacy_public.%I x',r.name) into rows,digest;
  if rows<>(r.payload->>'rows')::bigint or digest is distinct from r.payload->>'digest' or to_regclass('qa_hosted_legacy_public.'||quote_ident(r.name))::oid<>(r.payload->>'oid')::oid then raise exception 'Preserved table mismatch: %',r.name;end if;
  n:=n+1;
 end loop;
 for r in select name,payload from qa_hosted_control.preservation_checkpoint where kind='sequence' loop
  execute format('select jsonb_build_object(''last_value'',last_value,''is_called'',is_called,''log_cnt'',log_cnt) from qa_hosted_legacy_public.%I',r.name) into body;
  if body is distinct from r.payload->'state' then raise exception 'Preserved sequence mismatch';end if;
 end loop;
 select md5(jsonb_agg(to_jsonb(m) order by version)::text) into digest from supabase_migrations.schema_migrations m
 where version in(select jsonb_array_elements_text(payload->'versions') from qa_hosted_control.preservation_checkpoint where kind='receipts');
 if digest is distinct from (select payload->>'digest' from qa_hosted_control.preservation_checkpoint where kind='receipts') then raise exception 'Original migration receipts changed';end if;
 select count(*),md5(jsonb_agg(to_jsonb(u) order by id)::text) into rows,digest from auth.users u
 where id in(select jsonb_array_elements_text(payload->'ids')::uuid from qa_hosted_control.preservation_checkpoint where kind='auth');
 if rows<>(select (payload->>'rows')::bigint from qa_hosted_control.preservation_checkpoint where kind='auth')
 or digest is distinct from (select payload->>'digest' from qa_hosted_control.preservation_checkpoint where kind='auth') then raise exception 'Original Auth users changed';end if;
 return jsonb_build_object('tables',n,'rowsAndOidsAndSequencesUnchanged',true,'originalReceiptsUnchanged',true,'originalAuthUsersUnchanged',true);
end $$;
revoke all on function qa_hosted_control.verify_preservation() from public,anon,authenticated,service_role;
select qa_hosted_control.verify_preservation();
