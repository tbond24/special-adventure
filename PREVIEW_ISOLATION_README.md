# Isolated Vacancy Admin visual preview (October 2026)

This dedicated PREVIEW SOURCE commit derives from candidate 241938d2476371f2c3c27d7cfce93dcaabb49835; it is **not a release candidate** and must never merge back into main or the editor feature branch.

Isolation is defense-in-depth:
1. Frontend Supabase URL is replaced with a deliberately non-resolving .invalid address, publishable key replaced with a dummy string.
2. Every /api/* Vercel handler from the candidate is replaced by a 403 stub. Do not connect this preview to production services or secrets.
3. All rendered responses apply a CSP with connect-src 'none', form-action 'none', plus robots noindex and isolated marker.
4. The real desktop admin shell and editor modules are present, but the demo fixture injects only explicit synthetic users/listings and browser-memory draft/history. It simulates publication **only in the current browser**.
5. Auth and backend data are NOT demonstrated here; genuine Auth, SQL, audit and public propagation belong to separately passing disposable/hosted tests.

Keep this deployment targeted as Vercel PREVIEW only; do not promote, assign live domains, enable any secret API env or real Auth. Live branch and database remain unchanged.
