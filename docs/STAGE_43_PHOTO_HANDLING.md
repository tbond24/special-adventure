# Stage 43 — Listing photo handling

## Aim and acceptance

Let listers inspect, reorder, and remove selected photos before publication; retry temporary upload failures without creating duplicate units; and provide an Edit recovery path if uploads remain unavailable. Existing ownership and file limits must remain enforced.

## Options

| Rank | Option | Value | Complexity | Trade-off |
|---|---|---:|---:|---|
| 1 | Ordered selection UI, three upload attempts, publish once, recover from Edit | High | Low–medium | Handles the common failures without another service |
| 2 | Selection previews only | Medium | Low | Better UI but leaves the duplicate/recovery risk |
| 3 | Resumable upload manager/service | High | High | Strongest for poor networks, excessive before usage evidence |

Chosen: option 1.

## Build

- Added ordered photo selection with move earlier, move later, and remove controls.
- Kept file order in memory and uploaded that order.
- Retried a failed photo upload up to three times.
- Counted the vacancy as created before photo upload, preventing a retry from creating a duplicate unit.
- Kept the created vacancy and displayed a clear Edit recovery message after exhausted photo retries.
- Added photo upload to the existing Edit vacancy form.
- Made the multi-unit enhancer idempotent.

## Diagnose, rank, fix, repeat

The first targeted run failed in two ways:

1. Rebuilding the file input caused the rendered selection to disappear. Ranked fixes were an in-memory ordered list, replacing the file input, or a custom upload service. The in-memory list was selected.
2. Choosing an existing property initialized the multi-unit enhancer twice and produced two payloads. Ranked fixes were an idempotent guard, restructuring property selection, or deduplicating payloads. The guard was selected because it fixes the source.

The second run showed the label activating the file chooser when a reorder button was pressed. Ranked fixes were cancel label activation in the handler, move the controls outside the label, or redesign the picker. The focused event fix was selected.

## Runtime evidence and score

Targeted desktop/mobile tests after fixes: **8 passed, 0 failed**. These prove ordering/removal, exactly three upload attempts, exactly one created vacancy, Edit photo recovery, and room-owned media writes.

Full relevant regression: **98 passed, 18 intentional skips, 0 failed**.

Hosted preview `dpl_CL6zpnjCmEFSM9PtGcU7HyM4ENF1` at `https://vacancy-drsok1aaz-tbond24s-projects.vercel.app` was tested from the same commit. Hosted result: **98 passed, 18 intentional skips, 0 failed**. Production aliases were not changed.

| Area | Score |
|---|---:|
| Pre-upload control | 9/10 |
| Duplicate prevention for photo failure | 10/10 |
| Temporary failure handling | 9/10 |
| Recovery after exhausted retries | 8/10 |
| Regression safety | 10/10 |

The recovery path requires the lister to open Edit and select the photos again because browsers intentionally do not persist local file access.
