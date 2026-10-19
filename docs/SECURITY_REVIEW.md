# Focused security and reliability review

Review date: 2026-10-19. This records targeted checks and fixes for the inspector; it is not an independent security certification or a guarantee that no defects remain.

## Changes verified

| Area | Fix and boundary |
| --- | --- |
| Untrusted payload structure | Physical boundaries, package/observation counts and numeric value widths are checked before the official parser traverses them. Limits: 500 KB, 500 packages, 4096 observations and 32-byte numeric values. |
| Browser responsiveness | User input is decoded in a terminable worker with an eight-second deadline. Inspections expose a cancel control; transaction lookup has a 28-second client deadline. |
| Transaction references | Exact explorer hosts and transaction paths are required. Credential-bearing URLs, non-default ports, inherited object keys and unsupported chains are rejected. |
| RPC evidence | Transaction, receipt and block hashes/numbers must agree. Malformed calldata, invalid statuses, quantities and addresses are rejected. A second provider is tried after a stale pending response. |
| Resource bounds | One 11-second deadline per provider covers fetches and response bodies. RPC bodies are capped at 2 MB; API requests are capped at 3000 bytes. |
| Error handling | Internal/provider exceptions are not returned to visitors. Malformed HTTP bodies and unreadable service responses produce actionable errors. |
| Sharing and drafts | Share links preserve display scaling and omit unrelated URL parameters. Cleared reference timestamps stay cleared when changing tabs. |
| Rendering | Untrusted feed/metadata content is escaped. Browser verification used an HTML-shaped metadata string and confirmed no element or script execution. |
| Browser policy | Production responses include CSP, frame restrictions, MIME-sniffing protection and disabled camera/microphone/geolocation/payment permissions. Inline styles remain allowed for the interface’s generated styles; scripts and workers are restricted to this origin. |

## Verification

- Automated tests cover the official fixture, timestamp boundaries, scaling, invalid dates, input limits, parser traversal bounds, signer deduplication, explorer validation, RPC fallback, consistency checks and HTTP failures.
- Browser checks cover worker decoding, cancellation/recovery, literal rendering of hostile metadata, share-link scaling and removal of unrelated query data.
- A real confirmed Ethereum transaction was fetched using the hardened RPC checks.
- A production build is checked before deployment; production worker and policy checks are verified on the live app.

## Known limits

The current dependency audit reports low-severity transitive cryptography advisories in the official parser dependency tree; no medium, high or critical advisories were reported at review time. The `ws` override remains in place. Dependency state changes over time; rerun `npm audit` for a current view.

Fixed public RPC providers remain external trust and availability dependencies. These checks do not verify chain proofs, consumer configuration or EVM execution. No application-level distributed rate limiter or wallet signing is implemented. See [architecture boundaries](ARCHITECTURE.md#trust-boundaries) and [SECURITY.md](../SECURITY.md).
