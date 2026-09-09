# Stage 51 — inline listing inputs and image optimisation

## Decision

For rent, three options were compared: a compound row retaining native inputs; one sentence-like contenteditable field; or the existing stacked fields. The compound row ranked first because period, currency and amount remain independently validated while taking less space. Deposit uses one compact row. Minimum stay uses amount plus weeks/months/years and converts to the database's existing week value.

For images, client resize, server transformation and original-only storage were compared. Conservative client resize ranked first for the current architecture and cost. Images below 350 KB or already within 1920 px are unchanged. Larger images are orientation-aware through browser decoding, capped at 1920 px, encoded at 0.82 quality, and used only when the output is smaller. Any failure returns the original file.

## Runtime loop

The first run produced 44 passes and four failures. Two were the unrelated live-inventory theme check running against a local static server. Two exposed that moving the rent input out of its original label removed its accessible name. Ranked fixes were an explicit accessible name, visually hidden duplicate label or reverting the row. The explicit accessible name was the smallest correct fix.

The focused desktop/mobile input tests then passed 2/2. The full relevant guided-listing, management and hardening matrix excluding the unrelated hosted-inventory assertion passed **46/46**. No horizontal overflow, publication, draft, map-pin, multi-unit, photo-order or upload-ownership regression was introduced.

Score: compactness 9/10; validation 10/10; mobile containment 10/10; image failure safety 10/10; performance value 8/10. Stage score: **9.4/10**.
