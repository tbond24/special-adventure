# Vacancy full request audit — 22 September 2026

## Counting method

This audit reviews the product requests in the referenced Vacancy conversation against the current production source, migrations, stage records and `https://getvacancy.site`. It counts atomic acceptance statements rather than chat messages: a prompt containing ten requested changes contributes ten requirements. Repeated requests are merged. When the owner later reversed a request, the latest instruction is the active requirement and the older one is counted as superseded. Approval messages, status questions and deployment commands are excluded from the product count.

The audit identified **290 normalized product, research and release requirements**.

Status definitions:

- **Working:** implemented, retained in the current product and backed by runtime or stage acceptance evidence.
- **Partial:** meaningful implementation exists, but the latest requested scope is incomplete.
- **Deferred:** explicitly postponed or rejected until usage, data or a prerequisite justifies it.
- **External:** implementation exists but owner/vendor configuration blocks real completion.
- **Superseded:** replaced by a later owner decision; it is not an outstanding defect.
- **Missed:** no complete implementation and no explicit defer remains. This is the closest category to “ignored.”

## Overall result

| Status | Count | Share | Meaning |
| --- | ---: | ---: | --- |
| Working in the accepted product | **237** | **81.7%** | Complete and retained |
| Partially implemented | **28** | **9.7%** | Code or UI exists, but scope remains |
| Intentionally deferred | **11** | **3.8%** | Deliberate later-stage work |
| Blocked by external configuration | **1** | **0.3%** | Google OAuth provider credentials |
| Superseded by later instructions | **11** | **3.8%** | Earlier request correctly replaced |
| Missed / not implemented | **2** | **0.7%** | Genuine gaps |
| **Total** | **290** | **100%** | |

**Implemented to some degree:** 265/290 (91.4%).  
**Fully working and accepted:** 237/290 (81.7%).  
**Current active gaps:** 31 (28 partial + 1 external + 2 missed).  
**Later-stage, intentionally deferred:** 11.  
**No longer applicable because the owner changed direction:** 11.

## Area-by-area table

