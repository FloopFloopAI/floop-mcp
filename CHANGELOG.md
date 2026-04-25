# Changelog

All notable changes to `@floopfloop/mcp` are documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This package follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0-alpha.4] — 2026-04-25

### Added
- **`cancel_project` tool** — wraps `floop.projects.cancel(ref)`. Lets
  the LLM stop a queued or in-progress build (e.g. when the user
  realises they got the prompt wrong mid-deploy). Marked
  `destructiveHint: true` so hosts can gate behind user confirmation.
- **`reactivate_project` tool** — wraps `floop.projects.reactivate(ref)`.
  Resumes a previously cancelled or archived project, triggering a
  fresh build at the project's most recent prompt.
- **`get_conversations` tool** — wraps `floop.projects.conversations(ref, limit?)`.
  Returns the message timeline (user prompts, assistant responses,
  deploy markers, queued messages) so the LLM can read what's already
  been said before composing a refinement.

### Changed
- Total tool count now **22**. Unit test, CI smoke test, and release
  smoke test all bumped from 19 → 22.

## [0.1.0-alpha.3] — 2026-04-24

### Added
- **`upload_from_path` tool** — closes the Uploads gap deferred in
  0.1.0-alpha.2. The tool reads a file from the MCP host's local
  filesystem (Claude Desktop, Cursor, etc. all run with the user's
  working-directory permissions), presigns a slot via
  `floop.uploads.create`, PUTs to S3, and returns an
  `UploadedAttachment` that downstream `refine_project` calls can drop
  straight into its `attachments` array. Max 5 MB, extension allowlist
  matches the SDK (png / jpg / gif / svg / webp / ico / pdf / txt /
  csv / doc / docx). Use when the user references a screenshot / PDF /
  CSV by path in chat.
- Total tool count now **19**. Unit test, CI smoke test, and release
  smoke test all bumped from 18 → 19.

### Changed
- `PACKAGE_VERSION` + `package.json#version` bumped to `0.1.0-alpha.3`.

## [0.1.0-alpha.2] — 2026-04-24

### Added
- Six new tools covering the rest of the @floopfloop/sdk surface:
  - `list_library_projects`, `clone_library_project` (public library).
  - `usage_summary` (plan limits + current-period usage).
  - `list_api_keys`, `create_api_key`, `remove_api_key`
    (`remove_api_key` accepts id or human-readable name).
- Tool count now **18**. Unit test, CI smoke test, and release-workflow
  smoke test all updated to assert the new total.
- README tool table expanded to match.

### Changed
- `PACKAGE_VERSION` + `package.json#version` bumped to `0.1.0-alpha.2`.

### Not yet exposed
- `uploads.create` — MCP hosts can't easily pass a Buffer/Uint8Array
  payload across the stdio transport. Deferred until we wire a
  resource-attachment path through the protocol.

### Added (carried over from prior Unreleased)
- Vitest unit tests for the tool-registration layer covering `wrap`'s
  success/error result shapes (including FloopError code/status/requestId
  formatting with and without each field present) and `registerTools`'
  destructive-hint annotations. Run with `npm test`.
- CI and release workflows now run `npm test` before the build step.

## [0.1.0-alpha.1] — 2026-04-24

### Added
- Initial release. MCP server over stdio transport, wrapping the official
  [`@floopfloop/sdk`](https://github.com/FloopFloopAI/floop-node-sdk).
- 12 tools covering the core FloopFloop workflow:
  - Projects: `list_projects`, `get_project`, `project_status`,
    `create_project`, `refine_project`, `wait_for_live`.
  - Subdomains: `check_subdomain`, `suggest_subdomain`.
  - Secrets: `list_secrets`, `set_secret`, `remove_secret`.
  - Account: `whoami`.
- Errors from the SDK are marshalled into `isError: true` content results
  (with the request id when available) rather than protocol-level
  exceptions, so the host keeps the session alive.
- `FLOOP_API_KEY` env auth. `FLOOP_API_URL` override for staging / local.
- `npx -y @floopfloop/mcp` as the canonical invocation for Claude Desktop
  and Cursor config snippets.
