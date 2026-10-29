/**
 * Small fetch wrapper. The API base is same origin by default (/api), which works with the
 * Vite proxy in development and the Netlify proxy in production. Set VITE_API_BASE_URL only
 * when the API must be called on another site directly.
 */
const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export class ApiError extends Error {
  status: number;
  code: string;
  fields: Record<string, string>;

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

type Body = object | FormData | undefined;

async function request<T>(method: string, path: string, body?: Body): Promise<T> {
  const headers: Record<string, string> = { 'X-Requested-With': 'lvf-web', Accept: 'application/json' };
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, { method, headers, body: payload, credentials: 'include' });
  } catch {
    throw new ApiError(0, 'network', 'We could not reach the server. Check your connection and try again.');
  }
  const isJson = res.headers.get('content-type')?.includes('application/json');
  // Anything other than JSON (for example the site's own page) means the API is not connected.
  if (!isJson && res.status !== 204) {
    throw new ApiError(503, 'api_unavailable', 'The website server is not connected yet, so this part of the site is unavailable.');
  }
  const json = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    const err = json?.error;
    // The access fee has not been paid (or has run out): send the person to the payment page.
    if (res.status === 402 && err?.code === 'payment_required' && typeof window !== 'undefined' && !/^\/(subscribe|payment)/.test(window.location.pathname)) {
      window.location.assign('/subscribe');
    }
    throw new ApiError(res.status, err?.code ?? 'error', err?.message ?? 'Something went wrong. Please try again.', err?.fields ?? {});
  }
  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: Body) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body?: Body) => request<T>('PATCH', path, body ?? {}),
  put: <T>(path: string, body?: Body) => request<T>('PUT', path, body ?? {}),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

export const apiUrl = (path: string) => `${BASE}/api${path}`;
export const assetUrl = (path: string | null | undefined) => (path && path.startsWith('/uploads/') ? `${BASE}${path}` : path ?? null);

export function qs(params: Record<string, string | number | undefined | null>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') s.set(k, String(v));
  const out = s.toString();
  return out ? `?${out}` : '';
}
