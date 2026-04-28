/**
 * Unit tests for the tool-registration layer. The stdio handshake itself is
 * covered by the CI smoke-test step; here we focus on:
 *
 *   1. `wrap()` — success/error result shapes, including FloopError formatting.
 *   2. `registerTools()` — every expected tool name is registered with a
 *      non-empty description and an inputSchema (basic sanity).
 */

import { describe, it, expect } from "vitest";
import { FloopClient, FloopError } from "@floopfloop/sdk";

import { wrap, registerTools } from "../src/tools.js";

describe("wrap", () => {
  it("serializes a successful result as pretty JSON text content", async () => {
    const handler = wrap(async (args: { n: number }) => ({ doubled: args.n * 2 }));

    const result = await handler({ n: 21 });

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    const [block] = result.content;
    expect(block?.type).toBe("text");
    expect(typeof block?.type === "string" && block.type === "text" && (block as { text: string }).text)
      .toBe('{\n  "doubled": 42\n}');
  });

  it("handles synchronous return values (non-Promise) from the impl", async () => {
    const handler = wrap((args: { who: string }) => `hi ${args.who}`);

    const result = await handler({ who: "world" });

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toBe('"hi world"');
  });

  it("marshalls a FloopError into an isError result with code/status/requestId", async () => {
    const err = new FloopError({
      code: "RATE_LIMITED",
      message: "slow down",
      status: 429,
      requestId: "req_abc",
    });
    const handler = wrap(async () => {
      throw err;
    });

    const result = await handler({});

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe("[RATE_LIMITED 429] slow down (request req_abc)");
  });

  it("formats a FloopError without a requestId cleanly (no trailing parens)", async () => {
    const err = new FloopError({
      code: "VALIDATION_ERROR",
      message: "bad input",
      status: 422,
    });
    const handler = wrap(async () => {
      throw err;
    });

    const result = await handler({});

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe("[VALIDATION_ERROR 422] bad input");
  });

  it("formats a FloopError without a status (status 0) cleanly", async () => {
    const err = new FloopError({ code: "NETWORK_ERROR", message: "boom", status: 0 });
    const handler = wrap(async () => {
      throw err;
    });

    const result = await handler({});

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe("[NETWORK_ERROR] boom");
  });

  it("maps a generic Error into an isError result with its message", async () => {
    const handler = wrap(async () => {
      throw new Error("kaboom");
    });

    const result = await handler({});

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe("kaboom");
  });

  it("stringifies non-Error thrown values", async () => {
    const handler = wrap(async () => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw "just a string";
    });

    const result = await handler({});

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe("just a string");
  });
});

describe("registerTools", () => {
  const EXPECTED_TOOLS = [
    "list_projects",
    "get_project",
    "project_status",
    "create_project",
    "refine_project",
    "wait_for_live",
    "cancel_project",
    "reactivate_project",
    "get_conversations",
    "check_subdomain",
    "suggest_subdomain",
    "list_secrets",
    "set_secret",
    "remove_secret",
    "list_library_projects",
    "clone_library_project",
    "usage_summary",
    "list_api_keys",
    "create_api_key",
    "remove_api_key",
    "upload_from_path",
    "whoami",
    "current_subscription",
  ] as const;

  it("registers exactly the expected 23 tools, each with a description and inputSchema", () => {
    const registered: Array<{ name: string; meta: Record<string, unknown> }> = [];
    const mockServer = {
      registerTool: (name: string, meta: Record<string, unknown>, _handler: unknown) => {
        registered.push({ name, meta });
      },
    };
    const mockClient = {} as FloopClient; // handlers aren't invoked in this test

    registerTools(mockServer as unknown as Parameters<typeof registerTools>[0], mockClient);

    expect(registered.map((t) => t.name).sort()).toEqual([...EXPECTED_TOOLS].sort());

    for (const tool of registered) {
      expect(tool.meta.description, `${tool.name} missing description`).toBeTruthy();
      expect(tool.meta.inputSchema, `${tool.name} missing inputSchema`).toBeTruthy();
    }
  });

  it("marks destructive secret-mutation tools with destructiveHint", () => {
    const registered: Array<{ name: string; meta: { annotations?: { destructiveHint?: boolean } } }> = [];
    const mockServer = {
      registerTool: (
        name: string,
        meta: { annotations?: { destructiveHint?: boolean } },
        _handler: unknown,
      ) => {
        registered.push({ name, meta });
      },
    };
    registerTools(
      mockServer as unknown as Parameters<typeof registerTools>[0],
      {} as FloopClient,
    );

    const byName = new Map(registered.map((t) => [t.name, t.meta]));
    expect(byName.get("set_secret")?.annotations?.destructiveHint).toBe(true);
    expect(byName.get("remove_secret")?.annotations?.destructiveHint).toBe(true);
    expect(byName.get("remove_api_key")?.annotations?.destructiveHint).toBe(true);
    expect(byName.get("cancel_project")?.annotations?.destructiveHint).toBe(true);
    // Read-only tool should not be marked destructive.
    expect(byName.get("list_projects")?.annotations?.destructiveHint).toBeUndefined();
    expect(byName.get("list_api_keys")?.annotations?.destructiveHint).toBeUndefined();
    expect(byName.get("usage_summary")?.annotations?.destructiveHint).toBeUndefined();
    expect(byName.get("get_conversations")?.annotations?.destructiveHint).toBeUndefined();
  });
});

function textOf(result: { content: Array<{ type: string } & Record<string, unknown>> }): string {
  const block = result.content[0];
  if (!block || block.type !== "text" || typeof (block as { text?: unknown }).text !== "string") {
    throw new Error(`expected text content, got ${JSON.stringify(block)}`);
  }
  return (block as { text: string }).text;
}
