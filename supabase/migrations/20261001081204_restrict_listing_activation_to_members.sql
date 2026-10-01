revoke all on function public.reconfirm_vacancy(uuid) from public, anon;
grant execute on function public.reconfirm_vacancy(uuid) to authenticated, service_role;
