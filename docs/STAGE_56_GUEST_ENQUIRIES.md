# Stage 56 — Guest enquiries

## Aim and acceptance

Visitors must be able to browse, open a vacancy, submit an enquiry, and read/reply in the same browser without registering an email/password account. Exact addresses and lister contact details remain private. Listing, editing, saving, account, reporting, blocking, and administration remain permanent-account actions. Guest abuse must be limited server-side.

## Options and ranking

1. **Supabase anonymous session with guarded messaging** — keeps private in-app conversations and existing RLS membership while removing the registration form. Moderate setup; replies persist only in that browser.
2. **Guest-enquiry table plus transactional email relay** — supports email replies but adds retention, verification, delivery, unsubscribe, lister-routing, and moderation systems.
3. **Expose contact details or use `mailto:`** — quick, but enables scraping, weakens privacy, and cannot prove delivery.

Option 1 ranks first for the MVP. It provides the requested visitor flow through the existing conversation model without exposing personal contact data. Supabase recommends CAPTCHA for anonymous sign-ins; until a free Turnstile key is configured, the Auth endpoint's 30-per-hour IP limit is supplemented by a database limit of ten guest messages per rolling hour.

## Security design

- Anonymous Auth identities may participate only in conversations and messages they belong to.
- Restrictive RLS policies block anonymous identities from mutating properties, rooms, vacancies, media, saved items, reports, blocks, private locations, and profiles.
- A database trigger limits anonymous senders to ten messages per rolling hour.
- The UI treats an anonymous identity as a guest: Inbox works in the same browser; account-only routes continue to request sign-in.
- The guest form explains that replies remain in the current browser because clearing browser data or changing device loses an anonymous session.

## Runtime proof

- Database migration `20260909193000_allow_guarded_guest_enquiries.sql` applied to project `xtutkwiivqkgkqjpkxvj`.
- Auth configuration diff and push changed only `enable_anonymous_sign_ins` from `false` to `true`; confirmation, SMTP, MFA, password, and redirect settings remained unchanged.
- Genuine production-backend proof created anonymous user `7d606dbf-f560-4108-93a2-597820cc3660`, created and read private conversation `3aa9f5cd-66a5-432d-aa2e-3ff24a820e18`, and received HTTP 403 when attempting an account-only saved-vacancy write. The temporary conversation and Auth user were then deleted and their absence verified.
- Isolated visitor/enquiry tests: 8/8 passed across desktop and mobile.
- Stage 54/55 regression: 16/16 passed.
- Supabase security advisor after DDL: zero errors. Warnings about anonymous access reflect Supabase anonymous identities using the `authenticated` database role; restrictive permanent-user policies and genuine denied-write evidence verify the intended boundary.

Hosted preview and live-domain evidence are recorded after deployment so the exact tested artifact can be identified.
