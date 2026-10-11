-- SEPARATE ADDITIVE CHANGE. Approved for draft-sync testing; local candidate only.
-- Apply only after schema.sql and explicit approval for this tagged-path guard.
-- Existing public bucket, policies, ordinary untagged paths remain unchanged.
create function private.allow_listing_draft_public_upload(p_name text,p_owner text,p_metadata jsonb)
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare parts text[]; u uuid:=auth.uid(); d public.listing_drafts; m public.listing_draft_manifests;
  uuid_pattern text:='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'; expected_mime text;
begin
  -- This additive policy deliberately scopes only the new account-draft prefix.
  if p_name !~ '^[^/]+/[^/]+/draft-' then return true; end if;
  if u is null or p_owner is distinct from u::text or not private.is_permanent_user() or not private.is_active_user(u) then return false; end if;
  parts:=regexp_match(p_name,'^('||uuid_pattern||')/('||uuid_pattern||')/draft-('||uuid_pattern||')-('||uuid_pattern||')-([0-9]{1,18})-('||uuid_pattern||')-([0-9a-f]{64})\.(jpg|png|webp)$');
  if parts is null or parts[1]<>u::text then return false; end if;
  select * into d from public.listing_drafts where id=parts[3]::uuid and owner_id=u for update;
  if d.id is null or d.state<>'publishing' or d.publish_token is distinct from parts[4]::uuid or d.revision<>parts[5]::bigint then return false; end if;
  select * into m from public.listing_draft_manifests where draft_id=d.id and transfer_id=d.current_transfer_id;
  if not exists(select 1 from jsonb_array_elements(m.payload->'units') x where x->>'_requestId'=parts[6])
    or d.published_units ? parts[6] then return false; end if;
  if not exists(select 1 from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id
    where r.id=parts[2]::uuid and p.owner_id=u and ((m.edit_vacancy_id is null and v.client_request_id=parts[6]::uuid) or v.id=m.edit_vacancy_id)) then return false; end if;
  expected_mime:=case parts[8] when 'jpg' then 'image/jpeg' when 'png' then 'image/png' when 'webp' then 'image/webp' end;
  if p_metadata->>'mimetype' is distinct from expected_mime then return false; end if;
  -- Upload permission probes may carry contentLength before final size exists.
  -- The existing bucket enforces the body limit; final link_media checks size.
  if coalesce(p_metadata->>'size',p_metadata->>'contentLength') is null then return true; end if;
  if coalesce(p_metadata->>'size',p_metadata->>'contentLength') !~ '^[0-9]{1,8}$' then return false; end if;
  return coalesce(p_metadata->>'size',p_metadata->>'contentLength')::bigint between 1 and 10485760;
end $$;
revoke all on function private.allow_listing_draft_public_upload(text,text,jsonb) from public,anon,authenticated;
grant execute on function private.allow_listing_draft_public_upload(text,text,jsonb) to authenticated;
create policy listing_draft_tagged_public_insert_fence on storage.objects as restrictive for insert to authenticated
  with check(bucket_id<>'room-media' or private.allow_listing_draft_public_upload(name,owner_id,metadata));
