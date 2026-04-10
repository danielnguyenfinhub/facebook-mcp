import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fbFetch } from "../fb-client.js";

export function registerUserTools(server: McpServer): void {
  // 1. get_me
  server.tool(
    "get_me",
    "Get the authenticated user's profile information",
    {},
    async () => {
      try {
        const result = await fbFetch(`/me?fields=id,name,first_name,last_name,picture`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 2. list_accounts
  server.tool(
    "list_accounts",
    "List Pages the authenticated user manages (with access tokens)",
    {
      limit: z.number().optional().default(25).describe("Number of results (default 25)"),
      after: z.string().optional().describe("Pagination cursor (after)"),
      before: z.string().optional().describe("Pagination cursor (before)"),
    },
    async (params) => {
      try {
        const qs = new URLSearchParams();
        qs.set("fields", "id,name,access_token,category,tasks");
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await fbFetch(`/me/accounts?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 3. debug_token
  server.tool(
    "debug_token",
    "Debug an access token to see its metadata (app, user, permissions, expiry)",
    {
      input_token: z.string().describe("The access token to debug"),
    },
    async ({ input_token }) => {
      try {
        const result = await fbFetch(`/debug_token?input_token=${encodeURIComponent(input_token)}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
