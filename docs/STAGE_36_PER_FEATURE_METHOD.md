# Stage 36 — per-feature decision and evidence ledger

Runtime status: independent feature matrix **20/20 passed**; defined desktop/mobile release regression **134 passed, 4 intentional skips, 0 failed**.

Hosted proof: exact commit `5cfde30` deployed as `dpl_44cFWS31WZ2vGnx2X1asHVaHGwVx`; the same defined matrix passed **134 with 4 intentional skips and 0 failures** on the preview.

Production proof: the hosted-green artifact was promoted as `dpl_ppbPHsgrMDZsuBHLXe4KAeaD4R7R`; `https://getvacancy.site` then passed the same **134 tests with 4 intentional skips and 0 failures**.

Stage 36 was reopened because the first implementation grouped several ideas into four cycles. This ledger applies the full method to every individual request. A feature is accepted only when its own acceptance check passes; combined regression does not substitute for that proof.

## F01 — iPhone safe-area map coverage

- **Aim/scope:** extend the map background to the physical top while keeping controls below iPhone status indicators.
- **Options:** (A) `viewport-fit=cover` plus safe-area padding; (B) colour-match a conventional safe-area strip; (C) require installed/native presentation.
- **Weigh/rank:** A gives the requested effect with low complexity; B is safest but fails the visual aim; C is expensive and platform-specific. Rank A, B, C.
- **Choice/build:** A. The map and glass layer use safe-area-aware viewport geometry.
- **Test/score:** viewport configuration, 390×844 runtime geometry and horizontal containment. **10/10**.
- **Failure/fix loop:** no feature defect found; hosted visual review retained.

## F02 — reduced glass blur

- **Aim/scope:** preserve legibility while showing more map detail through the header.
- **Options:** 7px blur; tint without blur; 12px existing blur.
- **Weigh/rank:** 7px balances context and contrast; tint-only varies too much over map labels; 12px obscures the map. Rank 7px, tint-only, 12px.
- **Choice/build:** 7px blur with light saturation and gradient tint.
- **Test/score:** computed hosted style equals 7px; light/dark contrast matrix passes. **10/10**.
- **Failure/fix loop:** none.

## F03 — navigation icon increase

- **Aim/scope:** add 5px to the intended 13px vector icons without enlarging the floating island excessively.
- **Options:** 18px glyphs; 20px glyphs; device-native/emoji icons.
- **Weigh/rank:** 18px matches the request and keeps 44px touch targets; 20px crowds labels; native icons vary by device. Rank 18px, 20px, native.
- **Choice/build:** local 18px SVGs, 2px stroke, 10px labels.
- **Test/score:** computed width, height, stroke and active states on mobile. **10/10**.
- **Failure/fix loop:** old 13px/6px tests failed; expectations were updated because the product requirement intentionally changed.

## F04 — smaller currency picker

- **Aim/scope:** reclaim header space while preserving a usable currency control.
- **Options:** compact native select; custom symbol menu; currency inside map tools.
- **Weigh/rank:** native select is accessible and lowest risk; a custom menu adds focus/keyboard work; map tools hides a primary preference. Rank native, custom, tools.
- **Choice/build:** 58×34px mobile select with 12px text.
- **Test/score:** computed width at 390px and currency-change regression. **10/10**.
- **Failure/fix loop:** none.

## F05 — listing map integrated with property facts

- **Aim/scope:** make location part of the information hierarchy.
- **Options:** facts/map grouped grid; map beside the title/price; separate full-width map.
- **Weigh/rank:** grouped grid preserves readable title space and relationship; title placement is cramped on phones; separate map repeats the existing problem. Rank grouped grid, title grid, separate.
- **Choice/build:** one property-facts/map component; side-by-side where space allows and compactly grouped on mobile.
- **Test/score:** DOM relationship and visible hosted map preview. **10/10**.
- **Failure/fix loop:** none.

## F06 — gallery heart saving

