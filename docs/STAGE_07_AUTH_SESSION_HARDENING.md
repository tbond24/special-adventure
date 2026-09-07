# Stage 7: auth and session hardening

Status: implementation in progress. Production unchanged.

## Aim and acceptance
Preserve a genuine signed-in session through reload and access-token expiry, reject malformed state safely, distinguish an invalid session from a temporary network failure, revoke the server session on sign-out, and leave no local identity after sign-out. Prove wrong-password, duplicate-email and protected-action behavior in the isolated Supabase environment. Account deletion is a separate proof step within this stage.

## Ranked implementation options
1. Extend the existing REST adapter with refresh-token rotation and server sign-out. Smallest compatible change, high launch value, moderate complexity. Chosen.
2. Migrate all authentication to supabase-js. Strong lifecycle primitives, but broad storage/API migration and larger regression surface.
3. Keep local-only sessions and require sign-in after expiry. Lowest code cost, unacceptable user experience and no server revocation on sign-out.

## Findings before implementation
The app stored Supabase refresh tokens but never used them. Any identity-check failure cleared local state, including network failures. Sign-out cleared only local storage. Malformed JSON was ignored but not removed. Runtime proof is required after the fixes.
