# Google callback recovery conflict — 6 October 2026

Root cause: recovery.js captures every token-bearing callback before boot consumes OAuth. Any non-signup callback was redirected to reset-password, removing Google tokens before the normal session handler could consume them.

Fix: recovery is entered only with type=recovery. Successful OAuth callbacks remain untouched for the existing normal session handler. Non-recovery auth errors go to the existing sign-in notice. Explicit recovery errors cannot be treated as valid recovery credentials. No provider settings, database, styles or other UI changes.

Tests: 10 Playwright passes across desktop/mobile, synthetic API responses with external requests intercepted. Google callback session saving, current-user resolution and reload; recovery token isolation and reset submission; signup confirmation; OAuth failure; invalid recovery/signup links. First run stopped because localhost server was unavailable; final run with server ready passed. Syntax and diff checks passed. Real Google account consent/return remains unverified; no credentials were requested or passwords changed in production.

Rollback: rollback/before-google-recovery-fix-20261006 (57e3b5e). Revert only this fix to preserve the earlier admin preview. No database recovery needed. Preview includes the previously requested admin fix; production unchanged.
