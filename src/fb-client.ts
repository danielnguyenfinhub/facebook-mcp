// Facebook MCP Client - Smart Token Management
//
// Handles the three common token headaches:
//   1. Short-lived tokens (Graph API Explorer hands out ~1h tokens) are
//      auto-exchanged for long-lived (~60d) tokens when FB_APP_ID and
//      FB_APP_SECRET are set.
//   2. Page access tokens are acquired from /me/accounts and cached; if the
//      cached token ever returns an OAuth 190 ("expired") error, init() is
//      re-run automatically once per request.
//   3. Token metadata (type, scopes, expiry) is surfaced in startup logs and
//      the /health endpoint so stale tokens are visible before they break.

import crypto from "crypto";

// --- Env vars (support multiple names for compatibility with older READMEs) ---

const USER_TOKEN_ENV =
  process.env.FACEBOOK_ACCESS_TOKEN ||
  process.env.FB_PAGE_ACCESS_TOKEN ||
  process.env.FB_ACCESS_TOKEN ||
  '';
const PAGE_ID =
  process.env.FACEBOOK_PAGE_ID ||
  process.env.FB_PAGE_ID ||
  '';
const APP_ID =
  process.env.FB_APP_ID ||
  process.env.FACEBOOK_APP_ID ||
  '';
const APP_SECRET =
  process.env.FB_APP_SECRET ||
  process.env.FACEBOOK_APP_SECRET ||
  '';
const API_VERSION = process.env.FB_API_VERSION || 'v25.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

// --- Mutable token state (updated by init() and auto-refresh) ---

let userAccessToken = USER_TOKEN_ENV;
let pageAccessToken = '';
let resolvedPageId = PAGE_ID;
let tokenExpiresAt: number | null = null; // epoch seconds; 0 = never expires
let lastInitAt = 0;
const REINIT_COOLDOWN_MS = 30_000;

export interface TokenStatus {
  pageId: string;
  pageName: string;
  scopes: string[];
  tokenType: string;
  expiresAt: number | null;
  expiresIn: number | null;
  longLivedExchange: 'success' | 'skipped' | 'failed';
}

// --- Init ---