- **Aim/scope:** replace detail-page Save wording with a familiar image-overlay heart.
- **Options:** heart overlay; text button; overflow-menu save.
- **Weigh/rank:** heart is compact and already established in listing cards; text consumes space; overflow hides a frequent action. Rank heart, text, overflow.
- **Choice/build:** accessible outline/filled SVG connected to the existing saved-vacancy backend.
- **Test/score:** visible state and existing genuine saved-backend scenario. **10/10**.
- **Failure/fix loop:** inventory refresh could detach the control; F21 fixes the root cause.

## F07 — flag safety sheet

- **Aim/scope:** reduce Report/Block wording while preserving discoverability and distinct consequences.
- **Options:** flag-triggered sheet; permanent text buttons; three-dot overflow.
- **Weigh/rank:** flag communicates safety and keeps both explanations; text is cluttered; overflow is less explicit. Rank flag, text, overflow.
- **Choice/build:** bottom-right flag, modal backdrop, Report and Block rows, outside-tap/cancel closing.
- **Test/score:** open/close, exact accessible names, anonymous auth routing and existing blocking enforcement. **10/10**.
- **Failure/fix loop:** initial controls inherited descriptions in their accessible names; explicit concise labels fixed both failed checks.

## F08 — Reddit-style YOU rows

- **Aim/scope:** replace obvious cards with calm, full-width clickable lines.
- **Options:** separated rows; retained cards; nested settings pages.
- **Weigh/rank:** rows reduce noise and retain touch area; cards waste space; nested pages add navigation. Rank rows, cards, nested.
- **Choice/build:** grouped line rows with separators, values and chevrons.
- **Test/score:** row count, mobile overflow, dark/light contrast and click targets. **10/10**.
- **Failure/fix loop:** the first pass visually worked but exposed non-functional rows; F10–F13 correct those individually.

## F09 — theme setting

- **Aim/scope:** make the YOU theme row change and persist the active theme.
- **Options:** row toggle using existing theme service; duplicate theme select; header-only control.
- **Weigh/rank:** existing service avoids two sources of truth; a select duplicates logic; header-only fails settings usability. Rank service row, select, header-only.
- **Choice/build:** the row calls the existing theme setter and rerenders its value.
- **Test/score:** existing dark/light persistence and interface matrix. **10/10**.
- **Failure/fix loop:** none.

## F10 — currency setting inside YOU

- **Aim/scope:** change display currency from YOU without changing search geography.
- **Options:** inline native select; cycle values on row tap; redirect/focus the header.
- **Weigh/rank:** inline select is clear and accessible; cycling is opaque; header focus was not a real settings control. Rank select, cycle, redirect.
- **Choice/build:** inline selector uses the existing conversion service.
- **Test/score:** preference changes while `marketCode` remains unchanged. **10/10**.
- **Failure/fix loop:** first pass only focused the header control; replaced with an actual selector.

## F11 — distance-unit setting

- **Aim/scope:** make kilometres/miles control radius labels, conversion and displayed distance.
- **Options:** local device preference; account-synced preference; market-locked units.
- **Weigh/rank:** local preference is immediate, private and sufficient for MVP; account sync adds schema and conflict handling; market lock ignores user choice. Rank local, synced, locked.
- **Choice/build:** one distance helper now drives radius math, status, results and distance text.
- **Test/score:** change preference, establish a map point, verify radius/status in miles. **10/10**.
- **Failure/fix loop:** first pass changed only the label in YOU; centralizing unit lookup fixed the root defect.

## F12 — blocked-account management

- **Aim/scope:** let a member see and unblock accounts they previously blocked.
- **Options:** bottom sheet with unblock; dedicated page; informational message only.
- **Weigh/rank:** sheet fits a usually short list and current mobile interaction; page is unnecessary; message does not work. Rank sheet, page, message.
- **Choice/build:** authenticated block relation query and owner-scoped delete, rendered in a sheet.
- **Test/score:** stored relation renders and Unblock reaches the backend with the correct ID. **10/10**.
- **Failure/fix loop:** first pass only showed a toast; replaced with real retrieval and deletion.

## F13 — password and session controls

