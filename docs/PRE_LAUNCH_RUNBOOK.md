# Vacancy release and rollback runbook

## Current production

- Domain: `https://getvacancy.site`
- Production deployment: `dpl_EgHGG1ZvqpLgR63bXciYK2ppJG1A`
- Accepted source preview: `dpl_4cc4DUTUuLsQBTGXkQX3Ys8mffgd`
- App tree: `e1464493dfd7347a2467e91c2d12c51973b40279`
- Git checkpoint: `checkpoint/stage46-production-pass`
- Previous production rollback deployment: `dpl_GAMPrkxowXZzLWXmWekiYsb3j28z`

## Release gates

1. Ten isolated genuine personas pass: five listers and five renters.
2. Public equivalence, map, mobile, hardening, adversarial and legal suites pass against one READY preview.
3. Critical served files match between the accepted preview and production.
4. Production opens on desktop and mobile without boot failure or horizontal overflow.
5. Supabase Auth, public inventory and protected RLS/RPC behavior remain healthy.

## Release procedure

1. Record commit and app-tree hashes.
2. Deploy one preview and record its deployment ID.
3. Run all gates against that preview. Stop on any failure.
4. Promote the accepted deployment without changing source.
5. Confirm aliases and READY status, then rerun the production public suite.
6. Record the production deployment and create a checkpoint branch.

## Incident response

- **Signup/reset:** check Supabase Auth logs, redirect allowlist, Resend events, SMTP configuration and Auth rate limits. Keep email confirmation enabled.
- **Listings:** check Vercel function logs and Supabase RPC/RLS errors. Do not loosen RLS. Pause new releases while writes are uncertain.
- **Messaging:** verify enquiry and reply using two isolated sessions; inspect `start_enquiry` and `send_message` errors without deleting conversations.
- **Serious regression:** reassign production aliases to `dpl_GAMPrkxowXZzLWXmWekiYsb3j28z`, confirm READY, and rerun boot, inventory, auth and messaging smoke checks. Use a forward database fix unless a reverse migration was already tested.

Health-check order: Vercel deployment and aliases → desktop/mobile boot → Supabase Auth → inventory → listing write → enquiry/reply → logs.
