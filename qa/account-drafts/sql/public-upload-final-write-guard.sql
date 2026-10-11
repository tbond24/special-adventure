-- LOCAL FINAL-WRITE MITIGATION CANDIDATE. Parent confirms exact tagged-path
-- safeguard approval covers this trigger; independent review required before apply.
-- The Storage caller-policy permission probe can roll back a savepoint before
-- its privileged metadata write. Check the same fence at the actual INSERT.
-- This trigger touches only room-media names with the new draft- prefix.
create function private.enforce_listing_draft_public_insert()
returns trigger language plpgsql security definer set search_path='' as $$
declare parts text[]; d public.listing_drafts; m public.listing_draft_manifests;
  uuid_pattern text:='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'; expected_mime text;
begin
  if new.bucket_id<>'room-media' or new.name !~ '^[^/]+/[^/]+/draft-' then return new; end if;
  parts:=regexp_match(new.name,'^('||uuid_pattern||')/('||uuid_pattern||')/draft-('||uuid_pattern||')-('||uuid_pattern||')-([0-9]{1,18})-('||uuid_pattern||')-([0-9a-f]{64})\.(jpg|png|webp)$');
  if parts is null or new.owner_id is distinct from parts[1] then raise exception 'Draft upload fence unavailable' using errcode='42501'; end if;
  -- Storage owns the final insert and may be using its privileged role. Bind its
  -- authenticated owner_id to the path and draft rather than relying on that
  -- service transaction retaining the browser JWT. Preflight RLS checks caller.
  if not private.is_active_user(parts[1]::uuid) or not exists(select 1 from auth.users where id=parts[1]::uuid and not coalesce(is_anonymous,true)) then
    raise exception 'Draft upload account unavailable' using errcode='42501';
  end if;
  select * into d from public.listing_drafts where id=parts[3]::uuid and owner_id=parts[1]::uuid for update;
  if d.id is null or d.state<>'publishing' or d.publish_token is distinct from parts[4]::uuid or d.revision<>parts[5]::bigint then
    raise exception 'Draft upload fence changed' using errcode='40001';
  end if;
  select * into m from public.listing_draft_manifests where draft_id=d.id and transfer_id=d.current_transfer_id;
  if not exists(select 1 from jsonb_array_elements(m.payload->'units') x where x->>'_requestId'=parts[6]) or d.published_units ? parts[6]
    or not exists(select 1 from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id
      where r.id=parts[2]::uuid and p.owner_id=parts[1]::uuid and ((m.edit_vacancy_id is null and v.client_request_id=parts[6]::uuid) or v.id=m.edit_vacancy_id)) then
    raise exception 'Draft upload target unavailable' using errcode='42501';
  end if;
  expected_mime:=case parts[8] when 'jpg' then 'image/jpeg' when 'png' then 'image/png' when 'webp' then 'image/webp' end;
  if new.metadata->>'mimetype' is distinct from expected_mime then raise exception 'Draft upload MIME mismatch'; end if;
  -- The same trigger also runs in Storage's preliminary permission probe.
  if coalesce(new.metadata->>'size',new.metadata->>'contentLength') is not null then
    if coalesce(new.metadata->>'size',new.metadata->>'contentLength') !~ '^[0-9]{1,8}$' then raise exception 'Invalid draft upload size'; end if;
    if coalesce(new.metadata->>'size',new.metadata->>'contentLength')::bigint not between 1 and 10485760 then raise exception 'Invalid draft upload size'; end if;
  end if;
  return new;
end $$;
revoke all on function private.enforce_listing_draft_public_insert() from public,anon,authenticated;
create trigger listing_draft_tagged_public_final_write_guard before insert on storage.objects
  for each row execute function private.enforce_listing_draft_public_insert();
