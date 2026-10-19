# Security

## Reporting a vulnerability

Use [GitHub’s private vulnerability reporting form](https://github.com/vlsss12/redstone-replay/security/advisories/new) for a suspected vulnerability. Include the affected version/commit, reproduction steps, likely impact and a minimal proof of concept. Do not include real private keys or unrelated personal data.

Please avoid public exploit reports while the issue is being assessed. This community project does not promise a response deadline or offer a bug bounty.

## Intended security boundaries

Replay is a read-only payload inspection utility. It does not handle private keys, sign transactions, connect wallets or execute submitted calldata. Raw calldata is parsed in the browser. The transaction API accepts public references and uses fixed RPC endpoints rather than caller-controlled URLs.

It is not a consumer validator or a security audit. Recovered signatures do not establish authorised signers, accepted aggregation or downstream price use. Read [the trust boundaries](docs/ARCHITECTURE.md#trust-boundaries).

## Dependency context

The official protocol parser is pinned at `1.0.0`. A package override selects `ws` `8.21+` to address the advisories detected during initial verification. The audit at that time still reported low-severity transitive cryptography advisories in the parser dependency tree. No private-key signing workflow is implemented by this project.

Run `npm audit` against the current lockfile when reviewing dependency changes. Do not suppress advisories or apply a forced breaking upgrade without checking parser compatibility and rerunning the tests. Dependabot is configured for monthly npm and GitHub Actions updates.

Only the current main branch is maintained; there is no promised support schedule for older copies.
