-- Active listings stay available until their status is explicitly changed.
-- Keep legacy RPCs, RLS, publication guards and historical observations intact.
-- The private checkpoint preserves the expiry each legacy writer would use on
-- rollback; it contains identifiers/timestamps only and is never client-readable.
do $migration$
begin
  perform set_config('lock_timeout','5s',true);
  lock table public.vacancies in share row exclusive mode;
  if to_regclass('private.listing_expiry_checkpoint') is not null
     or to_regprocedure('private.keep_active_listings_available()') is not null
     or exists(select 1 from pg_trigger where tgrelid='public.vacancies'::regclass and tgname='vacancy_no_automatic_expiry') then
    raise exception 'Listing expiry removal already installed or checkpoint exists; review before replay';
  end if;

  create table private.listing_expiry_checkpoint(
    vacancy_id uuid primary key,
    vacancy_created_at timestamptz not null,
    expires_at timestamptz,
    captured_at timestamptz not null default clock_timestamp()
  );
  alter table private.listing_expiry_checkpoint enable row level security;
  revoke all on private.listing_expiry_checkpoint from public,anon,authenticated,service_role;
  comment on table private.listing_expiry_checkpoint is
    'Private rollback checkpoint for automatic listing expiry removal; preserve after rollback.';
  insert into private.listing_expiry_checkpoint(vacancy_id,vacancy_created_at,expires_at)
    select id,created_at,expires_at from public.vacancies where status='active';

  execute $ddl$
    create function private.keep_active_listings_available()
    returns trigger language plpgsql security definer set search_path='' as $function$
declare capture_expiry boolean;
begin
  if tg_table_schema<>'public' or tg_table_name<>'vacancies' or tg_when<>'BEFORE' then
    raise exception 'Invalid listing expiry trigger context';
  end if;
  if new.status='active' then
    if tg_op='INSERT' then capture_expiry:=true;
    else capture_expiry:=new.expires_at is not null or old.status is distinct from 'active';
    end if;
    if capture_expiry then
      insert into private.listing_expiry_checkpoint(vacancy_id,vacancy_created_at,expires_at)
        values(new.id,new.created_at,new.expires_at)
        on conflict(vacancy_id) do update set vacancy_created_at=excluded.vacancy_created_at,
          expires_at=excluded.expires_at,captured_at=clock_timestamp();
    end if;
    new.expires_at:=null;
  end if;
  return new;
end
$function$
  $ddl$;
  revoke all on function private.keep_active_listings_available() from public,anon,authenticated,service_role;
  create trigger vacancy_no_automatic_expiry before insert or update on public.vacancies
    for each row execute function private.keep_active_listings_available();

  -- Does not change status, confirmation/publication dates or historical counts.
  update public.vacancies set expires_at=null where status='active' and expires_at is not null;
  if exists(select 1 from public.vacancies where status='active' and expires_at is not null) then
    raise exception 'Active listings still have an automatic expiry';
  end if;
end
$migration$;
