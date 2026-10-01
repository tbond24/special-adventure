-- An unselected availability date means the lister has not stated one.
alter table public.vacancies alter column available_from drop not null;

do $$
declare old_definition text;
declare new_definition text;
declare function_name text;
begin
  foreach function_name in array array['create_vacancy_listing_ke','create_unit_vacancy_for_property_ke'] loop
    select pg_get_functiondef(p.oid) into old_definition
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname = function_name;
    if old_definition is null then raise exception 'Missing listing function %', function_name; end if;
    new_definition := replace(old_definition,
      'if p_available_from is null then raise exception ''Availability date required''; end if;',
      '');
    if new_definition = old_definition then raise exception 'Availability guard not found in %', function_name; end if;
    execute new_definition;
  end loop;
end $$;
