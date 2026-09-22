create table if not exists public.email_delivery_events (
  event_id text primary key check(length(event_id) between 3 and 160),
  event_type text not null check(event_type in ('email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed','email.suppressed')),
  provider_email_id text,
  recipient_domain text check(recipient_domain is null or length(recipient_domain)<=253),
  category text check(category is null or length(category)<=80),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.email_delivery_events enable row level security;
revoke all on table public.email_delivery_events from public,anon,authenticated;
grant select on table public.email_delivery_events to authenticated;
create policy email_events_admin_read on public.email_delivery_events for select to authenticated using(private.is_admin((select auth.uid())));
create index if not exists email_delivery_events_occurred_idx on public.email_delivery_events(occurred_at desc);
create index if not exists email_delivery_events_type_idx on public.email_delivery_events(event_type,occurred_at desc);
