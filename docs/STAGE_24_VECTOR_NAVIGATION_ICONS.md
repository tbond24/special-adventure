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