- **Aim/scope:** make the security row expose actual recovery and global sign-out actions.
- **Options:** action sheet; dedicated security page; recovery redirect only.
- **Weigh/rank:** sheet supports both current actions without a new router surface; a page is heavier; recovery-only omits sessions. Rank sheet, page, redirect.
- **Choice/build:** Reset password and Sign out every session use existing secure recovery/global logout paths.
- **Evidence-harness diagnosis:** The first independent rerun matched both a settings row and an action-sheet button with one partial accessible name. Ranked fixes: (1) target the action IDs, (2) scope the selectors to the sheet, (3) rename visible copy. Chose 1 because the product behavior was correct and this makes the runtime proof precise.
- **Test/score:** both controls render; existing recovery and global logout/session tests remain the authoritative backend proof. **10/10** locally; genuine isolated-session suite remains a hosted credential/local-stack gate when rerun.
- **Failure/fix loop:** first pass sent the whole row directly to recovery; an action sheet fixed the missing session choice.

## F14 — admin visibility and authorization

- **Aim/scope:** show Admin only to authorized operators and enforce authorization independently in the database.
- **Options:** server probe plus database allowlist; hide by email; always show and fail after entry.
- **Weigh/rank:** server probe/allowlist is secure; email checks are spoofable/client-visible; always-show creates confusion. Rank server probe, always-show, email.
- **Choice/build:** Admin starts hidden and appears only after the existing admin RPC succeeds; every operation rechecks `auth.uid()` server-side.
- **Test/score:** normal-member mock keeps entry hidden; anonymous direct RPC returns HTTP 401 after F20. **10/10**.
- **Failure/fix loop:** anonymous function execution initially returned an internal denial; explicit `anon` revoke moved denial to the API boundary.

## F15 — admin overview and health

- **Aim/scope:** show marketplace workload and errors that Vacancy can measure reliably.
- **Options:** operational counts/queues; decorative analytics dashboard; direct provider observability integration.
- **Weigh/rank:** operational counts answer what needs action; decorative graphs add noise; provider integrations add credentials/cost. Rank operations, provider integration later, decorative.
- **Choice/build:** users, properties, units, active listings, open-report age, enquiries, conversion and recorded client errors.
- **Test/score:** values render independently in admin runtime. **9/10** because direct Resend/Vercel/Supabase incident telemetry is not yet ingested.
- **Failure/fix loop:** “Core services reporting” was narrowed in documentation to client-observed health; it does not claim provider uptime.

## F16 — admin entity search

- **Aim/scope:** find a user or listing by name, location or ID without exposing private messages.
- **Options:** one server RPC; browser filtering of downloaded records; separate search service.
- **Weigh/rank:** RPC limits returned data and cost; browser filtering overfetches; search service is premature. Rank RPC, browser, service.
- **Choice/build:** bounded server search returns limited user/listing operational fields.
- **Test/score:** user/listing results and repeat search rendering. **10/10**.
- **Failure/fix loop:** none.

## F17 — report moderation

- **Aim/scope:** resolve or dismiss reports with an accountable reason.
- **Options:** reason-required RPC; direct table update; automatic resolution rules.
- **Weigh/rank:** RPC provides authorization and audit atomically; direct update can omit history; automation is premature. Rank RPC, direct, automatic.
- **Choice/build:** resolve/dismiss operations validate state and reason, then write the audit record.
- **Test/score:** UI reason reaches exact report action; invalid/anonymous calls fail server checks. **10/10**.
- **Failure/fix loop:** none.

## F18 — listing moderation

- **Aim/scope:** pause/reactivate listings without deleting marketplace history.
- **Options:** reversible status operation; hard delete; edit listing data as admin.
- **Weigh/rank:** status is reversible and least invasive; delete destroys evidence; editing changes owner content. Rank status, edit, delete.
- **Choice/build:** validated status RPC with required reason and audit entry.
- **Test/score:** exact ID/status/reason interaction and RLS regression. **10/10**.
- **Failure/fix loop:** none.

