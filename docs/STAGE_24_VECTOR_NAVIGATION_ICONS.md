# Stage 24 — Consistent vector navigation icons

## Aim and acceptance

Replace device-dependent emoji and Unicode navigation symbols with crisp, intuitive local vector icons. Use one coherent visual language across mobile and desktop, preserve visible labels and accessible names, provide clear selected states, and avoid a new runtime dependency.

## Research and options

Airbnb and Facebook Marketplace use simple icon-and-label tab bars. Apple recommends familiar scalable symbols, consistent size and visual weight, visible one-word labels, and emphasized selected states. Comparable mobile products generally use 24–26px symbols inside at least 44px touch targets.

1. Local inline SVG symbols — crisp, consistent, offline, and small. **Rank 1.**
2. Add Lucide or Heroicons as a package — coherent but unnecessary for four navigation items. **Rank 2.**
3. Continue with Unicode or an icon font — compact but inconsistent across platforms. **Rank 3.**

Option 1 is the smallest safe choice.

## Icon model

- Find: magnifying glass.
- Saved: heart outline, filled when selected.
- Inbox: message bubble outline, filled when selected.
- You: gender-neutral person outline, filled when selected.
- Theme: matching sun and moon vector icons.
- Mobile icons are 25px with a 2px rounded stroke inside a 56px minimum target.
- Desktop navigation reuses the same symbols at 18px beside its labels.
- Orange communicates the selected destination while text labels remain visible.

## Build, failure diagnosis, and fix

Source commit: `ac43cae`.

The first targeted interaction test failed when it selected Saved as an anonymous visitor. The product correctly redirected the protected action to sign-in, so the failure was in the test setup rather than the navigation behavior.

Fix options were ranked as follows:

1. Give the icon test its own isolated signed-in session state and exercise the real protected navigation — smallest and faithful. **Rank 1.**
2. Assert only the URL-selected state — useful but weaker interaction evidence. **Rank 2.**
3. Make Saved appear selected before authentication — changes correct product behavior. **Rank 3.**

Option 1 was applied. The targeted mobile test then passed without changing authentication behavior.

## Hosted runtime proof

- Preview: `https://vacancy-9j0r80a5u-tbond24s-projects.vercel.app`
- Vercel deployment: `dpl_Bj3KKuwYqSsgFT3ao8Q4q1T1upaz`
- Full hosted regression: **90 passed, 2 intentional desktop-only skips, 0 failed** across 92 test instances.
- Hosted mobile capture: `outputs/vacancy-stage24-nav-preview.png` at 390 × 844.
- Visual check: the four bottom destinations, selected orange Find state, and vector theme control render clearly without device emoji.

## Score

- Icon consistency: **10/10**
- Clarity and selected state: **10/10**
- Mobile sizing and touch targets: **10/10**
- Accessibility labels: **10/10**
- Regression safety: **10/10**

Stage score: **50/50 — PASS**.

## Rollback and release state

- Production remains unchanged at `dpl_9s65Up2invnvcuYfFpcib6shSwQT`.
- Earlier green Git rollback remains `checkpoint/ios-typography-production-live`.
- Stage 24 is checkpointed only after this hosted proof as `checkpoint/vector-navigation-icons-pass`.
- The prior production deployment `dpl_7hmb9mZqunE78yAkx1zY4fRXQtVA` remains an additional Vercel rollback baseline.
