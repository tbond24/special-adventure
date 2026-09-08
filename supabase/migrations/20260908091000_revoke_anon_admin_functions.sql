revoke all on function public.admin_dashboard() from anon;
revoke all on function public.admin_search(text) from anon;
revoke all on function public.admin_resolve_report(uuid,text,text) from anon;
revoke all on function public.admin_set_vacancy_status(uuid,text,text) from anon;
revoke all on function public.admin_set_user_status(uuid,text,text) from anon;
