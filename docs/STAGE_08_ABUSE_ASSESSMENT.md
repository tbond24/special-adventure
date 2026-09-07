# Stage 8: auth abuse assessment

Current Supabase documentation supports hCaptcha and Cloudflare Turnstile for signup, sign-in and password reset, and returns HTTP 429 when Auth limits are exceeded.

## Ranked options
1. Preserve Supabase rate limits and add one-request-at-a-time plus 429 UX now; configure Turnstile with the final branded domain. Chosen: smallest testable protection without throwaway keys or domains.
2. Configure Turnstile against temporary Vercel preview hostnames. Strong but creates disposable external configuration and still must be replaced at branding.
3. Custom queues, IP reputation or bot service. No evidence supports this complexity for MVP.

Email confirmation stays enabled. `secure-signup` retains its fail-closed HIBP check. CAPTCHA is required as part of the final domain/configuration gate before public promotion, not silently omitted.

Runtime run 34087165021: combined auth gate **9/9 passed** in 7.4 seconds, including repeated-submit prevention, 429 feedback and already-signed-in routing. CAPTCHA remains part of the single final domain-dependent gate because its public widget must be bound to the final hostname; it is not a separate build stage.
