import express from "express";
import crypto from "crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerPageTools } from "./tools/pages.js";
import { registerPostTools } from "./tools/posts.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerPhotoTools } from "./tools/photos.js";
import { registerVideoTools } from "./tools/videos.js";
import { registerInsightTools } from "./tools/insights.js";
import { registerConversationTools } from "./tools/conversations.js";
import { registerInstagramTools } from "./tools/instagram.js";
import { registerReactionTools } from "./tools/reactions.js";
import { registerLeadGenTools } from "./tools/leadgen.js";
import { registerEventTools } from "./tools/events.js";
import { registerUserTools } from "./tools/user.js";
import { registerRatingTools } from "./tools/ratings.js";

const TOOL_COUNT = 71;

function createServer(): McpServer {
  const server = new McpServer({
    name: "facebook-mcp-server",
    version: "1.0.0",
  });

  registerPageTools(server);           // 8 tools
  registerPostTools(server);           // 10 tools
  registerCommentTools(server);        // 7 tools
  registerPhotoTools(server);          // 5 tools
  registerVideoTools(server);          // 4 tools
  registerInsightTools(server);        // 4 tools
  registerConversationTools(server);   // 5 tools
  registerInstagramTools(server);      // 12 tools
  registerReactionTools(server);       // 3 tools
  registerLeadGenTools(server);        // 4 tools
  registerEventTools(server);          // 4 tools
  registerUserTools(server);           // 3 tools
  registerRatingTools(server);         // 2 tools

  return server;
}

async function main() {
  const transport = process.env.TRANSPORT || "http";

  if (transport === "stdio") {
    const server = createServer();
    const t = new StdioServerTransport();
    await server.connect(t);
    console.error("Facebook MCP server running on stdio");
  } else {
    const app = express();
    app.use(express.json());

    // Store sessions: sessionId → { server, transport }
    const sessions = new Map<string, { server: McpServer; transport: StreamableHTTPServerTransport }>();

    // Health endpoint
    app.get("/health", (_req, res) => {
      res.json({
        status: "ok",
        server: "facebook-mcp-server",
        version: "1.0.0",
        tools: TOOL_COUNT,
        activeSessions: sessions.size,
      });
    });

    // MCP endpoint - stateful session handling
    app.post("/mcp", async (req, res) => {
      try {
        const sessionId = req.headers["mcp-session-id"] as string | undefined;

        if (sessionId && sessions.has(sessionId)) {
          const session = sessions.get(sessionId)!;
          await session.transport.handleRequest(req, res, req.body);
          return;
        }

        // New session
        const server = createServer();
        const t = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => crypto.randomUUID(),
        });

        const origSetHeader = res.setHeader.bind(res);
        res.setHeader = function (name: string, value: any) {
          if (name.toLowerCase() === "mcp-session-id" && typeof value === "string") {
            sessions.set(value, { server, transport: t });
            setTimeout(() => sessions.delete(value), 30 * 60 * 1000);
          }
          return origSetHeader(name, value);
        };

        await server.connect(t);
        await t.handleRequest(req, res, req.body);
      } catch (error) {
        console.error("Error handling MCP request:", error);
        if (!res.headersSent) {
          res.status(500).json({ error: "Internal server error" });
        }
      }
    });

    app.get("/mcp", async (_req, res) => {
      res.writeHead(405).end(JSON.stringify({ error: "Use POST for MCP requests" }));
    });

    app.delete("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (sessionId && sessions.has(sessionId)) {
        sessions.delete(sessionId);
        res.status(200).json({ message: "Session terminated" });
      } else {
        res.status(404).json({ error: "Session not found" });
      }
    });

    const PORT = parseInt(process.env.PORT || "3000", 10);
    app.listen(PORT, () => {
      console.log(`Facebook MCP server listening on port ${PORT}`);
      console.log(`Health: http://localhost:${PORT}/health`);
      console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
      console.log(`Tools registered: ${TOOL_COUNT}`);
    });
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
