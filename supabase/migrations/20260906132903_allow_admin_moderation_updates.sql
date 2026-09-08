create policy vacancies_admin_read on public.vacancies for select to authenticated using (private.is_admin((select auth.uid())));
create policy vacancies_admin_update on public.vacancies for update to authenticated using (private.is_admin((select auth.uid()))) with check (private.is_admin((select auth.uid())));;