## F19 — user restriction

- **Aim/scope:** stop an abusive account from protected marketplace reads/writes even while its JWT has not expired.
- **Options:** restrictive RLS account-status check; Auth ban only; client hide/redirect.
- **Weigh/rank:** restrictive RLS acts at every protected table and does not trust stale client state; Auth ban alone may leave an access token alive; client checks are bypassable. Rank RLS plus status, Auth ban, client.
- **Choice/build:** active/suspended status and restrictive policies across protected tables; self-suspension is forbidden.
- **Test/score:** reason/confirmation UI reaches the exact user operation; migration lint and policy regression pass. **9/10** because deleting the Auth session itself requires a privileged Auth gateway; protected product access is still denied immediately by RLS.
- **Failure/fix loop:** no authorization bypass found. Privileged Auth-session revocation is explicitly not claimed.

## F20 — moderation audit log

- **Aim/scope:** retain who changed what, why and when.
- **Options:** immutable database table; ordinary application events; third-party audit service.
- **Weigh/rank:** dedicated table is queryable and transactional; ordinary events lack moderation constraints; third party adds cost. Rank table, events, third party.
- **Choice/build:** insert only through administrator-checked security-definer operations; authenticated admins can read.
- **Test/score:** audit history renders and anonymous function access returns HTTP 401. **10/10**.
- **Failure/fix loop:** an explicit `anon` grant inherited from platform defaults was found by direct probe and revoked in a forward migration.

## F21 — listing refresh flash/lag

- **Aim/scope:** prevent an unnecessary refresh from replacing cards while the user taps Save or opens a listing.
- **Options:** 30-second freshness guard; DOM-diffed background update; disable refresh.
- **Weigh/rank:** guard removes the duplicate boot request with minimal behavior change; DOM diff is stronger but larger; disabling refresh harms freshness. Rank guard, DOM diff, disable.
- **Choice/build:** focus/hash refresh skips inventory younger than 30 seconds.
- **Test/score:** previously detached controls remain stable through the focused and full regression. **10/10**.
- **Failure/fix loop:** identified from real browser detachment timeouts, fixed at the refresh source, then rerun.

## Individually evaluated future ideas

These ideas were not silently omitted. Each was evaluated and intentionally deferred from Stage 36:

| Idea | Options and rank | Decision and acceptance trigger |
|---|---|---|
| Saved-search alerts | database/email alerts; device-only saved query; no alerts. Rank device query, database alerts, none. | Defer build until search demand exists; begin with device-saved query, then email only after notification preferences and unsubscribe controls exist. |
| Collections | named collections; one Saved list; tags. Rank one list, named collections, tags. | Keep the working single Saved list for MVP; add collections when users regularly save enough listings to need organization. |
| Inspection planner | lister time slots; external calendar links; free-text messages. Rank messages, slots, calendar. | Keep messages until listers demonstrate scheduled-inspection demand. |
| Draw-search area | radius; freehand polygon; administrative areas. Rank radius, areas, freehand. | Keep the working location-gated radius; polygon editing adds mobile complexity without current evidence. |
| Property history/profile | owner-entered history; licensed data integration; no claim. Rank no claim, owner history, licensed integration. | Defer until a reliable source and correction process exist; Vacancy must not imply incomplete data is authoritative. |
| Direct provider health | ingest provider webhooks; poll dashboards; client errors only. Rank client errors, webhooks, polling. | Stage 36 labels only what Vacancy measures. Add webhooks when operating volume justifies incident integration. |
| Patent filing | patent attorney assessment; trade mark first; no protection. Rank trade mark/records/contracts, attorney assessment for a novel technical invention, no action. | No software feature is presented as patent protection. Preserve private source, access controls and dated records; assess the final brand separately. |

## Combined acceptance rule

Every built feature must pass its targeted check, then the existing desktop/mobile regression, then the same hosted gate. Any failed feature reopens only that feature and every dependent regression. Stage 36 cannot return to accepted status until this ledger, targeted checks, combined gate, checkpoint and hosted evidence all align.
