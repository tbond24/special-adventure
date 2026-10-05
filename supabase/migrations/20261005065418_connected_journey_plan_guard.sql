-- Scope planner settings to this aggregate only. Synthetic 100k-event fixture
-- otherwise selected repeated CTE nested loops and exceeded 20 seconds.
alter function public.admin_connected_journeys(timestamptz,timestamptz,text,text,text,integer,integer) set enable_nestloop = off;
alter function public.admin_connected_journeys(timestamptz,timestamptz,text,text,text,integer,integer) set jit = off;
