# Contributing to RedStone Replay

Thanks for helping make oracle payloads easier to understand. Small, evidenced improvements are welcome: clearer guides, reproducible public examples, accessibility fixes and focused code changes.

## Start here

1. Read the [community guide](docs/COMMUNITY_GUIDE.md) and [inspection boundaries](docs/ARCHITECTURE.md#trust-boundaries).
2. Search existing issues before opening a new one. Use the issue templates for bugs, examples and feature ideas.
3. For a broad feature or new network, describe the user need and technical approach in an issue before implementing it.

No coding is required to improve documentation or supply a useful public example.

## Development workflow

Fork the repository, create a descriptive branch, then run:

```bash
npm ci
npm run dev
```

Before opening a pull request:

```bash
npm test
npm run build
```

Use Node 22 or 24. Keep package-lock.json consistent with package.json. Avoid dependency changes that are unrelated to the problem being solved.

## What makes a good pull request

- Explain the concrete problem and the resulting behaviour.
- Keep the change focused and include a reproducible example when useful.
- Add meaningful regression coverage for parsing or API behaviour. A simple copy or spacing change usually needs visual verification rather than a redundant unit test.
- For UI changes, check desktop and narrow mobile layouts, keyboard navigation, visible focus and error states. Include a screenshot of the changed view.
- Preserve the difference between recovered signatures and authorised signers, descriptive medians and consumer aggregation, and decoded contents and execution outcomes.
- Cite primary sources for protocol claims. Label fixtures and assumptions explicitly.

Never add private keys, authentication tokens, deployment credentials, private RPC URLs or user-specific local paths. `.vercel/`, `.openai/`, environment files and dependencies are intentionally excluded from version control.

## Public transaction examples

A useful example includes its network, transaction hash, explorer URL, the steps to reproduce and a short description of what it demonstrates. Describe whether top-level decoding was confirmed. Do not infer consumer authorisation or final price use from a successful receipt alone.

## Respectful collaboration

Keep feedback specific to the work, assume good intent, and avoid spam, harassment or requests for private account information. Opening an issue or pull request starts a review; it does not imply that a proposed change has been accepted.

## Security reports

Do not post exploitable vulnerabilities or secrets in public issues. Follow [SECURITY.md](SECURITY.md).

Contributions are provided under the project’s [MIT license](LICENSE). Preserve third-party notices when copying or adapting external material.
