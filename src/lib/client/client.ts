import Medusa from '@medusajs/js-sdk';
import {
  emptyListFor,
  getActiveSellerId,
  rewriteVendorRoute,
} from '../mercur-compat';
export { ACTIVE_SELLER_KEY } from '../mercur-compat';

export const backendUrl = __BACKEND_URL__ ?? '/';
export const publishableApiKey = __PUBLISHABLE_API_KEY__ ?? '';

const token = window.localStorage.getItem('medusa_auth_token') || '';

const decodeJwt = (token: string) => {
  try {
    const payload = token.split('.')[1];

    return JSON.parse(atob(payload));
  } catch (err) {
    return null;
  }
};

const isTokenExpired = (token: string | null) => {
  if (!token) return true;

  const payload = decodeJwt(token);
  if (!payload?.exp) return true;

  return payload.exp * 1000 < Date.now();
};

export const sdk = new Medusa({
  baseUrl: backendUrl,
  publishableKey: publishableApiKey
});

// useful when you want to call the BE from the console and try things out quickly
if (typeof window !== 'undefined') {
  (window as any).__sdk = sdk;
}

export const importProductsQuery = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  return await fetch(`${backendUrl}/vendor/products/import`, {
    method: 'POST',
    body: formData,
    headers: {
      authorization: `Bearer ${token}`,
      'x-publishable-api-key': publishableApiKey
    }
  })
    .then(res => res.json())
    .catch(() => null);
};

export const uploadFilesQuery = async (files: any[]) => {
  const formData = new FormData();

  for (const { file } of files) {
    formData.append('files', file);
  }

  return await fetch(`${backendUrl}/vendor/uploads`, {
    method: 'POST',
    body: formData,
    headers: {
      authorization: `Bearer ${token}`,
      'x-publishable-api-key': publishableApiKey
    }
  })
    .then(res => res.json())
    .catch(() => null);
};

export const fetchQuery = async (
  url: string,
  {
    method,
    body,
    query,
    headers
  }: {
    method: 'GET' | 'POST' | 'DELETE';
    body?: object;
    query?: Record<string, string | number | object>;
    headers?: { [key: string]: string };
  }
) => {
  const bearer = (await window.localStorage.getItem('medusa_auth_token')) || '';
  const params = Object.entries(query || {}).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        // Send arrays as multiple query parameters with bracket notation
        // This allows backends to parse them as arrays: status[]=draft&status[]=published
        const arrayParams = value
          .map(item => `${encodeURIComponent(key)}[]=${encodeURIComponent(item)}`)
          .join('&');
        if (acc) {
          acc += '&' + arrayParams;
        } else {
          acc = arrayParams;
        }
      } else {
        const separator = acc ? '&' : '';
        const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
        acc += `${separator}${encodeURIComponent(key)}=${encodeURIComponent(serializedValue)}`;
      }
    }
    return acc;
  }, '');
  const activeSellerId = getActiveSellerId();
  const rewrittenUrl = rewriteVendorRoute(url);
  const response = await fetch(`${backendUrl}${rewrittenUrl}${params && `?${params}`}`, {
    method: method,
    headers: {
      authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json',
      'x-publishable-api-key': publishableApiKey,
      // WRDO: required by ensureSellerMiddleware on /vendor/* routes
      ...(activeSellerId ? { 'x-seller-id': activeSellerId } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : null
  });

  if (!response.ok) {
    // WRDO: error bodies aren't always JSON. A 404 from a route this Mercur
    // backend doesn't serve returns an HTML error page; calling .json() on it
    // throws "Unexpected token '<'", which escapes uncaught and crashes the
    // whole React tree (the dashboard error boundary). Parse defensively so a
    // single dead widget degrades to an empty card instead of a page crash.
    let errorData: { message?: string } = {};
    const raw = await response.text();
    try {
      errorData = raw ? JSON.parse(raw) : {};
    } catch {
      errorData = { message: `${response.status} ${response.statusText}` };
    }

    if (response.status === 401) {
      if (isTokenExpired(token)) {
        localStorage.removeItem('medusa_auth_token');
        window.location.href = '/login?reason=Unauthorized';
        return;
      }

      throw {
        type: 'NO_PERMISSION',
        message: errorData.message || 'Unauthorized'
      };
    }

    // WRDO: a 404 on a GET means this Mercur backend doesn't serve the route the
    // panel asked for (version drift — e.g. /vendor/me, /vendor/sellers/me/reviews,
    // /vendor/notifications). For a read, degrade to an empty list-shaped result so
    // the widget renders blank instead of throwing into React Router and crashing.
    // List consumers (InfiniteList) flatMap over response[<key>] and read
    // count/offset/limit — Medusa convention is the last path segment IS the key
    // (/vendor/notifications -> "notifications"), so seed that key with []. Only
    // GET + 404 is swallowed; mutations and real errors (5xx, 400, 403) still throw.
    if (response.status === 404 && method === 'GET') {
      // Use the ORIGINAL url for the response key (matches what the caller expects).
      return emptyListFor(url);
    }

    const error = new Error(errorData.message || 'Server error');
    (error as Error & { status: number }).status = response.status;
    throw error;
  }

  return response.json();
};
