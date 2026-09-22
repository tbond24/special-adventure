# Stage 83 — reusable owned media

Lister-owned photos are now available through a labelled picker in create and edit. The source query is constrained by existing owner RLS and an explicit owner check. Selection copies the image into the destination unit instead of sharing a mutable row or storage object, so reordering or deleting one listing cannot damage another.

Copy-on-reuse ranked above reference counting for the MVP because it avoids deletion coupling and a new asset graph. The tradeoff is duplicate storage, which Stage 82 now measures. Scores: security 9/10, correctness 9/10, usability 9/10, complexity 8/10.

The first targeted run timed out because its click looked only for a visible control while the Photos step was correctly closed. Ranked fixes were force-clicking hidden UI, opening every step, or following the user journey by opening Photos. The third option tests real behavior; no product change was made for the harness.
