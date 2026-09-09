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

Pending isolated frontend, database and genuine guest-session verification.
