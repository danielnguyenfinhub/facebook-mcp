// Facebook MCP Client - Smart Token Management
// User token → auto-exchanges for page token on init
// Page operations use page token; Marketing API uses user token

const USER_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN || '';
const PAGE_ID = process.env.FACEBOOK_PAGE_ID || '';
const API_VERSION = process.env.FB_API_VERSION || 'v25.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

// Mutable - set during init()
let pageAccessToken = '';
let resolvedPageId = PAGE_ID;

// --- Token Exchange & Init ---

async function init(): Promise<{ pageId: string; pageName: string; scopes: string[] }> {
  if (!USER_TOKEN) throw new Error('FACEBOOK_ACCESS_TOKEN env var is required');

  // 1. Debug token to check scopes
  const scopes = await getTokenScopes();
  console.log(`[fb-client] Token scopes: ${scopes.join(', ')}`);

  // Warn about missing scopes
  const recommended = [
    'pages_read_engagement', 'pages_manage_posts', 'pages_read_user_content',
    'read_insights', 'pages_manage_metadata', 'ads_read', 'ads_management',
    'business_management', 'pages_messaging'
  ];
  const missing = recommended.filter(s => !scopes.includes(s));
  if (missing.length > 0) {
    console.warn(`[fb-client] ⚠️  Missing recommended scopes: ${missing.join(', ')}`);
  }

  // 2. Get page token via /me/accounts
  const accountsUrl = `${BASE_URL}/me/accounts?fields=id,name,access_token&access_token=${USER_TOKEN}`;
  const accountsRes = await fetch(accountsUrl);
  if (!accountsRes.ok) {
    const body = await accountsRes.text();
    throw new Error(`Failed to get page accounts: ${accountsRes.status} ${body}`);
  }
  const accountsData = await accountsRes.json() as any;
  const pages = accountsData.data || [];

  if (pages.length === 0) {
    console.warn('[fb-client] ⚠️  No pages found. Page operations will use user token (limited).');
    pageAccessToken = USER_TOKEN;
    return { pageId: resolvedPageId, pageName: '(none)', scopes };
  }

  // Find matching page or use first one
  let page = pages[0];
  if (PAGE_ID) {
    const match = pages.find((p: any) => p.id === PAGE_ID);
    if (match) {
      page = match;
    } else {
      console.warn(`[fb-client] ⚠️  Page ID ${PAGE_ID} not found in accounts. Using ${page.name} (${page.id})`);
    }
  }

  pageAccessToken = page.access_token;
  resolvedPageId = page.id;
  console.log(`[fb-client] ✅ Page token acquired for "${page.name}" (${page.id})`);

  return { pageId: page.id, pageName: page.name, scopes };
}

async function getTokenScopes(): Promise<string[]> {
  try {
    const url = `${BASE_URL}/debug_token?input_token=${USER_TOKEN}&access_token=${USER_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json() as any;
    return data.data?.scopes || [];
  } catch {
    return [];
  }
}

// --- Page API (uses page token) ---

async function fbFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = pageAccessToken || USER_TOKEN;
  const separator = path.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${path}${separator}access_token=${token}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Facebook API error ${res.status}: ${body}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

async function fbPost(path: string, body: Record<string, any>): Promise<any> {
  return fbFetch(path, { method: 'POST', body: JSON.stringify(body) });
}

async function fbDelete(path: string): Promise<any> {
  return fbFetch(path, { method: 'DELETE' });
}

// --- Marketing API (uses user token) ---

async function marketingFetch(path: string, options: RequestInit = {}): Promise<any> {
  const separator = path.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${path}${separator}access_token=${USER_TOKEN}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Facebook Marketing API error ${res.status}: ${body}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

async function marketingPost(path: string, body: Record<string, any>): Promise<any> {
  return marketingFetch(path, { method: 'POST', body: JSON.stringify(body) });
}

async function marketingDelete(path: string): Promise<any> {
  return marketingFetch(path, { method: 'DELETE' });
}

// --- Getters ---

function getPageId(): string {
  return resolvedPageId;
}

function getPageToken(): string {
  return pageAccessToken || USER_TOKEN;
}

// Backward compat exports
const PAGE_ACCESS_TOKEN = ''; // Deprecated - use getPageToken()
const MARKETING_TOKEN = USER_TOKEN;

export {
  init,
  fbFetch, fbPost, fbDelete,
  marketingFetch, marketingPost, marketingDelete,
  getPageId, getPageToken, getTokenScopes,
  PAGE_ACCESS_TOKEN, BASE_URL, MARKETING_TOKEN, USER_TOKEN, API_VERSION
};
