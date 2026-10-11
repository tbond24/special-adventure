# Route scroll regression coverage

Run from the repository root:

```sh
npx playwright test --config qa/navigation-scroll/playwright.config.cjs
```

The config serves the real `app/` shell on loopback port 8790. It reuses the
fully intercepted account-draft synthetic cloud, blocks external requests and
WebSockets, and runs Chromium desktop plus Pixel 7 mobile emulation. No hosted
backend data is read or written. Public listing direct-link coverage mirrors
the production endpoint's `<base href="/">` injection using the local shell.

## Confirmed baseline problem

- Terms at window scrollY 600 → You: desktop opened at 510; mobile at 447.
- Returning to a delayed You renderer restored against its short loading
  layout, losing the earlier 300px browsing position.
- The router discarded async renderer promises. Some renderers reset to top
  themselves, while others inherited the outgoing route's scroll.

## Scoped repair

The router now returns the existing renderer result. The final route wrapper
waits for that result and two animation frames, then applies one position for
that history entry. Fresh entries start at zero; Back/Forward restore their
own coordinates, including repeat visits to the same URL. Scroll positions
are kept in memory and persisted to namespaced history state for reloads.
Input/scroll interaction cancels a pending adjustment. A newer route invalidates
an older completion. No mutation-driven reset, form logic, authentication logic,
database behavior, or design changes are included in this repair.

## Coverage

New account/dashboard/inbox routes; delayed async Back/Forward; rapid navigation
with late success and failure; interaction before completion; keyboard hash
links; clean listing pushState and direct deep links; in-page location scrolling;
listing step navigation; validation focus; and unrelated same-page mutations.

Results: 18 unique cases; 36/36 passed with `--repeat-each=2` on 2026-10-11.
This is browser emulation, not a physical-device or Safari/WebKit run.
