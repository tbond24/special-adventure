-- Run only after restoring the previous app deployment, with verified target and backup.
-- Preserve collected evidence: do not drop additive columns or delete analytics rows.
BEGIN;
REVOKE ALL ON FUNCTION public.record_lister_journey_v2(jsonb) FROM anon, authenticated;
DROP FUNCTION public.admin_connected_journeys(timestamptz,timestamptz,text,text,text,integer,integer);
-- Restore admin_lister_marketing separately using admin-marketing-report-function.sql.
COMMIT;
