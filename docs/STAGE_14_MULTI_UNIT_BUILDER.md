# Stage 14 — multi-unit listing builder

## Aim and acceptance

A property starts with one unit and lets a lister add more units in the same workflow. Property facts remain outside the unit editors. Each unit has its own type, name, rent, currency, period, deposit, availability, occupancy, furnishing, ensuite, utilities, description and photos. Every vacancy must attach to the same property.

## Options considered

| Rank | Option | Value | Complexity / risk |
| --- | --- | --- |
| 1 | Reusable client-side unit editors using the existing secured property/unit functions | Delivers the requested workflow with no schema change | Sequential writes can partially complete; requires explicit recovery behavior |
| 2 | New database function accepting a JSON unit array in one transaction | Atomic batch creation | New privileged database surface and larger migration/test scope |
| 3 | Keep the existing one-unit-at-a-time flow | Lowest engineering effort | Does not deliver the requested plus-button workflow |

Option 1 is the smallest safe MVP change because the current schema and authorised unit function already model sibling units correctly. The submit button is disabled while saving. If a later unit fails, the app reports how many succeeded and immediately reloads the lister's saved inventory, preventing a retry from duplicating completed units. A transactional batch endpoint remains the scale-up option if partial failures appear in real use.

## Build

- One `Unit 1` editor appears by default for both new and existing properties.
- `+ Add another unit` clones an independently named unit editor.
- Extra units can be removed before publishing.
- Property location, facilities, rules and description remain outside the unit editors and are reused.
- A new property is created once. Its returned property ID is resolved, then every added unit uses the existing owner-checked sibling-unit function.
- Each unit's images are validated and uploaded against its own vacancy.
- Repeated submission is blocked while the batch is running.

## Runtime proof and score

- Desktop and mobile browser tests: 2/2 pass.
- Verified one editor by default, two after the plus action, independent names and values, one property-creation call, and a sibling call using the same property ID.
- Real Vercel-runtime browser proof returned: editor count `1`, then `2`; legends `Unit 1` and `Unit 2`; second editor field name `unit1_unitType`.
- JavaScript syntax and diff checks: pass.

Score: data organisation 10/10; requested workflow 10/10; recovery 8/10; usability 9/10; complexity 9/10; evidence 9/10. Stage score: **9.2/10 — PASS**.

## Rollback and status

Production remains unchanged. Return to checkpoint commit `16ea277` to remove this stage. The next isolated stage is the operations-focused admin dashboard.
