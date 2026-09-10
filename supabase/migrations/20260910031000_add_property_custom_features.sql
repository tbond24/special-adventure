alter table public.properties
  add column if not exists custom_features jsonb not null default '[]'::jsonb;

create or replace function public.set_property_custom_features(p_property_id uuid, p_features jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_features jsonb := coalesce(p_features, '[]'::jsonb);
begin
  if jsonb_typeof(v_features) <> 'array' or jsonb_array_length(v_features) > 12 then
    raise exception 'Features must be a list of up to 12 items';
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_features) item
    where jsonb_typeof(item) <> 'object'
      or length(trim(coalesce(item->>'label', ''))) not between 1 and 40
      or coalesce(item->>'icon', '') not in ('balcony','parking','wifi','shield','water','bolt','pets','furnished')
  ) then
    raise exception 'Each feature needs a valid label and icon';
  end if;

  update public.properties
  set custom_features = v_features, updated_at = now()
  where id = p_property_id and owner_id = (select auth.uid());
  if not found then raise exception 'Property not found'; end if;
  return v_features;
end;
$$;

revoke all on function public.set_property_custom_features(uuid,jsonb) from public, anon;
grant execute on function public.set_property_custom_features(uuid,jsonb) to authenticated, service_role;
