# Stage 98: Admin authenticator 405 repair

The Admin verification screen called GET /auth/v1/factors when the operator pressed Continue securely. Supabase uses that route for factor enrollment, so the factor-list request returned HTTP 405 before the code form could appear. The site's factor lookup now reads factors from the signed-in /auth/v1/user response, matching the Supabase client behavior. Enrollment, challenge, verification, MFA requirement, and icon-library permissions are unchanged.

Rollback point: checkpoint/stage98-admin-mfa-405-prebuild at c6a45db.

Validation: a browser regression test intercepts the old route with HTTP 405, verifies it is never called, and exercises Continue securely through the code-entry screen. The full local launch suite passed 108/108 on desktop and mobile. A real operator code cannot be entered without the operator's authenticator device, so that final step requires an operator check in the preview.
