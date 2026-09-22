# Stage 78 — listing flow consolidation

The proven create composer remains intact. The remaining monolithic edit form now uses the same progressive model: Property & location → Photos → Unit details → Pricing & availability → Save. Only one section opens at a time, required fields are checked before continuing, and property/unit descriptions remain optional. The existing save, media, map and ownership logic was retained rather than rewritten.

The selected approach ranked above a full rewrite and above retaining two visibly different journeys. It changes presentation only and keeps the tested mutation paths.

Acceptance score: security 9/10, correctness 9/10, usability 9/10, complexity 9/10. The targeted edit test plus the current Stage 73 listing journey gate passed **8/8**.

The older `guided-listing` suite expected Location to remain the first step and reported one failure. Diagnosis showed a stale harness expectation: the approved Stage 73 flow deliberately starts with Property, and its current acceptance test passed. Ranked fixes were (1) use the current Stage 73 gate and schedule removal of the stale assertion, (2) revert the product to the superseded location-first order, or (3) make the test accept either order. Option 1 preserves the approved product behavior and keeps the acceptance statement precise; no product code was changed to force a green result.
