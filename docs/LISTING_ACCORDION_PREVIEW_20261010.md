# Listing accordion test branch

This branch is for preview testing only. It is not a production release.

## Baseline and scope

The branch was created from `main` at `e4676eff08d5adc46306d5152fb42be61bcb6c9f`, then fast-forwarded to the deployed release commit `fe928e9077e4a1c9f3809ea75287c7a5ca148b2a` before the feature changes. Main is an ancestor of that release, 163 commits behind it. The starting application tree is `abdb874689c333c8229252f4f584082a2d92a712`. This retains the deployed ownership, atomic-edit, money, authentication and fail-closed account deletion repairs. Main and the release branch are unchanged.

The feature replaces the separate location/details stages with five collapsible unit sections: Location and details, Photos, Description/features/amenities, Rent/deposit, and Availability. It retains initial property/type selection, multi-unit workflows, the actual form controls, data serializers, existing submit handlers, photo handling and device-local draft storage. Review and publication remain separate. Description and amenities are editable; there is no demo data or simulated save path. Done/Required text is right-aligned, with a 12px gap to the arrow. Editor typography uses system fonts, 26px title, 16px section headings and 16px/22px summaries, with form inputs at least 16px and unrestricted browser zoom.

No backend source, schema, migrations, authentication settings, or production aliases are changed. The optional previous-price editor remains under Rent and retains its separate save action.

## Data and authentication warning

The preview connects to the same Supabase project as production. A Git branch or Vercel preview does not create a separate database. Signing in and then publishing, changing a listing, removing an existing photo, or saving a former-price comparison can affect real data. The editor shows a visible reminder. Test-only synthetic requests and browser fixtures do not grant permission to publish real test listings.

Agent verification uses synthetic users, intercepted network requests and mocked backend boundaries. It does not prove genuine hosted OAuth/email login, Storage upload, account permissions, or authenticated writes. No real test listing was published and no live database/auth settings were changed.

## Reproduce

Install the locked dependencies and the Playwright Chromium browser:

```sh
npm ci
npx playwright install chromium --only-shell
node node_modules/@playwright/test/cli.js test --config=qa/listing-accordion/playwright.config.cjs
node --test tests/*.test.cjs tests/*.test.js
```

The accordion suite loads the existing automatic external-traffic guard. Its server binds only to localhost. Optional `VACANCY_BROWSER_EXECUTABLE` selects an already installed browser. Screenshots and traces go into ignored `test-results/`.

## Verification

- 17 isolated accordion browser tests passed, including new/existing create payloads, atomic edit, partial publication retry, duplicate/delete, native validation, keyboard, language switching, and Back/Save-and-exit restoring exact photo bytes.
- 58 existing desktop/mobile auth, account-deletion guard, guest-enquiry, map, admin and price-comparison regression checks passed. The current-editor price-comparison test navigates into the new Rent accordion; its behavioral assertions are unchanged.
- 38 existing unit/caller/API tests passed. JavaScript syntax and whitespace checks passed.
- Responsive checks covered 320px, 390px and 1440px browser viewports. These are not physical-device tests.
- The entire legacy launch suite was not run; this is a scoped preview, not a launch-readiness certification. Hosted authenticated writes are not verified.

## Rollback

Discard this test branch/preview to return to the unchanged production application. If revising this branch, revert only the accordion feature commit(s). Do not revert the deployed security or data repairs. There is no database migration to undo.
