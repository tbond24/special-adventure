-- The invoker wrapper needs permission to call this existing guarded helper.
-- Keep both the function bodies and their execution modes unchanged.
do $$
begin
  if (select md5(prosrc) from pg_proc where oid='private.admin_account_hierarchy_impl(uuid)'::regprocedure)
       is distinct from 'a10d6ee92dac157b95871c65fc406faf'
     or not (select prosecdef from pg_proc where oid='private.admin_account_hierarchy_impl(uuid)'::regprocedure)
     or (select md5(prosrc) from pg_proc where oid='private.is_admin(uuid)'::regprocedure)
       is distinct from '0322921d1197b3b475791efe4523f26e'
     or (select md5(prosrc) from pg_proc where oid='private.is_active_user(uuid)'::regprocedure)
       is distinct from '208573c59a1f22bfab3de3ce6df1dc38'
     or (select md5(prosrc) from pg_proc where oid='public.admin_account_hierarchy(uuid)'::regprocedure)
       is distinct from '9af487feca3f806f1e1af5b64e11b7d6'
     or (select prosecdef from pg_proc where oid='public.admin_account_hierarchy(uuid)'::regprocedure)
     or has_function_privilege('anon','private.admin_account_hierarchy_impl(uuid)','execute')
  then
    raise exception 'Account Details baseline changed; review before granting execute';
  end if;
end $$;

grant execute on function private.admin_account_hierarchy_impl(uuid) to authenticated;
