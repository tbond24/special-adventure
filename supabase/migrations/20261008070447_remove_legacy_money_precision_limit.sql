-- The current amount/deposit columns are unconstrained numeric. Legacy mirror
-- columns must not reject high-denomination rents or deposits during RPC writes.
alter table public.vacancies alter column weekly_rent type numeric;
alter table public.vacancies alter column bond type numeric;
