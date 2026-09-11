# Stage 64 — usability and listing categories

## Aim and scope

Improve the Find, Auth, listing composer, listing manager, and media workflows without changing production or weakening the existing security and publication rules.

## Decisions made with the Vacancy method

| Request | Options ranked | Smallest safe choice | Runtime acceptance |
|---|---|---|---|
| Logo tap flash | 1. Remove tap highlight/active fill; 2. replace link; 3. suppress all focus | Keep the semantic link and remove the transient touch fill while preserving keyboard focus | Desktop/mobile computed-style proof |
| Search controls | 1. targeted sizing/alignment; 2. rebuild toolbar; 3. new component library | Targeted sizing, vertical centring, compact header pills, arrowless currency selector | Desktop/mobile layout assertions |
| Recommendations/search-centre pill | 1. remove/hide generated UI; 2. disable geolocation; 3. replace search system | Remove recommendations and suppress the recreated status label while retaining location search | Desktop/mobile DOM and visibility proof |
| Map attribution over filters | 1. hide only while covered; 2. move permanently; 3. remove attribution | Hide only while the tools overlay is open, preserving attribution at all other times | Attribution visible before and hidden during overlay |
| Listing categories and map pins | 1. category filter over current schema; 2. new category tables; 3. taxonomy service | Existing property/unit type fields plus Shop and custom Other values, with category-coloured common icons | Shop filtering and custom category persistence proof |
| Composer density | 1. progressive disclosure; 2. one long form; 3. wizard rewrite | Collapsed property groups, compact progress, derived type hidden, advanced fields grouped | Desktop/mobile composer interaction proof |
| Media | 1. reuse current media APIs with previews/lightbox; 2. gallery rewrite; 3. external DAM | Real thumbnails, X removal, edit lightbox, previous/next navigation, minimum three images | Media manager and publication validation proof |
| Listing manager | 1. compact icon actions; 2. new dashboard; 3. leave text controls | Hide internal references and use labelled edit/pause icons | Desktop/mobile manager proof |
| Auth | 1. one mode-switching form; 2. tabs; 3. separate routes | One unboxed form with Create account/Sign in switch, existing password and confirmation rules retained | Desktop/mobile mode-switch proof |
| Publish feedback | 1. full-screen confirmation; 2. toast only; 3. modal requiring dismissal | Short green success confirmation driven by the existing successful-publish event | Existing duplicate-submit and publish checks retained |

## Failure loop

1. The compact progress design was overridden by an older high-specificity rule. Ranked fixes: responsive override, fixed progress everywhere, remove progress. Applied the responsive override and reran the composer gate.
2. Category filtering initially failed because the fixture used Australian market state with Kenyan vacancies. Ranked fixes: correct fixture market, weaken filtering, change product market behavior. Corrected the fixture and retained product behavior.
3. Older checks expected superseded vertical progress, visible filenames, and zero bold text. Ranked fixes: update exact requirements, keep contradictory UI, remove the new design. Updated only the obsolete assertions.
4. Shared unit photos initially opened by default. Ranked fixes: collapse by default, remove choices, leave open. Collapsed the section and retained access.
5. The combined six-worker run timed out around map toolbar state while the same behavior passed alone. Ranked fixes: weaken assertions, serialize, change working UI. Serialized the acceptance run; 72/72 passed. No product code was changed for resource contention.

## Evidence and score

- Stage 64 targeted desktop/mobile gate: **20/20**.
- Stage 61 + Stage 64 interaction gate: **44/44**.
- Stage 58–64 relevant serial regression: **72/72**.
- Syntax and whitespace validation: pass.
- Browser runtime: page content present, interactive controls discoverable, no error overlay.
- Score: Find/header **10/10**; categories **10/10**; composer **9/10**; media **10/10**; auth **10/10**; regression integrity **10/10**.

## Boundaries and follow-up

- OpenStreetMap attribution remains visible whenever no filter overlay covers it; removing it permanently would violate the map provider's attribution requirement.
- Minimum stay is placed in Advanced property settings. A true maximum-stay value and general property-to-unit feature overrides need an explicit database model and migration; no fake UI-only field was added.
- Gmail inbox placement cannot be guaranteed by the application. Live DNS inspection found Resend DKIM and the sending-subdomain SPF/MX records, but no DMARC record for `getvacancy.site`. Add a monitoring DMARC policy through the domain DNS owner, then evaluate real email placement and Resend delivery telemetry.
- Production remains unchanged at Stage 62 until this exact artifact is approved for release.
