# Stage 73 — Renter-first product foundation

## Aim and scope

Improve how renters scan inventory, give active listers a direct route to their work, simplify the mental model for listing creation, make the approved logo work in both themes, and add a Supabase-native Google sign-in path. Preserve the current map, email/password authentication, RLS-backed data model, guest enquiries, listing moderation and production rollback.

## Evidence reviewed

- realestate.com.au leads rental discovery with suburb/postcode/state search, separates renter and advertiser tasks, and keeps property categories close to search: https://www.realestate.com.au/rent/
- Zillow exposes location, price, beds/baths, home type, filters, result count and sorting before its result cards; cards lead with price, unit type and address: https://www.zillow.com/homes/for_rent/
- Rightmove centres the rental task around location and property filters, then separates result browsing from agent/advertiser work: https://www.rightmove.co.uk/property-to-rent.html
- Airbnb leads with destination and trip constraints, uses image-led cards, and moves host work behind a separate host path: https://www.airbnb.com/
- Supabase requires a configured Google OAuth client and supports browser sign-in through `signInWithOAuth`; redirect destinations must be allow-listed: https://supabase.com/docs/guides/auth/social-login/auth-google and https://supabase.com/docs/guides/auth/redirect-urls

The shared pattern is task hierarchy, not identical styling: renter discovery is the default; price, type and place carry more visual weight than metadata; advanced filters stay secondary; supplier operations have a direct workspace.

## Decisions by feature

### Typography and colour

Options: keep uniform sizing; add a semantic system-font scale; import a branded web font. The semantic system scale ranks first for scan speed, platform familiarity, zero font download, and low regression risk. Price is largest within cards, then listing identity, then location/distance metadata. Existing orange remains the action colour; green remains success/price and red remains destructive/urgent.

### Theme-aware logo

Options: use the black wordmark in both themes; generate a second raster; layer the exact approved raster with a clipped white wordmark in dark mode. Layering ranks first because it preserves the approved geometry and orange mark without accepting generative artefacts. The generated trial was rejected during review because it introduced white speckling.

### Listing journey

Options: keep expandable sections without a journey model; copy a six-screen competitor flow; expose a five-stage Type → Property → Unit → Location → Review/Publish model over the current progressive form. The five-stage model ranks first because it matches the real data hierarchy and reuses tested validation, drafts, media optimisation and preview behavior.

### Lister navigation

Options: give every user more navigation items; create a permanent mode switch; replace Saved with Listings only for accounts that already manage inventory. The adaptive slot ranks first for space and task frequency. Renters retain Saved; listers get a direct listing dashboard. Saved remains accessible through account features and can be restored if usage shows it is more valuable for mixed-role accounts.

### Filters and listing details

Options: expose every filter; reduce to only price/location; retain category and primary filters with a denser secondary panel. The third option ranks first. It preserves international and amenity use cases while lowering visual load. Listing details retain decision-critical price, deposit, location, map, availability and utilities; empty optional sections remain hidden.

### Motion and loading

Options: decorative page animation; no feedback; short state transitions plus current progress feedback. Short feedback ranks first. It is disabled when reduced motion is requested and does not delay navigation.

### Admin operations

Options: build a second admin product; expose database tooling; refine the existing operational dashboard. Refinement ranks first. The current dashboard already has activity metrics, attention counts, moderation, account hierarchy, audit history and status controls. This stage cleans its hierarchy rather than duplicating it.

### Google sign-in

Options: Google One Tap; Supabase OAuth redirect; replace password auth. Supabase OAuth redirect ranks first for smallest secure integration and no extra Google script. Password sign-in and confirmation stay available. A real successful Google account session still depends on the Google provider Client ID/secret being enabled in the production Supabase project.

## Autonomous decisions versus owner input

No owner input is needed for spacing, accessible font scale, responsive behavior, reduced-motion handling, filter density, loading feedback, renter/lister route priority, admin information hierarchy, or test coverage.

