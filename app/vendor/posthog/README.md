# PostHog browser SDK

Pinned `posthog-js` 1.438.13, `dist/array.no-external.js`, copied unmodified.
The adjacent LICENSE is copied from the same npm package.

Run `npm ci --ignore-scripts` then `npm run assets:posthog` at repository root
after deliberately updating the exact package version and lockfile. Review and
commit the generated asset and license together. No install hook runs this script.
The privacy browser suite checks byte equality against the installed package.

This local bundle avoids a runtime CDN dependency. It is loaded only after
separate development consent and an enabled nonproduction configuration. Its
external extensions, replay and automatic collection are disabled by the adapter.
