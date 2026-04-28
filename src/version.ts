/**
 * Single source of truth for the MCP server version at runtime.
 *
 * Used in three places: the User-Agent header sent to the FloopFloop API,
 * the `version` field of the McpServer instance, and the stderr "ready"
 * banner. Previously each was hand-typed in src/index.ts; alpha.3 → alpha.4
 * shipped with src/index.ts still pinned to alpha.3 because the bumper
 * forgot to update it. Same fix as the floop-cli `version.ts`.
 *
 * Bump this together with `package.json#version` on every release.
 */
export const CURRENT_VERSION = "0.1.0-alpha.6";
