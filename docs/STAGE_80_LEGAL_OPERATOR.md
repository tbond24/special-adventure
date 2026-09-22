# Stage 80 — legal operator readiness

The site now has one validated operator configuration used by Privacy and Terms. It renders only when all five owner-supplied facts exist, so Vacancy cannot accidentally publish invented company or jurisdiction details. Admin reports missing fields as an operational blocker.

Three approaches were compared: validated owner facts, placeholders, or removing the policies. Validated facts are the only safe option. The technical acceptance test proves both fail-closed and complete rendering. Final factual completion requires the owner's legal/registered name, service address, jurisdiction, privacy email and legal/support email.

Scores: security 10/10, correctness 10/10, usability 8/10, complexity 10/10. The remaining dependency is factual owner input, not implementation.

The first browser run found that the enhancement targeted an obsolete `.legal-page` class while the retained policy renderer uses `.information-page`. Ranked fixes were to change the base renderer, add an extra compatibility class, or correct the isolated selector. Correcting the isolated selector was smallest and avoided unrelated policy markup changes; the rerun passed.
