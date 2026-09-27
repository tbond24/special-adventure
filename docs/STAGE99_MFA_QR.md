# Stage 99: Authenticator QR rendering

Supabase returns the enrollment QR as raw SVG text. The setup screen had placed that text directly into an image URL, so the QR was broken. It now encodes the SVG as an image data URL. The manual setup key remains in a closed fallback panel.

The screenshot in this task exposed an unfinished setup key. On the next setup attempt, the app revokes old unverified factors before requesting a new one. If revocation fails, setup stops and shows the error. Closing a fresh setup also reports a revocation failure instead of hiding it.

Rollback point: checkpoint/stage99-mfa-qr-prebuild at 88a1fed.

Validation: browser tests on mobile and desktop confirm that raw SVG decodes into a visible image, the fallback key is initially hidden, stale unverified factors are revoked, and enrollment stops when revocation fails. The full local launch suite passed 112/112. A real authenticator scan and six-digit verification require the operator's device and remain to be checked on the preview.
