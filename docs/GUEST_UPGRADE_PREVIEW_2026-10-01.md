# Guest upgrade preview checkpoint — 1 October 2026

Source commit: `cfacc48` on `feature/guest-upgrade-audit`.

Preview: `https://vacancy-fbtzc9oy0-tbond24s-projects.vercel.app` (`dpl_7WWVAUuBANFkEjkZ8p49dKegJ3pU`, READY). The preview contains the guest email verification/password flow and admin listing activity panel. Production was **not** promoted. Production remains `dpl_3kbGqxbBvUSpPgF4za15Q9yyYtiY` at `getvacancy.site`; previous production rollback candidate is `dpl_6zMYzetkzZjxXCViDmvqzckRcRVc`.

Database: additive `listing_activity_log` migration `20260930180151` was applied to production. It has no effect on the existing visitor UI. Three triggers and admin-only row-level read policy were confirmed. A temporary-table insert/update/delete drill recorded three actions inside a transaction that was rolled back. Schema rollback, if ever needed, should be a reviewed follow-up migration; do not drop the history table as part of a frontend rollback.

Verification: 148/148 existing launch browser checks passed locally. Six new guest upgrade checks passed locally and on the deployed preview across desktop and mobile Chromium. The admin activity panel and section placement passed desktop/mobile checks. These checks use mocked Auth responses; they do **not** prove delivery of a real verification email or retention of a live two-account message thread.

Before production promotion: confirm Supabase manual identity linking is enabled; complete one real guest → verified email → password → return sign-in using a controlled test inbox and confirm the user ID and conversation ID remain the same; run a real two-account enquiry/reply; record the backup/Storage restore drill in `DATA_RECOVERY_CHECKPOINT_2026-10-01.md`. If any of those fail, keep the current production deployment and fix the preview.
