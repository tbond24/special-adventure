# Stage 81 — email delivery evidence

The selected solution is a signed Resend webhook that records only event identity, outcome, provider message ID, recipient domain and category. It does not store email content or full recipient addresses. Signatures use the raw payload, a five-minute replay window and constant-time HMAC comparison; duplicate events are ignored by primary key.

This ranked above mailbox scraping and unprovable inbox-placement claims. The DNS/reputation runbook remains: keep SPF and DKIM valid, publish DMARC at `p=none` while monitoring, then increase policy only after evidence; investigate bounce rates above 2% and complaint rates above 0.05%. Inbox placement still cannot be guaranteed by any application change.

Deployment is active on the Stage 86 preview. `RESEND_WEBHOOK_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` are stored as Vercel secrets for Preview and Production; `SUPABASE_URL` is stored as Config. Resend webhook `7bbe5fab-0ea9-4f93-8d0e-a376911688f2` subscribes to sent, delivered, delayed, bounced, complained, failed and suppressed outcomes. A runtime probe proved signature verification and database storage, then the synthetic row was removed. Scores: security 9/10, correctness 9/10, usability 8/10, complexity 8/10.
