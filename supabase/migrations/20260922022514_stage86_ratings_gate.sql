create table if not exists public.marketplace_feature_gates (
  feature text primary key,
  enabled boolean not null default false,
  eligibility_ready boolean not null default false,
  moderation_ready boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint feature_gate_safe_enable check(not enabled or (eligibility_ready and moderation_ready))
);
alter table public.marketplace_feature_gates enable row level security;
revoke all on table public.marketplace_feature_gates from public,anon,authenticated;
grant select on table public.marketplace_feature_gates to authenticated;
create policy feature_gates_admin_read on public.marketplace_feature_gates for select to authenticated using(private.is_admin((select auth.uid())));
insert into public.marketplace_feature_gates(feature,enabled,eligibility_ready,moderation_ready) values('ratings',false,false,false) on conflict(feature) do nothing;

create or replace function public.rating_readiness()
returns jsonb
language sql
security definer
stable
set search_path=''
as $$
  select jsonb_build_object(
    'enabled',coalesce(enabled,false),
    'eligibility_ready',coalesce(eligibility_ready,false),
    'moderation_ready',coalesce(moderation_ready,false),
    'public_message','Ratings will open only after Vacancy can verify a completed rental and moderate disputes.'
  ) from public.marketplace_feature_gates where feature='ratings';
$$;

create or replace function public.submit_rating(p_subject_user_id uuid,p_score integer,p_comment text default null)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if not exists(select 1 from public.marketplace_feature_gates where feature='ratings' and enabled and eligibility_ready and moderation_ready) then raise exception 'ratings are not available yet'; end if;
  -- Deliberately fail closed until a later migration adds completed-tenancy
  -- eligibility, the rating record, dispute workflow and moderation queue.
  raise exception 'verified completed-rental eligibility is required';
end;
$$;
revoke all on function public.rating_readiness() from public;
grant execute on function public.rating_readiness() to anon,authenticated;
revoke all on function public.submit_rating(uuid,integer,text) from public,anon;
grant execute on function public.submit_rating(uuid,integer,text) to authenticated;
