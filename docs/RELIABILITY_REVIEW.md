# Reliability review — 19 October 2026

Scope: the payload inspector, transaction API, Field Guide, local state, robot navigation and production deployment. This records a focused functional review, not a guarantee that every possible defect has been eliminated or an independent security audit.

## Corrected in v1.1.1

| Reproduced problem | Result after the fix |
| --- | --- |
| The official parser can strip embedded zero bytes in feed identifiers or reorder observations before recovering a signature | The parsed representation must rebuild the exact original bytes before signer recovery. Encodings the parser cannot preserve are rejected. Canonical fixtures and binary unsigned metadata still work. |
| An even-sized set of observations lost half a raw unit through integer division | The descriptive median retains an exact `.5` where needed, including after display scaling, using BigInt arithmetic. |
| Editing a route opened from a shared link could revert to the old preferences on reload | Building a route updates the current URL using the same canonical preferences used for sharing. Starting an edit clears the stale shared preferences. |
| One malformed item in browser history could discard all valid entries | History is validated item by item, deduplicated and restricted to four supported transaction references. Unknown fields are discarded. |
| The empty-history explanation disappeared after a raw inspection | Both initial and updated sidebar rendering use the same empty state. |
| Playground text described every large spread as a single outlier | The explanation now describes the spread without assuming only one observation differs. |
| The inspector methodology dialog lacked an accessible name | The dialog references its visible heading. |

## Checks performed

- Thirty automated tests cover parser boundaries, exact signed-byte preservation, even medians, binary metadata, timing, malformed calldata, reference allowlists, damaged history, preference validation, time budgets, source review dates, draft generation and mocked API fallback/consistency.
- Browser checks cover desktop and 320px mobile widths, edited shared routes after reload, lesson feedback, robot actions, draft text escaping, local reset, invalid raw input, decimal validation, cancellation and successful decoding after errors.
- Production transaction lookup returned HTTP 200 with the correct chain context for one public transaction on each supported network: Ethereum, Base and Avalanche. This is a spot check; it does not guarantee public RPC availability.
- The production build and whitespace checks passed. CI runs the tests and build on Node 22 and 24.

## Known limits

The package audit reported **17 low-severity dependency entries**, with **zero moderate, high or critical entries**, at review time. These include the transitive [elliptic implementation advisory](https://github.com/advisories/GHSA-848j-6mx2-7j84). No forced major dependency migration was applied as part of these fixes. Counts may change as advisory data changes.

The inspector remains read-only and does not verify consumer authorisation or execution. Public RPC providers may fail or rate-limit requests. The Field Guide’s news is manually curated and its progress is local to the browser. Source-age badges do not update articles automatically.

For reporting a new problem, include a public reproduction and expected behaviour in the [issue templates](https://github.com/vlsss12/redstone-replay/issues/new/choose). Follow [SECURITY.md](../SECURITY.md) for private vulnerability reports.
