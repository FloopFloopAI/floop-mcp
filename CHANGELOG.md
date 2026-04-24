# Changelog

All notable changes to `@floopfloop/mcp` are documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This package follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