async function init(): Promise<TokenStatus> {
  if (!userAccessToken) {
    throw new Error(
      'FACEBOOK_ACCESS_TOKEN (or FB_PAGE_ACCESS_TOKEN) env var is required'
    );
  }

  // 1. Exchange short-lived → long-lived if app credentials available.
  let longLivedExchange: 'success' | 'skipped' | 'failed' = 'skipped';
  if (APP_ID && APP_SECRET) {
    try {
      const exchanged = await exchangeForLongLivedToken(userAccessToken);
      if (exchanged && exchanged !== userAccessToken) {
        userAccessToken = exchanged;
        longLivedExchange = 'success';
        console.log('[fb-client] \u2705 Exchanged token for long-lived (~60-day) user token');
      } else {
        longLivedExchange = 'success';
      }
    } catch (e: any) {
      longLivedExchange = 'failed';
      console.warn(`[fb-client] \u26A0\uFE0F  Long-lived exchange failed: ${e.message}`);
    }
  } else {
    console.warn(
      '[fb-client] \u2139\uFE0F  FB_APP_ID/FB_APP_SECRET not set \u2014 skipping long-lived exchange. ' +
        'Set them to auto-extend short-lived tokens (~1h) into long-lived (~60d) tokens.'
    );
  }

  // 2. Inspect the (possibly upgraded) token: scopes, type, expiry.
  const debug = await debugToken(userAccessToken);
  const scopes: string[] = debug?.scopes || [];
  const tokenType: string = debug?.type || 'UNKNOWN';
  const expiresAt: number = debug?.expires_at ?? 0;
  const dataAccessExpiresAt: number = debug?.data_access_expires_at ?? 0;
  const isValid: boolean = debug?.is_valid !== false;
  tokenExpiresAt = expiresAt || null;

  if (!isValid) {
    console.error(
      `[fb-client] \u274C debug_token reports token is INVALID: ${JSON.stringify(debug?.error || {})}`
    );
  }

  if (scopes.length > 0) {
    console.log(`[fb-client] Token scopes: ${scopes.join(', ')}`);
  }

  const now = Math.floor(Date.now() / 1000);
  if (expiresAt === 0) {
    console.log('[fb-client] \u2705 Token never expires');
  } else {
    const secondsLeft = expiresAt - now;
    const days = Math.round(secondsLeft / 86400);
    console.log(
      `[fb-client] Token expires in ~${days} day(s) (${new Date(expiresAt * 1000).toISOString()})`
    );
    if (secondsLeft < 3600) {
      console.warn(
        '[fb-client] \u26A0\uFE0F  Token expires in less than 1 hour. It is almost certainly a short-lived token. ' +
          'Set FB_APP_ID + FB_APP_SECRET so the server can auto-exchange it for a 60-day long-lived token.'
      );
    } else if (secondsLeft < 86400) {
      console.warn('[fb-client] \u26A0\uFE0F  Token expires in less than 24 hours.');
    }
  }
  if (dataAccessExpiresAt && dataAccessExpiresAt < now) {
    console.warn(
      '[fb-client] \u26A0\uFE0F  data_access_expires_at has already passed \u2014 the user must re-authorize the app.'
    );
  }

  const recommended = [
    'pages_read_engagement',
    'pages_manage_posts',
    'pages_read_user_content',
    'read_insights',
    'pages_manage_metadata',
    'ads_read',
    'ads_management',
    'business_management',
    'pages_messaging',
  ];
  const missing = recommended.filter((s) => !scopes.includes(s));
  if (scopes.length > 0 && missing.length > 0) {
    console.warn(`[fb-client] \u26A0\uFE0F  Missing recommended scopes: ${missing.join(', ')}`);
  }

  // 3. Get a Page access token via /me/accounts (user tokens only).
  //    If the provided token IS already a Page token, /me/accounts returns an
  //    error \u2014 we detect that and use the token directly.
  const isPageToken = /page/i.test(tokenType);
  if (isPageToken) {
    console.log('[fb-client] \u2139\uFE0F  Provided token is a Page token \u2014 using directly');
    pageAccessToken = userAccessToken;
    lastInitAt = Date.now();
    return {
      pageId: resolvedPageId,
      pageName: '(page-token)',
      scopes,
      tokenType,
      expiresAt: tokenExpiresAt,
      expiresIn: expiresAt ? expiresAt - now : null,
      longLivedExchange,
    };
  }

  const accountsQs = new URLSearchParams({
    fields: 'id,name,access_token',
    access_token: userAccessToken,
  });
  const proof = appsecretProof(userAccessToken);
  if (proof) accountsQs.set('appsecret_proof', proof);
  const accountsRes = await fetch(`${BASE_URL}/me/accounts?${accountsQs}`);

  if (!accountsRes.ok) {
    const body = await accountsRes.text();
    throw new Error(`Failed to get page accounts: ${accountsRes.status} ${body}`);
  }
  const accountsData = (await accountsRes.json()) as any;
  const pages = accountsData.data || [];

  if (pages.length === 0) {
    console.warn(
      '[fb-client] \u26A0\uFE0F  No pages found on this user. Page operations will use the user token (limited).'
    );
    pageAccessToken = userAccessToken;
    lastInitAt = Date.now();
    return {
      pageId: resolvedPageId,
      pageName: '(none)',
      scopes,
      tokenType,
      expiresAt: tokenExpiresAt,
      expiresIn: expiresAt ? expiresAt - now : null,
      longLivedExchange,
    };
  }

  let page = pages[0];
  if (PAGE_ID) {
    const match = pages.find((p: any) => p.id === PAGE_ID);
    if (match) {
      page = match;
    } else {
      console.warn(
        `[fb-client] \u26A0\uFE0F  Page ID ${PAGE_ID} not found in accounts. Using ${page.name} (${page.id})`
      );
    }
  }

  pageAccessToken = page.access_token;
  resolvedPageId = page.id;
  lastInitAt = Date.now();
  console.log(`[fb-client] \u2705 Page token acquired for "${page.name}" (${page.id})`);

  return {
    pageId: page.id,
    pageName: page.name,
    scopes,
    tokenType,
    expiresAt: tokenExpiresAt,
    expiresIn: expiresAt ? expiresAt - now : null,
    longLivedExchange,
  };
}

// --- Token helpers ---

async function exchangeForLongLivedToken(token: string): Promise<string | null> {
  const qs = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: APP_ID,
    client_secret: APP_SECRET,
    fb_exchange_token: token,
  });
  const res = await fetch(`${BASE_URL}/oauth/access_token?${qs}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${body}`);
  }
  const data = (await res.json()) as any;
  return data.access_token || null;
}

