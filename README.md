# Facebook MCP Server

A production-ready Model Context Protocol (MCP) server for the Facebook Graph API v25.0. Provides **71 tools** across 13 modules covering Facebook Pages, Posts, Comments, Photos, Videos, Insights, Conversations, Instagram, Reactions, Lead Generation, Events, User management, and Ratings.

**Version:** 1.0.0

## Tools (71 total)

### Pages (8 tools)
| Tool | Description |
|------|-------------|
| `get_page` | Get details of a Facebook Page by ID |
| `list_user_pages` | List Pages the authenticated user manages |
| `update_page` | Update a Facebook Page's information |
| `get_page_settings` | Get settings for a Facebook Page |
| `update_page_settings` | Update a setting for a Facebook Page |
| `search_pages` | Search for Facebook Pages by query |
| `subscribe_app` | Subscribe an app to a Page's webhooks |
| `get_page_tabs` | Get the tabs on a Facebook Page |

### Posts (10 tools)
| Tool | Description |
|------|-------------|
| `list_page_posts` | List posts from a Page's feed |
| `list_published_posts` | List only published posts by the Page |
| `list_scheduled_posts` | List scheduled (unpublished) posts |
| `create_post` | Create a new post on a Page |
| `create_photo_post` | Create a photo post on a Page |
| `get_post` | Get a specific post by ID |
| `update_post` | Update an existing post's message |
| `delete_post` | Delete a post |
| `list_visitor_posts` | List posts by visitors on a Page |
| `list_tagged_posts` | List posts the Page is tagged in |

### Comments (7 tools)
| Tool | Description |
|------|-------------|
| `list_comments` | List comments on a post or object |
| `create_comment` | Create a comment on a post or object |
| `get_comment` | Get a specific comment by ID |
| `update_comment` | Update an existing comment |
| `delete_comment` | Delete a comment |
| `hide_comment` | Hide a comment |
| `list_comment_replies` | List replies to a comment |

### Photos (5 tools)
| Tool | Description |
|------|-------------|
| `list_page_photos` | List photos uploaded to a Page |
| `get_photo` | Get details of a specific photo |
| `upload_photo` | Upload a photo to a Page from a URL |
| `delete_photo` | Delete a photo |
| `list_albums` | List photo albums on a Page |

### Videos (4 tools)
| Tool | Description |
|------|-------------|
| `list_page_videos` | List videos on a Page |
| `get_video` | Get details of a specific video |
| `list_live_videos` | List live videos on a Page |
| `create_video_post` | Create a video post from a URL |

### Insights (4 tools)
| Tool | Description |
|------|-------------|
| `get_page_insights` | Get Page-level insights/analytics |
| `get_post_insights` | Get insights for a specific post |
| `get_video_insights` | Get insights for a specific video |
| `get_page_fans_by_city` | Get Page fans broken down by city |

### Conversations (5 tools)
| Tool | Description |
|------|-------------|
| `list_conversations` | List Messenger conversations for a Page |
| `get_conversation` | Get details of a specific conversation |
| `list_messages` | List messages in a conversation |
| `get_message` | Get a specific message by ID |
| `send_message` | Send a message via Messenger |

### Instagram (12 tools)
| Tool | Description |
|------|-------------|
| `get_ig_user` | Get an Instagram Business/Creator account profile |
| `list_ig_media` | List media posts for an Instagram account |
| `get_ig_media` | Get details of a specific Instagram media post |
| `create_ig_media_container` | Create an Instagram media container (step 1) |
| `publish_ig_media` | Publish a media container (step 2) |
| `list_ig_comments` | List comments on an Instagram media post |
| `create_ig_comment` | Create a comment on Instagram media |
| `delete_ig_comment` | Delete an Instagram comment |
| `get_ig_insights` | Get Instagram account-level insights |
| `get_ig_media_insights` | Get insights for specific Instagram media |
| `ig_hashtag_search` | Search for an Instagram hashtag ID |
| `ig_business_discovery` | Look up another Instagram Business account |

### Reactions (3 tools)
| Tool | Description |
|------|-------------|
| `get_reactions` | Get reactions on a post or object |
| `list_shared_posts` | List posts that shared a given post |
| `get_likes` | Get likes on a post or object |

### Lead Generation (4 tools)
| Tool | Description |
|------|-------------|
| `list_leadgen_forms` | List lead generation forms for a Page |
| `get_leadgen_form` | Get details of a specific lead gen form |
| `get_leads` | Get leads submitted to a form |
| `get_lead` | Get a specific lead by ID |

### Events (4 tools)
| Tool | Description |
|------|-------------|
| `list_page_events` | List events for a Page |
| `create_event` | Create an event on a Page |
| `get_event` | Get details of a specific event |
| `update_event` | Update an existing event |

### User (3 tools)
| Tool | Description |
|------|-------------|
| `get_me` | Get the authenticated user's profile |
| `list_accounts` | List Pages the user manages |
| `debug_token` | Debug an access token metadata |

### Ratings (2 tools)
| Tool | Description |
|------|-------------|
| `list_page_ratings` | List ratings and reviews for a Page |
| `get_page_overall_rating` | Get a Page's overall star rating |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FB_PAGE_ACCESS_TOKEN` | Yes | — | Facebook Page Access Token |
| `FB_API_VERSION` | No | `v25.0` | Facebook Graph API version |
| `PORT` | No | `3000` | Server port |
| `TRANSPORT` | No | `http` | Transport mode (`http` or `stdio`) |

## Setup

### 1. Create a Facebook Developer App

1. Go to [developers.facebook.com](https://developers.facebook.com/)
2. Create a new app (Business type recommended)
3. Add the **Facebook Login** and **Pages API** products

### 2. Get a Page Access Token

1. In the App Dashboard, go to **Tools → Graph API Explorer**
2. Select your app and choose the Page you want to manage
3. Request these permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `pages_manage_metadata`
   - `pages_messaging`
   - `pages_read_user_content`
   - `pages_manage_engagement`
   - `instagram_basic`
   - `instagram_manage_comments`
   - `instagram_manage_insights`
   - `instagram_content_publish`
   - `leads_retrieval`
   - `read_insights`
4. Generate a **Page Access Token**
5. For a long-lived token, exchange it via the token debugger or API

### 3. Install & Run

```bash
npm install
npm run build
npm start
```

### 4. Test

```bash
# Health check
curl http://localhost:3000/health

# MCP request
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Deploy to Railway

1. Push to a GitHub repository
2. Connect the repo to [Railway](https://railway.app)
3. Set environment variables:
   - `FB_PAGE_ACCESS_TOKEN` — your Page access token
   - `FB_API_VERSION` — `v25.0` (optional)
4. Railway will auto-detect the `Procfile` and deploy

## Architecture

- **Express** HTTP server with session-aware MCP transport
- **13 tool modules** in `src/tools/`
- **Cursor-based pagination** on all list endpoints (`limit`, `after`, `before`)
- **Error handling** with `isError: true` on all tool failures
- **Health endpoint** at `/health`
- **MCP endpoint** at `/mcp` (POST for requests, DELETE for session cleanup)
