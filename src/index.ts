/**
 * FloopFloop MCP server (stdio transport).
 *
 * Exposes a curated subset of the @floopfloop/sdk surface as MCP tools so that
 * LLM hosts (Claude Desktop, Cursor, Zed, etc.) can build, poll, and refine
 * FloopFloop projects on behalf of the user.
 *
 * Auth is via the FLOOP_API_KEY env var. The host is expected to pass it in
 * when spawning this process — see the README for config snippets.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { FloopClient } from "@floopfloop/sdk";

import { registerTools } from "./tools.js";
import { CURRENT_VERSION as PACKAGE_VERSION } from "./version.js";

async function main(): Promise<void> {
  const apiKey = process.env.FLOOP_API_KEY;
  if (!apiKey) {
    process.stderr.write(
      "floop-mcp: FLOOP_API_KEY is not set. See https://github.com/FloopFloopAI/floop-mcp#configuration.\n",
    );
    process.exit(2);
  }

  const floop = new FloopClient({
    apiKey,
    baseUrl: process.env.FLOOP_API_URL,
    userAgent: `floop-mcp/${PACKAGE_VERSION}`,
  });

  const server = new McpServer(
    { name: "floop-mcp", version: PACKAGE_VERSION },
    {
      instructions:
        "Tools for building and refining FloopFloop projects. Call list_projects " +
        "to find a project's id or subdomain before refine/status calls. Status " +
        "polling takes a while — project_status is cheap to call; wait_for_live " +
        "blocks and is suitable for short builds only.",
    },
  );

  registerTools(server, floop);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr so the stdio transport's stdout stays clean.
  process.stderr.write(`floop-mcp ${PACKAGE_VERSION} ready (stdio)\n`);
}

main().catch((err: unknown) => {
  process.stderr.write(
    `floop-mcp fatal: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