async function debugToken(token: string): Promise<any | null> {
  try {
    // Per Facebook docs, the access_token for /debug_token should ideally be
    // an app access token (APP_ID|APP_SECRET). Fall back to the token itself
    // only if app credentials are not available.
    const accessParam = APP_ID && APP_SECRET ? `${APP_ID}|${APP_SECRET}` : token;
    const qs = new URLSearchParams({
      input_token: token,
      access_token: accessParam,
    });
    const res = await fetch(`${BASE_URL}/debug_token?${qs}`);
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    return data.data || null;
  } catch {
    return null;
  }
}

async function getTokenScopes(): Promise<string[]> {
  const d = await debugToken(userAccessToken);
  return d?.scopes || [];
}

function appsecretProof(token: string): string {
  if (!APP_SECRET || !token) return '';
  return crypto.createHmac('sha256', APP_SECRET).update(token).digest('hex');
}

function isOAuthExpiredError(body: string, status: number): boolean {
  if (status !== 400 && status !== 401 && status !== 403) return false;
  try {
    const parsed = JSON.parse(body);
    const err = parsed?.error;
    if (!err) return false;
    // Facebook's token-expiry error is code 190 (OAuthException).
    // Sub-codes 463 (expired), 467 (invalid), and a few others indicate the
    // token specifically needs to be refreshed.
    if (err.code === 190) return true;
    if (err.type === 'OAuthException' && /expir|invalid|session/i.test(err.message || '')) {
      return true;
    }
    return false;
  } catch {
    return /OAuthException|expired|invalid.*token|Session has expired/i.test(body);
  }
}

// --- Page API (uses page token, auto-refreshes on expiry) ---

async function fbFetch(
  path: string,
  options: RequestInit = {},
  _retry = false
): Promise<any> {
  const token = pageAccessToken || userAccessToken;
  const separator = path.includes('?') ? '&' : '?';
  let url = `${BASE_URL}${path}${separator}access_token=${encodeURIComponent(token)}`;
  const proof = appsecretProof(token);
  if (proof) url += `&appsecret_proof=${proof}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    if (
      !_retry &&
      isOAuthExpiredError(body, res.status) &&
      Date.now() - lastInitAt > REINIT_COOLDOWN_MS
    ) {
      console.warn(
        '[fb-client] \u26A0\uFE0F  Detected OAuth 190 / expired token \u2014 re-running init() to refresh page token'
      );
      try {
        await init();
        return fbFetch(path, options, true);
      } catch (reinitErr: any) {
        throw new Error(
          `Facebook API error ${res.status}: ${body}\n[re-init also failed: ${reinitErr.message}]`
        );
      }
    }
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

// --- Marketing API (uses user token, auto-refreshes on expiry) ---

async function marketingFetch(
  path: string,
  options: RequestInit = {},
  _retry = false
): Promise<any> {
  const separator = path.includes('?') ? '&' : '?';
  let url = `${BASE_URL}${path}${separator}access_token=${encodeURIComponent(userAccessToken)}`;
  const proof = appsecretProof(userAccessToken);
  if (proof) url += `&appsecret_proof=${proof}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    if (
      !_retry &&
      isOAuthExpiredError(body, res.status) &&
      Date.now() - lastInitAt > REINIT_COOLDOWN_MS
    ) {
      console.warn(
        '[fb-client] \u26A0\uFE0F  Detected OAuth 190 / expired token on Marketing API \u2014 re-running init()'
      );
      try {
        await init();
        return marketingFetch(path, options, true);
      } catch (reinitErr: any) {
        throw new Error(
          `Facebook Marketing API error ${res.status}: ${body}\n[re-init also failed: ${reinitErr.message}]`
        );
      }
    }
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
  return pageAccessToken || userAccessToken;
}

function getUserToken(): string {
  return userAccessToken;
}

function getTokenExpiresAt(): number | null {
  return tokenExpiresAt;
}

// Deprecated backward-compat exports (kept so older imports don't break).
const PAGE_ACCESS_TOKEN = '';
const MARKETING_TOKEN = '';
const USER_TOKEN = '';

export {
  init,
  fbFetch,
  fbPost,
  fbDelete,
  marketingFetch,
  marketingPost,
  marketingDelete,
  getPageId,
  getPageToken,
  getUserToken,
  getTokenScopes,
  getTokenExpiresAt,
  PAGE_ACCESS_TOKEN,
  BASE_URL,
  MARKETING_TOKEN,
  USER_TOKEN,
  API_VERSION,
};
