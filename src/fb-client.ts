const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || '';
const API_VERSION = process.env.FB_API_VERSION || 'v25.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

async function fbFetch(path: string, options: RequestInit = {}): Promise<any> {
  const separator = path.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${path}${separator}access_token=${PAGE_ACCESS_TOKEN}`;
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

export { fbFetch, fbPost, fbDelete, PAGE_ACCESS_TOKEN, BASE_URL };
