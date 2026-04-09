import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fbFetch, fbPost, fbDelete } from "../fb-client.js";

export function registerInstagramTools(server: McpServer): void {
  // 1. get_ig_user
  server.tool(
    "get_ig_user",
    "Get an Instagram Business/Creator account profile",
    {
      ig_user_id: z.string().describe("The Instagram User ID (from Facebook Page's connected IG account)"),
    },
    async ({ ig_user_id }) => {
      try {
        const result = await fbFetch(`/${ig_user_id}?fields=id,name,username,biography,followers_count,follows_count,media_count,profile_picture_url,website`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 2. list_ig_media
  server.tool(
    "list_ig_media",
    "List media posts for an Instagram account",
    {
      ig_user_id: z.string().describe("The Instagram User ID"),
      limit: z.number().optional().default(25).describe("Number of results (default 25)"),
      after: z.string().optional().describe("Pagination cursor (after)"),
      before: z.string().optional().describe("Pagination cursor (before)"),
    },
    async (params) => {
      try {
        const qs = new URLSearchParams();
        qs.set("fields", "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count");
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await fbFetch(`/${params.ig_user_id}/media?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 3. get_ig_media
  server.tool(
    "get_ig_media",
    "Get details of a specific Instagram media post",
    {
      media_id: z.string().describe("The Instagram Media ID"),
    },
    async ({ media_id }) => {
      try {
        const result = await fbFetch(`/${media_id}?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,children`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 4. create_ig_media_container
  server.tool(
    "create_ig_media_container",
    "Create an Instagram media container (step 1 of publishing). Use publish_ig_media to publish it.",
    {
      ig_user_id: z.string().describe("The Instagram User ID"),
      image_url: z.string().optional().describe("Public URL of the image (for IMAGE type)"),
      video_url: z.string().optional().describe("Public URL of the video (for VIDEO/REELS type)"),
      caption: z.string().optional().describe("Post caption"),
      media_type: z.enum(["IMAGE", "VIDEO", "REELS", "CAROUSEL_ALBUM"]).optional().describe("Media type"),
    },
    async ({ ig_user_id, image_url, video_url, caption, media_type }) => {
      try {
        const payload: Record<string, any> = {};
        if (image_url !== undefined) payload.image_url = image_url;
        if (video_url !== undefined) payload.video_url = video_url;
        if (caption !== undefined) payload.caption = caption;
        if (media_type !== undefined) payload.media_type = media_type;
        const result = await fbPost(`/${ig_user_id}/media`, payload);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 5. publish_ig_media
  server.tool(
    "publish_ig_media",
    "Publish a previously created Instagram media container (step 2 of publishing)",
    {
      ig_user_id: z.string().describe("The Instagram User ID"),
      creation_id: z.string().describe("The media container ID from create_ig_media_container"),
    },
    async ({ ig_user_id, creation_id }) => {
      try {
        const result = await fbPost(`/${ig_user_id}/media_publish`, { creation_id });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 6. list_ig_comments
  server.tool(
    "list_ig_comments",
    "List comments on an Instagram media post",
    {
      media_id: z.string().describe("The Instagram Media ID"),
      limit: z.number().optional().default(25).describe("Number of results (default 25)"),
      after: z.string().optional().describe("Pagination cursor (after)"),
      before: z.string().optional().describe("Pagination cursor (before)"),
    },
    async (params) => {
      try {
        const qs = new URLSearchParams();
        qs.set("fields", "id,text,username,timestamp,like_count,replies");
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await fbFetch(`/${params.media_id}/comments?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 7. create_ig_comment
  server.tool(
    "create_ig_comment",
    "Create a comment on an Instagram media post",
    {
      media_id: z.string().describe("The Instagram Media ID"),
      message: z.string().describe("Comment text"),
    },
    async ({ media_id, message }) => {
      try {
        const result = await fbPost(`/${media_id}/comments`, { message });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 8. delete_ig_comment
  server.tool(
    "delete_ig_comment",
    "Delete an Instagram comment",
    {
      comment_id: z.string().describe("The Instagram Comment ID"),
    },
    async ({ comment_id }) => {
      try {
        const result = await fbDelete(`/${comment_id}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 9. get_ig_insights
  server.tool(
    "get_ig_insights",
    "Get Instagram account-level insights. Metrics: impressions, reach, follower_count, email_contacts, phone_call_clicks, text_message_clicks, get_directions_clicks, website_clicks, profile_views.",
    {
      ig_user_id: z.string().describe("The Instagram User ID"),
      metrics: z.string().describe("Comma-separated metric names"),
      period: z.enum(["day", "week", "days_28", "month", "lifetime"]).optional().describe("Aggregation period"),
      since: z.string().optional().describe("Start date (YYYY-MM-DD or Unix timestamp)"),
      until: z.string().optional().describe("End date (YYYY-MM-DD or Unix timestamp)"),
    },
    async (params) => {
      try {
        const qs = new URLSearchParams();
        qs.set("metric", params.metrics);
        if (params.period) qs.set("period", params.period);
        if (params.since) qs.set("since", params.since);
        if (params.until) qs.set("until", params.until);
        const result = await fbFetch(`/${params.ig_user_id}/insights?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 10. get_ig_media_insights
  server.tool(
    "get_ig_media_insights",
    "Get insights for a specific Instagram media post",
    {
      media_id: z.string().describe("The Instagram Media ID"),
      metrics: z.string().describe("Comma-separated metric names (e.g., impressions,reach,engagement)"),
    },
    async ({ media_id, metrics }) => {
      try {
        const qs = new URLSearchParams();
        qs.set("metric", metrics);
        const result = await fbFetch(`/${media_id}/insights?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 11. ig_hashtag_search
  server.tool(
    "ig_hashtag_search",
    "Search for an Instagram hashtag ID",
    {
      query: z.string().describe("Hashtag to search for (without #)"),
      user_id: z.string().describe("The Instagram User ID (required for hashtag search)"),
    },
    async ({ query, user_id }) => {
      try {
        const qs = new URLSearchParams();
        qs.set("q", query);
        qs.set("user_id", user_id);
        const result = await fbFetch(`/ig_hashtag_search?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 12. ig_business_discovery
  server.tool(
    "ig_business_discovery",
    "Look up another Instagram Business/Creator account's public profile and recent media",
    {
      ig_user_id: z.string().describe("Your Instagram User ID"),
      username: z.string().describe("The target account's username to look up"),
    },
    async ({ ig_user_id, username }) => {
      try {
        const fields = `business_discovery.fields(id,username,name,biography,followers_count,media_count,media.limit(10){id,caption,media_type,permalink})`;
        const qs = new URLSearchParams();
        qs.set("fields", fields);
        qs.set("username", username);
        // business_discovery requires the username param in the fields
        const result = await fbFetch(`/${ig_user_id}?fields=business_discovery.fields(id,username,name,biography,followers_count,media_count,media.limit(10){id,caption,media_type,permalink})&username=${username}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
