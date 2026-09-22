# Stage 82 — admin operational health

Admin now combines delivery outcomes, bounce and complaint rates, media storage size and client-error counts for 7 or 30 days. Attention styling uses the conservative MVP thresholds documented in Stage 81. The aggregate is a single AAL2-protected PostgreSQL RPC; it returns no email addresses, message bodies or private listing data.

This small aggregate ranked above a paid observability platform and raw-log-only operations. Scores: security 10/10, correctness 9/10, usability 9/10, complexity 9/10.
