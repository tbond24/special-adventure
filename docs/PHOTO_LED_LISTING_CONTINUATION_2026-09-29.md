# Photo-led listing continuation

This work stays on `experiment/photo-led-listing`; the production deployment remains unchanged until that branch is chosen for release. The preceding listing preview is commit `66326dd`.

## Scope

- Photo overlay controls, detail order, conditional descriptions, compact known room counts, green rent and optional former-rent comparison.
- Editable enquiry preset, recent-first inbox, participant identity and read state, mobile list-to-chat layout, and private photo messages.
- Seller overview on List, shared renter/seller navigation, and MFA-protected listing display checkboxes under Admin → Appearance.

## Data changes

Additive migrations: `20260928190430_listing_compare_price_and_display_options.sql`, `20260928191202_conversation_peer_summary.sql`, `20260928192158_bed_icon_slot.sql`, and `20260928193246_private_conversation_photos.sql`. Existing comparison prices are hidden and all existing display options remain enabled by default. Conversation photos use a private bucket with member-only read and upload policies.

## Rollback

The previous page remains in commit `66326dd` and the prior live deployment is unchanged. Reverting the branch to that commit restores the prior preview. Database columns, options, and the private bucket are additive; leave them in place during a UI rollback to avoid losing data. Do not delete the conversation-media bucket if messages have been sent.

## Verification limits

Automated browser tests use controlled accounts and data to verify the UI and calls. A real two-account send/read/photo exchange must still be performed in the preview; tests do not claim delivery to a real recipient. The backend migration and access settings were checked directly in Supabase.
