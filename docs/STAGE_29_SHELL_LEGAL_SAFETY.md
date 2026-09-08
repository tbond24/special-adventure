# Stage 29 — Loading, 404, legal and safety shell

## Aim and acceptance

Give users an intentional loading state, recover cleanly from unknown links, and make accurate product-specific privacy, terms, storage and safety information available from every normal page. Pages must describe current behavior, remain readable in both themes and at 320px, and avoid claims that the product cannot support.

## Options and ranking

1. Product-specific pages based on audited data flows — clear, accurate, free, and maintainable. **Rank 1.**
2. Generic policy templates — fast but likely inaccurate about private addresses, messages, providers and deletion. **Rank 2.**
3. Subscription compliance platform — useful at larger scale but premature and does not replace operational compliance. **Rank 3.**

Option 1 is the smallest safe implementation.

## Regulatory basis reviewed

- OAIC APP 1 guidance: a privacy policy should be clearly expressed, current, freely available and explain collection, purposes, access/correction, complaints and likely overseas disclosures.
- GDPR Article 13: collection notices identify the controller, contact, purposes and legal basis.
- ICO guidance: notices explain purpose, retention and sharing; non-essential browser storage needs agreement where PECR applies.
- Kenya ODPC guidance: data controllers/processors may have registration obligations that must be assessed for the operating entity.

## Build

- Branded animated Vacancy loading state with reduced-motion support.
- Unknown hashes render a useful 404 and working route back to Find.
- Global footer links to Privacy, Terms, Storage and Safety.
- Pages document account, listing, private/public location, Saved, messaging, reports, events, processors, deletion, marketplace limits, prohibited conduct and payment safety.
- Current browser storage is described; no advertising or cross-site tracking is claimed.

## Pre-production operational items

The operating entity, governing jurisdiction and a monitored privacy/legal contact must be confirmed before this version is promoted. The operator must also assess applicable Kenya ODPC registration and other local registration obligations. Policy text reduces ambiguity but cannot itself guarantee compliance or prevent legal claims.

## Failure loop

The first focused run passed 34 checks and failed two theme checks because the test accumulated competing dark and light initialization scripts in one browser page. Fixes ranked were setting the preference through the running page before navigation, opening a separate context for every combination, or weakening the assertion. The first option best mirrors real preference changes and was applied without changing product behavior.

The next run showed that fragment-only navigation does not reload the startup script, so changing storage alone cannot alter an already-rendered document. The test now calls the same theme setter used by the visible header control before navigating between information routes. This tests the real behavior and leaves product code unchanged.
