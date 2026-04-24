/**
 * MCP tool registrations. Each tool is a thin wrapper around an
 * @floopfloop/sdk resource method. Errors from the SDK are caught and
 * returned as `isError: true` tool results so the host can surface them.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { FloopClient, FloopError } from "@floopfloop/sdk";
import { z } from "zod";

export function registerTools(server: McpServer, floop: FloopClient): void {
  // ---------- projects ----------

  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description:
        "List all FloopFloop projects the authenticated user has access to. " +
        "Optionally scope to a team.",
      inputSchema: {
        teamId: z.string().optional().describe("Team id (uuid) to scope to"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    wrap(({ teamId }) => floop.projects.list(teamId ? { teamId } : {})),
  );

  server.registerTool(
    "get_project",
    {
      title: "Get a project",
      description:
        "Fetch a single project by id or subdomain. Returns the project's " +
        "url, status, and metadata.",
      inputSchema: {
        ref: z.string().describe("Project id (uuid) or subdomain"),
        teamId: z.string().optional().describe("Team id (uuid) if the project lives in a team"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    wrap(({ ref, teamId }) => floop.projects.get(ref, teamId ? { teamId } : {})),
  );

  server.registerTool(
    "project_status",
    {
      title: "Project build status",
      description:
        "Fetch the current build/deploy status for a project. Cheap — safe " +
        "to call in a polling loop.",
      inputSchema: {
        ref: z.string().describe("Project id (uuid) or subdomain"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    wrap(({ ref }) => floop.projects.status(ref)),
  );

  server.registerTool(
    "create_project",
    {
      title: "Create a project",
      description:
        "Create a new FloopFloop project from a natural-language prompt. " +
        "Build kicks off immediately. Call wait_for_live to block until the " +
        "site is up, or poll project_status.",
      inputSchema: {
        prompt: z.string().min(1).describe("Natural-language brief for the project"),
        name: z.string().optional(),
        subdomain: z.string().optional().describe("Override the auto-suggested subdomain slug"),
        botType: z.enum(["site", "app"]).optional().describe("Default is site"),
        isAuthProtected: z.boolean().optional(),
        teamId: z.string().optional(),
      },
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    wrap(({ prompt, ...rest }) => floop.projects.create({ prompt, ...rest })),
  );

  server.registerTool(
    "refine_project",
    {
      title: "Refine a project with a new instruction",
      description:
        "Send a refinement message to an existing project. Triggers a " +
        "follow-up build unless the backend decides it's a code-only edit.",
      inputSchema: {
        ref: z.string().describe("Project id or subdomain"),
        message: z.string().min(1).describe("What to change"),
        wait: z
          .boolean()
          .optional()
          .describe("If true, block until the follow-up build reaches live/failed/cancelled."),
      },
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    wrap(({ ref, message, wait }) => floop.projects.refine(ref, { message, wait })),
  );

  server.registerTool(
    "wait_for_live",
    {
      title: "Wait until a project is live",
      description:
        "Block (polling every 2 s) until the project reaches a terminal state. " +
        "Returns the final Project on success, an error result on build-failed " +
        "or build-cancelled.",
      inputSchema: {
        ref: z.string().describe("Project id or subdomain"),
        timeoutMs: z
          .number()
          .int()
          .positive()
          .max(30 * 60 * 1000)
          .optional()
          .describe("Max wait in ms. Defaults to 10 minutes."),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    wrap(async ({ ref, timeoutMs }) => {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), timeoutMs ?? 10 * 60 * 1000);
      try {
        return await floop.projects.waitForLive(ref, { signal: ac.signal });
      } finally {
        clearTimeout(timer);
      }
    }),
  );

  // ---------- subdomains ----------

  server.registerTool(
    "check_subdomain",
    {
      title: "Check subdomain availability",
      description: "Check whether a given subdomain slug is free.",
      inputSchema: {
        slug: z.string().min(1),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    wrap(({ slug }) => floop.subdomains.check(slug)),
  );

  server.registerTool(
    "suggest_subdomain",
    {
      title: "Suggest a subdomain from a prompt",
      description:
        "Ask the backend to generate a friendly subdomain slug based on a " +
        "natural-language prompt.",
      inputSchema: {
        prompt: z.string().min(1),
      },
      annotations: { readOnlyHint: true, idempotentHint: false },
    },
    wrap(({ prompt }) => floop.subdomains.suggest(prompt)),
  );

  // ---------- secrets ----------

  server.registerTool(
    "list_secrets",
    {
      title: "List a project's secrets",
      description:
        "List secret keys for a project. Values are never returned — only " +
        "names, because FloopFloop stores secrets one-way-encrypted.",
      inputSchema: {
        ref: z.string().describe("Project id or subdomain"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    wrap(({ ref }) => floop.secrets.list(ref)),
  );

  server.registerTool(
    "set_secret",
    {
      title: "Set a project secret",
      description: "Create or overwrite an environment secret on a project.",
      inputSchema: {
        ref: z.string().describe("Project id or subdomain"),
        name: z.string().min(1).describe("Secret key, e.g. STRIPE_SECRET_KEY"),
        value: z.string().min(1).describe("Secret value. Treat as sensitive."),
      },
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    wrap(({ ref, name, value }) => floop.secrets.set(ref, name, value)),
  );

  server.registerTool(
    "remove_secret",
    {
      title: "Remove a project secret",
      description: "Delete a secret from a project.",
      inputSchema: {
        ref: z.string().describe("Project id or subdomain"),
        name: z.string().min(1).describe("Secret key to delete"),
      },
      annotations: { destructiveHint: true, idempotentHint: true },
    },
    wrap(({ ref, name }) => floop.secrets.remove(ref, name)),
  );

  // ---------- account ----------

  server.registerTool(
    "whoami",
    {
      title: "Show the authenticated user",
      description: "Return the current user's id, email, and plan.",
      inputSchema: {},
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    wrap(() => floop.user.me()),
  );
}

/**
 * Wraps a tool implementation so successful results are returned as JSON
 * text content and errors (especially FloopError) surface as isError results
 * with the request id — letting the host display them to the user without
 * tearing down the MCP session.
 */
function wrap<Args>(
  impl: (args: Args) => unknown | Promise<unknown>,
): (args: Args) => Promise<CallToolResult> {
  return async (args: Args): Promise<CallToolResult> => {
    try {
      const value = await impl(args);
      return {
        content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
      };
    } catch (err) {
      const message =
        err instanceof FloopError
          ? `[${err.code}${err.status ? ` ${err.status}` : ""}] ${err.message}${err.requestId ? ` (request ${err.requestId})` : ""}`
          : err instanceof Error
            ? err.message
            : String(err);
      return {
        content: [{ type: "text", text: message }],
        isError: true,
      };
    }
  };
}
