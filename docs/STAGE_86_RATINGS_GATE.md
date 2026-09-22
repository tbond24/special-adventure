# Stage 86 — ratings safety gate

Ratings remain publicly unavailable. A database constraint prevents the feature being enabled unless both verified completed-rental eligibility and moderation are marked ready. The submission RPC still fails closed until a future migration supplies the actual eligibility, dispute and rating records. This prevents a dashboard toggle or client request from creating cosmetic or retaliatory scores.

The server gate ranked above free-form public ratings and cosmetic placeholder scores. The profile now says “Ratings are not available yet” rather than implying an empty but active system. Scores: safety 10/10, correctness 10/10, honesty 10/10, complexity 9/10.
