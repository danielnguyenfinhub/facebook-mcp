import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fbFetch, fbPost } from "../fb-client.js";

export function registerPageTools(server: McpServer): void {
  // 1. get_page
  server.tool(
    "get_page",
    "Get details of a Facebook Page by ID",
    {
      page_id: z.string().describe("The Page ID"),
    },
    async ({ page_id }) => {
      try {
        const fields = "id,name,about,category,fan_count,followers_count,link,website,phone,emails,location,hours,cover,picture,description,single_line_address,is_published,verification_status,rating_count,overall_star_rating";
        const result = await fbFetch(`/${page_id}?fields=${fields}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 2. list_user_pages
  server.tool(
    "list_user_pages",
    "List Pages the authenticated user manages",
    {
      limit: z.number().optional().default(25).describe("Number of results (default 25)"),
      after: z.string().optional().describe("Pagination cursor (after)"),
      before: z.string().optional().describe("Pagination cursor (before)"),
    },
    async (params) => {
      try {
        const qs = new URLSearchParams();
        qs.set("fields", "id,name,category,access_token,tasks");
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

  // 3. update_page
  server.tool(
    "update_page",
    "Update a Facebook Page's information",
    {
      page_id: z.string().describe("The Page ID"),
      about: z.string().optional().describe("About text"),
      description: z.string().optional().describe("Page description"),
      website: z.string().optional().describe("Website URL"),
      phone: z.string().optional().describe("Phone number"),
      hours: z.record(z.string()).optional().describe("Business hours object"),
    },
    async ({ page_id, ...fields }) => {
      try {
        const body: Record<string, any> = {};
        if (fields.about !== undefined) body.about = fields.about;
        if (fields.description !== undefined) body.description = fields.description;
        if (fields.website !== undefined) body.website = fields.website;
        if (fields.phone !== undefined) body.phone = fields.phone;
        if (fields.hours !== undefined) body.hours = fields.hours;
        const result = await fbPost(`/${page_id}`, body);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 4. get_page_settings
  server.tool(
    "get_page_settings",
    "Get settings for a Facebook Page",
    {
      page_id: z.string().describe("The Page ID"),
    },
    async ({ page_id }) => {
      try {
        const result = await fbFetch(`/${page_id}/settings`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 5. update_page_settings
  server.tool(
    "update_page_settings",
    "Update a setting for a Facebook Page",
    {
      page_id: z.string().describe("The Page ID"),
      setting: z.string().describe("Setting name"),
      value: z.boolean().describe("Setting value"),
    },
    async ({ page_id, setting, value }) => {
      try {
        const result = await fbPost(`/${page_id}/settings`, { option: { [setting]: value } });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 6. search_pages
  server.tool(
    "search_pages",
    "Search for Facebook Pages by query",
    {
      query: z.string().describe("Search query"),
      limit: z.number().optional().default(25).describe("Number of results (default 25)"),
      after: z.string().optional().describe("Pagination cursor (after)"),
      before: z.string().optional().describe("Pagination cursor (before)"),
    },
    async (params) => {
      try {
        const qs = new URLSearchParams();
        qs.set("q", params.query);
        qs.set("fields", "id,name,category,link,location");
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await fbFetch(`/pages/search?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 7. subscribe_app
  server.tool(
    "subscribe_app",
    "Subscribe an app to a Page's webhooks",
    {
      page_id: z.string().describe("The Page ID"),
      subscribed_fields: z.array(z.string()).describe("List of fields to subscribe to (e.g., feed, messages)"),
    },
    async ({ page_id, subscribed_fields }) => {
      try {
        const result = await fbPost(`/${page_id}/subscribed_apps`, { subscribed_fields });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 8. get_page_tabs
  server.tool(
    "get_page_tabs",
    "Get the tabs on a Facebook Page",
    {
      page_id: z.string().describe("The Page ID"),
    },
    async ({ page_id }) => {
      try {
        const result = await fbFetch(`/${page_id}/tabs`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
