# Google profile defaults — 6 October 2026

Scope: persist email-prefix name and Google photo as defaults using existing profiles fields. Initialise only empty fields after signed-in user lookup; existing nonempty fields are preserved. Conditional field updates preserve concurrent manual edits. Default failure does not prevent login; a later identity refresh retries empty fields. Profile photos use existing Google HTTPS lh*.googleusercontent.com URLs; no image import, new bucket, migration, provider change or schema change. Existing uploaded avatar paths continue working.

Shared avatar resolver is used by account, listing owner and chat photo rendering. No layout changes. Existing custom names, including a literal saved Vacancy member, take precedence. The previous account-name-only preview is included.

Verification: 6 synthetic backend tests (persistence/repeat login, custom values, independent fields, concurrent edits, non-Google/guest exclusion, URL safety); 26 desktop/mobile browser tests covering naming, loaded Google/uploaded fixture images and Google/recovery/signup callbacks. All passed. Syntax/diff checks passed. Real hosted Google profile writes and third-party photo availability remain unverified; production accounts untouched.

Rollback: rollback/before-google-profile-defaults-20261006 (0fd4b1a); source rollback alone would not reverse profile defaults saved after a future release. No production writes performed in tests. To restore code after live activation, retain remote-avatar rendering for any saved Google URLs. Do not clear user fields in bulk.
