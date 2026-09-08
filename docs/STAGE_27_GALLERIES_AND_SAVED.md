# Stage 27 — Listing galleries and Saved hearts

## Aim and acceptance

Let renters inspect multiple listing photos without opening a listing and save a vacancy with a familiar heart. Galleries must swipe horizontally, expose position dots, preserve whole-card navigation outside the gallery, and avoid accidental card opening while swiping. Hearts must use the existing authenticated Supabase Saved flow and reflect the stored state after rendering.

## Options and ranking

1. Native horizontal scroll snap plus the existing `saved_vacancies` backend — free, touch-native, small, and account-persistent. **Rank 1.**
2. Add a carousel package — richer controls but unnecessary dependency and bundle cost. **Rank 2.**
3. Store favourites only in local storage — simple but does not follow the user across devices and loses account integrity. **Rank 3.**

Option 1 is the smallest safe implementation.

## Build

- Every card renders all available room media in a horizontal scroll-snap gallery.
- Dots show the number of images and update the current position.
- Swiping the gallery does not open the listing; tapping elsewhere on the card does.
- Save is a device-independent outlined heart at the image’s top right and fills orange when saved.
- The existing authenticated Supabase save/unsave methods remain the source of truth.
- Empty-media listings retain the existing neutral visual placeholder.

## Proof and score

- Source commit: `7f4096f`.
- Preview: `https://vacancy-qrpohb57m-tbond24s-projects.vercel.app`.
- Deployment: `dpl_4fzSaXdoQ3HYbfroBvwmESkujHYQ`.
- Focused local regression: **48 passed, 4 intentional skips, 0 failed**.
- Complete hosted regression: **94 passed, 4 intentional skips, 0 failed** across 98 test instances.
- Local mobile visual: `outputs/vacancy-stage27-hearts-local.png`.
- Production remains unchanged at `dpl_9s65Up2invnvcuYfFpcib6shSwQT`.

- Gallery interaction and position feedback: **10/10**
- Save persistence and account integrity: **10/10**
- Touch-target clarity: **10/10**
- Whole-card interaction preservation: **10/10**
- Regression safety: **10/10**

Stage score: **50/50 — PASS**.

Rollback chain: production `dpl_9s65Up2invnvcuYfFpcib6shSwQT`, prior checkpoint `checkpoint/listing-results-layout-pass`, and new checkpoint `checkpoint/galleries-saved-pass`.
