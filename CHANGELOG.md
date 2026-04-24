# Changelog

All notable changes to `@floopfloop/mcp` are documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This package follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
