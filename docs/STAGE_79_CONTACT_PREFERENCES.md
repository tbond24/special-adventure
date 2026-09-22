# Stage 79 — verified contact preferences

Vacancy now lets a lister choose in-app and confirmed-email notifications. Phone and WhatsApp choices remain visible but disabled until the profile has a verified phone. Private email/phone values are never returned by the public listing RPC; it returns four booleans only. The server rejects an unconfirmed email, an unverified phone and a configuration with no contact route.

This free Supabase-native approach ranked above paying for SMS before user demand and above exposing unverified contact details. Scores: security 10/10, correctness 9/10, usability 9/10, complexity 9/10.

Targeted browser acceptance passed **2/2**. The first run used an over-specific accessible-name matcher and produced one harness failure. Ranked fixes were a product label rewrite, a regex name matcher, or stable control-name selectors. Stable selectors were the smallest test-only correction; the rerun passed without changing product behavior.