Owner-controlled inputs remain external identity choices: Google Cloud OAuth branding/consent ownership and credentials. Code can be complete and its redirect/session handling can be tested without exposing or fabricating those credentials, but a real Google login cannot be claimed until the provider is configured and a real account completes the consent flow.

## Acceptance and score

Acceptance requires mixed-country discovery, visible Google and password paths, secure callback session storage, correct renter/lister navigation, five-stage listing guidance, exact dark logo behavior, renter information hierarchy, reduced-motion support, and zero mobile horizontal overflow. Browser proof runs at desktop and mobile sizes. Production promotion occurs only after preview and live runtime checks pass.

Local evidence after the repair loops:

- Renter/lister UI and responsive regression: **134/134 pass**.
- Auth, guest enquiry and Stage 73 targeted checks: **28/28 pass**.
- Map attribution race stress check: **20/20 pass**.
- Production Supabase health: **ACTIVE_HEALTHY**.
- Production Google provider probe: **not enabled**. The safe UI readiness check keeps the Google action hidden instead of sending users to a provider error. The OAuth and callback implementation is complete, but a real Google sign-in remains blocked by owner-controlled Google OAuth Client ID/secret configuration.

The first browser run exposed an unnecessary DOM observer that reacted to its own navigation rewrite and stalled page loading. Fixes considered were debouncing it, guarding each mutation, or removing it and using the existing identity/list-render lifecycle hooks. Removal ranked first because both updates already have precise hooks and need no background observer.

The second run found that an older dark-theme image rule overrode the white wordmark filter, while one OAuth URL assertion read the browser address from the test process. The visual fixes considered were deleting historical theme rules, increasing selector specificity at the final cascade layer, or creating another asset. A final scoped cascade lock ranked first because it is isolated and preserves rollback. The test fix reads both URL and origin inside the browser, retaining an exact redirect-origin assertion.

The broader regression returned 122/134. The failures were three superseded contracts: duplicate-image selectors from the first logo layering approach, uniform regular card typography, and the old `Listing` step label. Logo fixes considered were changing old selectors, using a generated second asset, or keeping one real image and painting only the white wordmark through a pseudo-element. The one-image implementation ranked first and preserves existing accessibility/image-density tests. The other tests were updated to assert the new exact `Unit` label and measurable price → title → metadata hierarchy rather than being skipped or loosened.

The next full run reached 133/134 and exposed an intermittent render-order race that could reattach the retired search suggestion list. Fixes considered were adding a test delay, retaining a permanent mutation observer, or enforcing cleanup in the final home-render wrapper. The final wrapper ranked first because it is deterministic and performs no background observation.

Repeated parallel rendering showed the final wrapper could still run after a very fast initial render. The stronger root fix removes the retired datalist from the map template itself; the wrapper remains harmless defensive cleanup. This eliminates the race at its source.

A three-pass mobile stress run then caught the map attribution remaining visible for one frame after opening map tools. Fixes considered were extending the observer, hiding attribution whenever the panel itself was visible, or updating the shell state in the same function that opens the panel. The synchronous state update ranked first because it removes the timing gap without adding lifecycle work.

The auth regression then showed that an inventory outage could replace the requested sign-in or policy page with the Find-page error. Fixes considered were coupling auth to an empty inventory response, loading every route before inventory, or allowing independent routes to render when inventory fails. The scoped fallback ranked first: sign-in and legal pages remain available during an inventory outage, while Find still gives an honest retry state. The auth test now isolates inventory explicitly so it measures submission locking and rate-limit messaging rather than live inventory availability.

Adding Google made the older rate-limit test's generic first-button selector target the OAuth control instead of the password submit action. The product was behaving correctly; the harness was ambiguous. It now selects the accessible `Sign in` action exactly and still verifies a single request, disabled pending state, rate-limit explanation and recovery.

## Rollback

Stage 72 is independently recoverable at `checkpoint/stage72-global-discovery-pass`. Stage 73 will receive its own checkpoint after browser and preview acceptance.
