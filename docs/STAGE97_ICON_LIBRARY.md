# Stage 97: Admin icon library

## Scope and choice
The site already uses a shared, 34-icon SVG sprite. Editing the shared slot is simpler than a page builder: a single change reaches every use of that icon. The library supports choosing another built-in icon or uploading a path-only 24 × 24 SVG. Raw SVG markup, scripts, external images, and animations are never saved.

## Safeguards
- Pre-change Git branch: `checkpoint/stage97-icon-library-prebuild` at `41b428d`.
- The original icon is kept in the app and can be restored from Admin. Each save has a timestamped revision, including restores.
- Public icon overrides are read-only. Writes use one function requiring both an admin account and authenticator level AAL2. Direct table writes are denied.
- If the icon API fails, the original icons remain visible.
- The database migration is additive and has no existing icon overrides.

## Verification
- Focused browser checks: desktop and mobile icon save, restore, and admin MFA gate.
- Launch suite: 106/106 passed against the local app on 2026-09-27.
- Supabase check: 34 slots, row-level security enabled, anonymous write denied, direct authenticated update denied, anonymous save function denied.
- The additive schema migration was applied to the production Supabase project. No live-site frontend deployment was made.

## Follow-up boundary
This edits only existing shared icon slots. Labels, layouts, motion icons, and a visual page builder are separate ideas and are not included.

