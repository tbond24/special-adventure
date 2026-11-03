-- Restore only the expiry values retained by this repair. Keep checkpoint and
-- business/audit history. Never change listing status, confirmation or ownership.
do $rollback$
begin
  perform set_config('lock_timeout','5s',true);
  lock table public.vacancies in share row exclusive mode;
  if to_regclass('private.listing_expiry_checkpoint') is null
     or not exists(select 1 from pg_proc where oid=to_regprocedure('private.keep_active_listings_available()')
       and md5(prosrc)='251709a9e1dede1bfcbc4aade9d61436')
     or not exists(select 1 from pg_trigger where tgrelid='public.vacancies'::regclass
       and tgname='vacancy_no_automatic_expiry' and tgfoid=to_regprocedure('private.keep_active_listings_available()')
       and tgtype=23 and tgenabled='O' and tgnargs=0 and tgqual is null) then
    raise exception 'Listing expiry removal changed since capture; review rollback';
  end if;
  drop trigger vacancy_no_automatic_expiry on public.vacancies;
  update public.vacancies v set expires_at=c.expires_at
    from private.listing_expiry_checkpoint c
    where v.id=c.vacancy_id and v.created_at=c.vacancy_created_at
      and v.expires_at is null and c.expires_at is not null;
  drop function private.keep_active_listings_available();
end
$rollback$;
