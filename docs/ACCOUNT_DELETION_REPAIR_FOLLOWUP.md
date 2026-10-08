# Account deletion: temporary safety guard and restoration gate

The owner approved temporarily disabling account deletion before releasing the other tested repairs. The prior flow could remove Storage files before Auth user deletion failed, leaving a partially deleted account.

## Temporary behavior

- Preserve the existing authenticated-user verification, CORS handling and POST endpoint.
- Return HTTP503 with `account_deletion_temporarily_unavailable` and a clear message before creating a service-role client or calling any Storage/Auth mutation.
- Show the unavailable state at the existing Account control; do not present a destructive confirmation for a disabled operation.
- An unavailable response must retain the current account/session and must never display an account-deleted success message.
- This is a temporary safety measure, not completion of the permanent deletion repair.

## Work required before re-enabling

1. Review all user-owned rows, Storage objects and foreign-key dependencies, including moderation/audit retention, using a synthetic fixture model. Obtain an explicit retention decision before changing audit ownership or erasing retained records.
2. Design an authenticated, ownership-checked, idempotent cleanup operation with a recorded progress state. Treat PostgreSQL, Storage and Auth as separate services; do not promise cross-service transaction rollback.
3. Ensure a failed step is retryable and cannot silently abandon an account after partial cleanup. Keep the visible outcome truthful and preserve enough state to retry safely.
4. Test each injected failure, retry, repeat request, partial Storage page, dependency constraint and denied caller in an isolated environment. Include a successful end-to-end completion test and existing session/token behavior.
5. Verify the deployed function and UI against the same reviewed source, then restore the control only after the deletion flow and failure paths pass.

No real customer account, message, listing or photo should be deleted to prove this flow. The temporary guard is deployed independently from the Vercel frontend and must be verified separately.
