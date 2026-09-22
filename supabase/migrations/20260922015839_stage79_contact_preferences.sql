alter table public.profile_private_contacts
  add column if not exists enquiry_in_app boolean not null default true,
  add column if not exists enquiry_email boolean not null default false,
  add column if not exists enquiry_phone boolean not null default false,
  add column if not exists enquiry_whatsapp boolean not null default false;

create or replace function public.set_contact_preferences(
  p_in_app boolean,
  p_email boolean,
  p_phone boolean default false,
  p_whatsapp boolean default false
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := (select auth.uid());
  email_ok boolean;
  phone_ok boolean;
begin
  if uid is null or coalesce((select auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'permanent account required'; end if;
  select email_confirmed_at is not null into email_ok from auth.users where id=uid;
  select coalesce(phone_verified,false) into phone_ok from public.profiles where id=uid;
  if coalesce(p_email,false) and not coalesce(email_ok,false) then raise exception 'confirm email before enabling email contact'; end if;
  if (coalesce(p_phone,false) or coalesce(p_whatsapp,false)) and not coalesce(phone_ok,false) then raise exception 'verify phone before enabling phone contact'; end if;
  if not (coalesce(p_in_app,false) or coalesce(p_email,false) or coalesce(p_phone,false) or coalesce(p_whatsapp,false)) then raise exception 'choose at least one contact method'; end if;
  insert into public.profile_private_contacts(user_id,enquiry_in_app,enquiry_email,enquiry_phone,enquiry_whatsapp,updated_at)
  values(uid,coalesce(p_in_app,false),coalesce(p_email,false),coalesce(p_phone,false),coalesce(p_whatsapp,false),now())
  on conflict(user_id) do update set enquiry_in_app=excluded.enquiry_in_app,enquiry_email=excluded.enquiry_email,enquiry_phone=excluded.enquiry_phone,enquiry_whatsapp=excluded.enquiry_whatsapp,updated_at=now();
end;
$$;

create or replace function public.vacancy_contact_options(p_vacancy_id uuid)
returns jsonb
language sql
security definer
stable
set search_path=''
as $$
  select coalesce((
    select jsonb_build_object(
      'in_app',coalesce(c.enquiry_in_app,true),
      'email',coalesce(c.enquiry_email,false) and u.email_confirmed_at is not null,
      'phone',coalesce(c.enquiry_phone,false) and coalesce(pr.phone_verified,false),
      'whatsapp',coalesce(c.enquiry_whatsapp,false) and coalesce(pr.phone_verified,false)
    )
    from public.vacancies v
    join public.rooms r on r.id=v.room_id
    join public.properties p on p.id=r.property_id
    join public.profiles pr on pr.id=p.owner_id
    join auth.users u on u.id=p.owner_id
    left join public.profile_private_contacts c on c.user_id=p.owner_id
    where v.id=p_vacancy_id and v.status='active'
  ),jsonb_build_object('in_app',true,'email',false,'phone',false,'whatsapp',false));
$$;

revoke all on function public.set_contact_preferences(boolean,boolean,boolean,boolean) from public,anon;
grant execute on function public.set_contact_preferences(boolean,boolean,boolean,boolean) to authenticated;
revoke all on function public.vacancy_contact_options(uuid) from public;
grant execute on function public.vacancy_contact_options(uuid) to anon,authenticated;