| Area | Requests | Working | Partial | Deferred | External | Superseded | Missed | Current assessment |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Authentication and account security | 14 | 12 | 0 | 0 | 1 | 0 | 1 | Email/password, confirmation, recovery, sessions, deletion and edge handling work. Google provider is not enabled. No owner-facing authenticator setup exists. |
| Email confirmation and recovery | 8 | 7 | 1 | 0 | 0 | 0 | 0 | Branded confirmation/reset delivery works; consistent inbox rather than spam is not guaranteed. |
| Guest access and enquiries | 5 | 5 | 0 | 0 | 0 | 0 | 0 | Guests can browse and enquire; server-side guest identity and messaging protections exist. |
| Map foundation, geolocation and geocoding | 14 | 13 | 1 | 0 | 0 | 0 | 0 | Current location, map selection, forward/reverse geocoding and private/public location handling work. The requested highly simplified Uber/Snap-style basemap is only partially addressed. |
| Map discovery, search and viewport behavior | 15 | 13 | 0 | 0 | 0 | 2 | 0 | Current viewport drives cards and markers; compact expanding search works. Manual radius and “Search this area” were replaced by automatic viewport filtering. |
| Filters, currency and international behavior | 14 | 10 | 2 | 0 | 0 | 2 | 0 | Live filters, independent display currency and rent periods work. Universal countries/flags/currencies are not complete. Sort and starter searches were later removed by request. |
| Map markers and listing categories | 8 | 7 | 0 | 1 | 0 | 0 | 0 | Database markers and type colors/icons work. Dense-marker clustering remains deferred until inventory requires it. |
| Listing cards, tile and list views | 18 | 17 | 0 | 0 | 0 | 1 | 0 | Square 4:3 cards, full-width lists, swipe galleries, counters, hearts, price/deposit/location hierarchy work. Dot counters were replaced by fractions. |
| Listing detail page | 15 | 13 | 1 | 0 | 0 | 1 | 0 | Gallery, lightbox, compact map, utilities, price/deposit, enquiry and bottom report row work. Per-listing preferred contact routes remain incomplete. Breadcrumbs were later removed. |
| Listing creation journey | 24 | 18 | 4 | 1 | 0 | 0 | 1 | Progressive type/property/unit/location/review flow, validation and compact fields work. Some legacy edit/form behavior remains; the photos-first unassigned capture inbox was never built. |
| Property and unit model | 11 | 8 | 1 | 2 | 0 | 0 | 0 | Existing/new properties, multiple units and inherited facts work. Parcel → building/block → unit hierarchy was explicitly deferred until real demand. |
| Listing media | 13 | 10 | 2 | 1 | 0 | 0 | 0 | Client resizing, previews, minimum image validation, cover order, reorder, view, remove and lightbox work. Cross-listing reusable media and a full asset library remain incomplete/deferred. |
| Listing management, drafts and publication | 14 | 12 | 2 | 0 | 0 | 0 | 0 | Draft recovery, preview, publish lock, idempotency, edit, pause, archive, restore and delete work. Some owner inventory presentation still uses compatibility layers and needs consolidation. |
| Messaging, inbox and contact | 11 | 7 | 3 | 1 | 0 | 0 | 0 | Enquiry-to-inbox, guest enquiries, unread badge and prompt chips work. Verified phone/email/WhatsApp routing and full lead-status workflow are incomplete; CRM-style automation is deferred. |
| Saved listings | 4 | 4 | 0 | 0 | 0 | 0 | 0 | Authenticated saved hearts, account persistence and saved view work. |
| You, profile and settings | 12 | 10 | 1 | 0 | 0 | 1 | 0 | Profile image/name/contact fields, security actions, blocked accounts and Reddit-style rows work. Tier/rating is an honest placeholder. Duplicate theme preference was removed. |
| Header, navigation, footer and shell | 15 | 12 | 1 | 0 | 0 | 2 | 0 | Transparent safe-area header, vector navigation, bottom island, back behavior, policies and mobile shell work. Footer behavior across every map state is not completely uniform. Earlier full-screen/draggable shell directions were replaced. |
| Brand, logo, theme and typography | 13 | 11 | 0 | 0 | 0 | 2 | 0 | Approved high-resolution logo, dark wordmark treatment, system typography, theme control and transparent loading work. Earlier font trials and dark-by-default were later reversed. |
| Responsive behavior, accessibility and feedback | 12 | 11 | 1 | 0 | 0 | 0 | 0 | Mobile containment, focus sizing, central notifications, accessible labels and button pending states work. A comprehensive motion system for every action remains incomplete. |
| Admin, moderation and analytics | 15 | 11 | 4 | 0 | 0 | 0 | 0 | Live totals, switchable graphs, accounts, hierarchy, reports, status controls, audit history and deactivation work. Storage/email-delivery health and unrestricted record editing are incomplete; unrestricted editing is intentionally constrained for security. |
| Legal, safety and privacy | 8 | 6 | 2 | 0 | 0 | 0 | 0 | Privacy, terms, storage, safety, 404, reporting and blocking exist. Operator identity, governing jurisdiction, monitored legal contact and registration assessment still require owner/legal input. |
| Performance and reliability | 9 | 8 | 1 | 0 | 0 | 0 | 0 | Image optimization, lazy media, fixed geometry, retry-safe publish, map/card synchronization and rollback gates work. Broader production observability remains incomplete. |
| Ratings, agencies and reputation | 6 | 0 | 1 | 5 | 0 | 0 | 0 | Honest “No ratings yet” state exists. Public ratings, agency banners, verified eligibility, moderation and ranking were intentionally deferred until completed-rental evidence exists. |
| Research, formula, release and rollback | 12 | 12 | 0 | 0 | 0 | 0 | 0 | Competitor reviews, option ranking, failure loops, previews, checkpoints, release records and rollback baselines are documented. |

