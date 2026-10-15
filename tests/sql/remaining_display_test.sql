do $$ begin
 if (select count(*) from public.admin_appearance_current where element_key like 'listing-display/%' and revision=0 and config='{"all":{"enabled":false}}')<>10
 or exists(select 1 from public.admin_change_audit where target_key like 'listing-display/%') then
  raise exception 'Remaining display adoption changed hidden value or fabricated publication'; end if;
end $$;
\echo PASS: all ten hidden legacy display values adopted privately without publication.
