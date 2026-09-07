# Stage 23 — iOS marketplace typography

## Aim and acceptance

Give Vacancy's mobile interface the compact, readable hierarchy used by Facebook Marketplace on iOS without copying Facebook branding or introducing a proprietary font. Preserve desktop typography, mobile containment, map readability, and every working product flow.

## Evidence and options

Current Marketplace screenshots use a native-looking compact sans-serif hierarchy with strong listing titles, clear prices, quieter metadata, and small navigation labels. Apple identifies SF Pro as the iOS system font and recommends system text styles, regular-to-semibold weights, and a limited hierarchy.

1. Native iOS system stack with explicit marketplace-scale roles — closest platform fit, no download, low complexity. **Rank 1.**
2. Download a visually similar open font — consistent across devices, but less native on iOS and adds payload. **Rank 2.**
3. Embed Facebook Sans — proprietary, unnecessary, and unsuitable. **Rank 3.**

Option 1 is the smallest safe choice.

## Type scale

- Page title: 24px / 750
- Section title: 20px / 700
- Listing title: 17px / 650
- Price and search: 16px / 600 and 400 respectively
- Controls and result count: 15px / 600–650
- Metadata: 13px / 400
- Bottom navigation: 12px / 400

The CSS begins with `-apple-system` and `BlinkMacSystemFont`, so iOS uses SF Pro without bundling it. Other platforms fall back to their native or familiar interface sans-serif. Desktop typography remains unchanged.

## Runtime proof

- Exact tested source: `2ca36fc`.
- Preview: `https://vacancy-be68ku2hy-tbond24s-projects.vercel.app`.
- Deployment: `dpl_23MukBCFAq5NfQ4EtoKfBtruGPeS`.
- Targeted computed-style proof confirmed the 16px search, 17px listing title, 16px price, 13px metadata, and 12px navigation roles.
- Complete hosted regression: **89 passed, 1 intentionally skipped**. The skipped case is the mobile-only typography assertion in the desktop browser project; it passed in the mobile project.
- The full responsive audit remained green at 390px and 320px with no horizontal overflow.
- Hosted mobile screenshot: `outputs/vacancy-stage23-ios-typography-preview.png`.
- Production remains unchanged.

## Score

- iOS platform fit: **10/10**
- Marketplace-style hierarchy: **9/10**
- Readability: **10/10**
- Existing-flow preservation: **10/10**
- Complexity control: **10/10**

Acceptance is met. The native stack deliberately avoids downloading or imitating Facebook's proprietary brand typeface.
