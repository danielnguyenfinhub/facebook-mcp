# Facebook MCP — CLAUDE.md

## 1. Project Overview
TypeScript MCP server exposing Facebook Graph API tools for Finance Hub page management, ads, and Instagram.
Deployed on Railway at facebook-mcp-production-e8bd.up.railway.app/mcp.
Known issue: page ownership/portfolio conflict requiring Meta Business Support resolution.

## 2. Tech Stack
- Runtime: Node.js 18+
- Language: TypeScript
- Framework: MCP SDK (@modelcontextprotocol/sdk)
- Transport: Streamable HTTP
- Auth: Facebook User Access Token + Page Access Token
- Meta Pixel ID: 918675090966849
- Host: Railway (auto-deploy from main branch)
- Env vars: FB_ACCESS_TOKEN, FB_PAGE_ID, FB_AD_ACCOUNT_ID, PORT

## 3. Conventions
- Meta Pixel 918675090966849 must be in head of ALL HTML pages — not emails, not CRM
- Page ownership issue active — check Meta Business Suite before bulk post operations
- Social post format: Hook → Value → CTA → legal footer (ACL 573164)
- Three post types per campaign: (1) Informative/Authority (2) Promotional/Scarcity (3) Engaging/Unity
- No emojis in professional client comms — OK in social posts
- ASIC RG 234 applies to all ad copy — run compliance check before publishing
- Ad copy: never "free", "guaranteed", "best rate" — use compliant replacements
- Instagram posts: create_ig_media_container first, then publish_ig_media (2-step)

## 4. Files — Never Touch
- .env / .env.production
- railway.toml
- Any file containing FB_ACCESS_TOKEN or FB_AD_ACCOUNT_ID
