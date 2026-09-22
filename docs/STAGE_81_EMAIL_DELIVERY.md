# Stage 81 — email delivery evidence

The selected solution is a signed Resend webhook that records only event identity, outcome, provider message ID, recipient domain and category. It does not store email content or full recipient addresses. Signatures use the raw payload, a five-minute replay window and constant-time HMAC comparison; duplicate events are ignored by primary key.

This ranked above mailbox scraping and unprovable inbox-placement claims. The DNS/reputation runbook remains: keep SPF and DKIM valid, publish DMARC at `p=none` while monitoring, then increase policy only after evidence; investigate bounce rates above 2% and complaint rates above 0.05%. Inbox placement still cannot be guaranteed by any application change.

Deployment needs two server-only environment variables and a Resend webhook registration: `RESEND_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, plus the existing `SUPABASE_URL`. Scores: security 9/10, correctness 9/10, usability 8/10, complexity 8/10.
