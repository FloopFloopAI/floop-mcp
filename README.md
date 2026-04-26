# @floopfloop/mcp

[![npm version](https://img.shields.io/npm/v/@floopfloop/mcp?logo=npm)](https://www.npmjs.com/package/@floopfloop/mcp)
[![npm downloads](https://img.shields.io/npm/dm/@floopfloop/mcp?logo=npm)](https://www.npmjs.com/package/@floopfloop/mcp)
[![CI](https://img.shields.io/github/actions/workflow/status/FloopFloopAI/floop-mcp/ci.yml?branch=main&logo=github&label=ci)](https://github.com/FloopFloopAI/floop-mcp/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/node/v/@floopfloop/mcp?logo=node.js&logoColor=white)](https://nodejs.org)
[![License: MIT](https://img.shields.io/npm/l/@floopfloop/mcp)](./LICENSE)

Model Context Protocol server for the [FloopFloop](https://www.floopfloop.com) API — lets Claude Desktop, Cursor, Zed, and any other MCP-aware LLM host build, poll, and refine FloopFloop projects on the user's behalf.

Wraps the official [`@floopfloop/sdk`](https://www.npmjs.com/package/@floopfloop/sdk) and exposes a curated subset of its surface as MCP tools.

## Tools

| Tool                 | What it does                                      |
|----------------------|---------------------------------------------------|
| `list_projects`        | List every project you have access to             |
| `get_project`          | Fetch a project by id or subdomain                |
| `project_status`       | Cheap status snapshot — safe to poll              |
| `create_project`       | Kick off a new build from a natural-language prompt |
| `refine_project`       | Send a refinement message to an existing project  |
| `wait_for_live`        | Block until the project reaches a terminal state  |
| `cancel_project`       | Stop a queued or in-progress build                |
| `reactivate_project`   | Resume a cancelled / archived project             |
| `get_conversations`    | Read a project's message timeline (prompts + replies + deploy markers) |
| `check_subdomain`      | Is a given slug available?                        |
| `suggest_subdomain`    | Generate a friendly slug from a prompt            |
| `list_secrets`         | List secret keys on a project (names only)        |
| `set_secret`           | Create/overwrite a project secret                 |
| `remove_secret`        | Delete a project secret                           |
| `list_library_projects`| Browse the public project library                 |
| `clone_library_project`| Duplicate a library project into the user's account |
| `usage_summary`        | Plan limits + current-period credit / build / storage usage |
| `list_api_keys`        | List the user's API keys (never returns the raw secret) |
| `create_api_key`       | Mint a new API key — raw secret returned ONCE     |
| `remove_api_key`       | Revoke an API key by id or name                   |
| `upload_from_path`     | Read a local file, presign + upload to S3, return an attachment ref |
| `whoami`               | Show the authenticated user                       |

## Configuration

Grab an API key: `floop keys create mcp-host` (via the [floop CLI](https://github.com/FloopFloopAI/floop-cli)) or the dashboard → Account → API Keys. Business plan required to mint new keys.

The server reads `FLOOP_API_KEY` from the environment. Optionally override `FLOOP_API_URL` to point at staging.

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%AppData%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "floopfloop": {
      "command": "npx",
      "args": ["-y", "@floopfloop/mcp"],
      "env": { "FLOOP_API_KEY": "flp_..." }
    }
  }
}
```

Restart Claude Desktop; the tools show up under the 🔌 icon.

### Cursor

`~/.cursor/mcp.json` (or Cursor Settings → Tools & Integrations → MCP):

```json
{
  "mcpServers": {
    "floopfloop": {
      "command": "npx",
      "args": ["-y", "@floopfloop/mcp"],
      "env": { "FLOOP_API_KEY": "flp_..." }
    }
  }
}
```

### Generic MCP host

Any host that speaks the MCP stdio transport can run the server:

```bash
FLOOP_API_KEY=flp_... npx -y @floopfloop/mcp
```

## Install

The package is pulled in automatically via `npx -y @floopfloop/mcp` in the config snippets above. If you prefer a pinned install:

```bash
npm install -g @floopfloop/mcp
which floop-mcp
```

## Usage notes

- **`create_project`** starts a build right away. Follow up with `wait_for_live` (blocks) or `project_status` (poll) to know when it's up.
- **`wait_for_live`** defaults to a 10-minute ceiling (bounded by `timeoutMs`, capped at 30 min). Most builds finish in under two minutes.
- **`upload_from_path` → `refine_project`** is the canonical attachment flow: call `upload_from_path` with a local file, get back an `UploadedAttachment` (`{key, fileName, fileType, fileSize}`), then pass it as `attachments: [<that object>]` on `refine_project`. The LLM host's process needs read access to the file path; max 5 MB.
- **`refine_project` `codeEditOnly: true`** runs a 3-step in-place patch instead of a full 6-step rebuild and charges roughly half the credits — use it for copy edits, colour swaps, or typo fixes on a project that's already live. The backend won't promote a code-edit to a full refinement automatically, so prefer plain `refine_project` when the change actually needs redesign.
- **`cancel_project` → `reactivate_project`** is the abort/redo pattern. `cancel_project` is `destructiveHint: true`; hosts should confirm before calling it. `reactivate_project` triggers a fresh build at the project's most recent prompt.
- **`set_secret` / `remove_secret`** are marked `destructiveHint: true` — hosts may ask the user to confirm before they run.
- **`list_secrets`** only returns names, never values. Secret values cannot be retrieved once written; rotate them by re-setting.
- On failure, tools return an MCP `isError` content result rather than tearing down the session, so the host displays the error to the user.

## Development

```bash
git clone https://github.com/FloopFloopAI/floop-mcp.git
cd floop-mcp
npm install
npm run typecheck
npm run build

FLOOP_API_KEY=flp_... node dist/index.js
```

To smoke-test the stdio handshake without an LLM host:

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | FLOOP_API_KEY=flp_dummy node dist/index.js 2>/dev/null
```

## Releasing

`.github/workflows/release.yml` publishes to npm with provenance whenever
a tag matching `mcp-v*` is pushed. One-time setup before the first
release:

1. Create an **automation** npm token on the `@floopfloop` scope
   (publishes bypass 2FA by design when tokens are marked automation).
2. Add it as the repo secret `NPM_TOKEN`:
   ```bash
   gh secret set NPM_TOKEN --repo FloopFloopAI/floop-mcp
   # paste token when prompted — do NOT use --body, which can leak it to
   # shell history.
   ```
3. Tag + push:
   ```bash
   npm version 0.1.0-alpha.1 --no-git-tag-version  # if needed
   git tag mcp-v$(node -p "require('./package.json').version")
   git push --follow-tags
   ```

The workflow typechecks, builds, runs the stdio smoke test, verifies the
tag matches `package.json`, then publishes and cuts a GitHub Release
(prerelease, auto-generated notes).

## License

MIT
