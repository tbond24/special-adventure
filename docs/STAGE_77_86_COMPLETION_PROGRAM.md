# Vacancy stages 77–86 completion program

## Aim and release boundary

Complete the ten active gaps from the 22 September audit without changing unrelated discovery, card, detail, navigation, brand or production behavior. Each stage is independently reversible. Production remains on the Stage 76 artifact until the combined preview and regression gates pass.

## Priority and decisions

| Stage | Gap | Options considered | Ranked decision | Acceptance gate |
| --- | --- | --- | --- | --- |
| 77 | Admin authenticator protection | 1. Supabase TOTP and AAL2 enforcement; 2. SMS OTP; 3. a separate admin identity provider | **1**: free, native and strongest fit. 2 costs money and needs a provider. 3 adds another security system. | Owner can enrol, challenge and remove a TOTP factor; every admin RPC and admin table read requires an AAL2 JWT. |
| 78 | Listing creation/edit consolidation | 1. reuse the proven staged composer for create and edit; 2. rewrite the composer; 3. retain two visible workflows | **1**: smallest safe change. 2 is high risk. 3 preserves the current inconsistency. | Create and edit use the same ordered section model, one review action and one publish/save action; legacy exposed fields are not required. |
| 79 | Lister contact choices | 1. in-app plus confirmed account email; 2. paid SMS phone verification; 3. expose unverified phone numbers | **1** now: complete the free secure routes. 2 remains an explicit paid-provider decision. 3 is unsafe. | Lister chooses in-app/email; email route is available only after Auth email confirmation; phone and WhatsApp remain private and visibly unavailable until verified. |
| 80 | Legal operator data | 1. owner-supplied operator configuration; 2. invented placeholder details; 3. remove policies | **1**. The interface and validation are built now; publication of the identity waits only for real owner facts. | Privacy/terms show one validated operator record with jurisdiction and monitored contacts; missing facts are reported in admin, never fabricated. |
| 81 | Email reputation monitoring | 1. verified Resend webhooks plus DMARC guidance; 2. mailbox scraping; 3. claim inbox placement | **1**. It provides objective delivery evidence. 2 is invasive. 3 is impossible to guarantee. | Signed events are stored without message bodies; admin shows delivery/bounce/complaint counts and the runbook explains DMARC and spam limits. |
| 82 | Broader admin observability | 1. small database aggregates for errors, media bytes and email; 2. paid observability suite; 3. raw logs only | **1**. It is cheap and sufficient for MVP. | Admin can switch between errors, storage and email metrics and sees clear attention thresholds. |
| 83 | Reusable listing media | 1. owner media picker that safely copies an existing asset; 2. shared database references with reference counting; 3. no reuse | **1**. It avoids deletion coupling and schema complexity while saving lister effort. | Owner can pick labelled media from another owned listing; the destination gets an independent optimized copy. |
| 84 | International coverage | 1. local ISO country/currency catalogue with market fallbacks; 2. six hard-coded markets; 3. a paid location service | **1**. It broadens selection without adding a provider. | All ISO countries appear with flags; supported currency choices are explicit; unknown locales fall back safely without moving the map. |
| 85 | Lower-detail basemap | 1. retain current OSM tiles with reduced controls; 2. free public third-party tiles; 3. paid custom vector tiles | **1** unless measured evidence shows a gain. Public third-party tiles add policy/reliability risk; paid tiles add cost. | A recorded comparison covers speed, labels, attribution and terms; no attribution is hidden and the chosen map passes the mobile performance gate. |
| 86 | Ratings readiness | 1. server feature gate requiring verified completed tenancy and moderation; 2. public free-form ratings; 3. cosmetic scores | **1**. It completes the safety foundation while keeping ratings private. | Public ratings remain off; the server refuses rating creation without an eligible completed tenancy and a moderation path. |

## Method used for every stage

1. Define the narrow acceptance criteria above.
2. Compare at least three options and take the first ranked safe option.
3. Build in an isolated module or additive migration.
4. Run targeted source, browser and database proof.
5. Score security, correctness, usability and complexity out of 10; any score below 8 stops advancement.
6. For a failure, record the root cause, rank three fixes and apply the smallest safe fix.
7. Re-run the affected gate and the full retained regression.
8. Commit the stage and record its rollback point.

## Owner input that cannot be inferred

The technical work can proceed without interruption. Final legal publication needs the operator's registered/legal name, service or business address, governing jurisdiction, monitored privacy email and monitored legal/support email. Enabling phone or WhatsApp verification later also needs a paid SMS provider and budget decision. No placeholder will be presented as a real legal identity or verified phone number.
