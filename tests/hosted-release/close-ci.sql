-- Local privileged teardown ONLY in vacancy-admin-test, after the runner closes cleanly.
begin;
select qa_hosted_control.verify_preservation();
do $$ begin
 if exists(select 1 from qa_hosted_control.ci_window where active or reject_audit)
 or exists(select 1 from auth.users u join qa_hosted_control.ci_window w
  on u.raw_app_meta_data->>'vacancy_hosted_scope'=w.run)
 or exists(select 1 from storage.objects)
 or exists(select 1 from public.admin_appearance_current where config is distinct from initial_config)
 then raise exception 'Verified cleanup and closed window required';end if;
end $$;
drop trigger if exists qa_ci_audit_failure on public.admin_change_audit;
drop function if exists private.qa_ci_audit_failure();
drop function if exists public.qa_hosted_ci_fixture(text);
-- Retain the closed private checkpoint and fixture provenance; no history deletion.
commit;