## The two genuinely missed requests

| Missed request | Evidence | Recommendation |
| --- | --- | --- |
| Photos-first quick-capture inbox: open Vacancy, take photos immediately, and assign them to a property/unit later | Current creation still asks for listing context before publication. Media can be added and managed, but there is no unassigned capture inbox. | Do not build until lister testing proves that in-field capture is common. If built, start with an owner-private temporary media inbox with automatic expiry. |
| Authenticator-app setup for the owner/admin | Supabase authenticator MFA was preserved in project configuration, but Vacancy has no enrolment, challenge or recovery UI. | This is the highest-value missed item. Add owner-only TOTP enrolment and challenge before expanding admin powers. |

## Important partial items

| Priority | Partial area | What works | What remains |
| ---: | --- | --- | --- |
| 1 | Listing creation consolidation | Progressive stages, drafts, validation, images and preview | Remove remaining legacy form/edit paths and prove one first-time-lister journey on production-like data |
| 2 | Admin MFA | Secure admin gating and Supabase MFA configuration | Owner-facing TOTP enrolment, challenge, recovery codes and session assurance checks |
| 3 | Contact preferences | In-app enquiries, private phone/WhatsApp storage, email identity | Lister-selected contact routes, verification and privacy-safe display |
| 4 | Legal identity | Public policy pages and safety controls | Operator identity, jurisdiction, legal/privacy contact and registration review |
| 5 | International coverage | Six launch currencies, country-aware defaults, km/mi | Complete country/flag dataset and validated exchange-rate coverage |
| 6 | Deliverability | SPF/DKIM-backed branded SMTP sends confirmation and reset email | Monitor DMARC/reputation and reduce spam placement; inbox placement cannot be guaranteed |
| 7 | Admin observability | Accounts/listings/images/enquiries/messages graphs and moderation | Email failures, storage growth, performance/error trends and alert thresholds |
| 8 | Reusable media | Per-listing media reorder/delete/add and property-level selection | Owner asset library with reference counting, labels and safe deletion |
| 9 | Basemap styling | Compact controls and reduced UI clutter | A licensed/custom tile style with fewer labels and POIs, performance-tested against current OSM tiles |
| 10 | Ratings/tier display | Honest empty state | No rating should be published until completed-rental eligibility and moderation exist |

## Superseded requests

These were implemented or evaluated, then replaced by later owner instructions. They should not be counted as ignored:

1. Dark theme by default → light theme by default with device/user control.
2. Full-screen/80vh map → fixed map/results split.
3. Draggable listing sheet over the map → normal results flow below the map.
4. Kilometre/mile radius as the primary discovery rule → current visible map viewport.
5. “Search this area” button → automatic update after map movement.
6. Gallery dots → numeric `current/total` counter.
7. Listing breadcrumbs → removed to reduce vertical space.
8. Sort control → removed for now.
9. Starter/predefined searches → removed.
10. Remove every bold weight → restored hierarchy for logo, price and important headings.
11. Bottom progress bar → staged top journey/progress model.

## Evidence and confidence

- Current production deployment: `dpl_6jVLmqf6xnHPBZ4AwgJ3RrGHrf93`.
- Current live selected regression: **110/110 passed** on desktop/mobile projects.
- Latest Stage 76 live gate: **10/10 passed**.
- Historical decisions and runtime evidence: `docs/STAGE_01_FOUNDATION.md` through `docs/STAGE_76_VIEWPORT_LISTINGS.md`.
- Current source contains 29 domain modules/enhancement modules, 39 browser suites and the Supabase migration history.

Confidence is high for working, superseded and deliberately deferred classifications because they have source and stage records. Confidence is medium for counts inside broad visual requests because phrases such as “cleaner UI,” “all security measures,” and “make it like Realestate” are subjective; this audit decomposes them only where the conversation supplied a testable behavior.
